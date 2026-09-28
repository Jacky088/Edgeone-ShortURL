// functions/api/stats/index.js
// 全站统计聚合：近 N 天（默认 14，最大 30）访问趋势 + 准确的总访问 / 短链数 / 最近创建。
// 列表接口默认不携带逐日数据（瘦身字段），趋势图由本端点按需全量扫描聚合，供统计视图懒加载。
// 只聚合有效短链（排除回收站），与列表 / 统计卡口径一致；扫描上限与 /api/links 相同（2000 条）。

import { jsonResponse, getKV, checkAdmin } from '../../utils.js';

// 内部键：与 /api/links 相同的跳过规则
function isInternalKey(key, adminPath) {
  return key.startsWith('hash:') || key.startsWith('sess:') || key.startsWith('rl:')
    || key.startsWith('crl:') || key.startsWith('cfg:') || key.startsWith('dc:')
    || key === 'visitCount' || key === adminPath;
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const adminPath = env.ADMIN_PATH;
  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await checkAdmin(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const params = new URL(request.url).searchParams;
  let days = Number(params.get('days')) || 14;
  days = Math.min(30, Math.max(1, days));

  try {
    // 全量扫描：与 /api/links 相同的 cursor 翻页与 2000 上限语义（list 只接受 cursor）
    let allKeys = [];
    let cursor = undefined;
    let complete = false;
    const MAX_KEYS = 2000;
    let truncated = false;
    do {
      let result = null;
      try {
        result = await DB.list(cursor ? { cursor } : {});
      } catch (e) {
        result = await DB.list(cursor ? { cursor } : {}).catch(() => null);
      }
      if (!result) throw new Error('list failed');
      if (result.keys) allKeys = allKeys.concat(result.keys);
      cursor = result.cursor;
      complete = result.complete;
      if (allKeys.length >= MAX_KEYS) { truncated = !complete; break; }
    } while (!complete);

    // 逐日键与 trackVisit 落库口径一致（UTC 日期键）
    const dayKeys = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    const daily = {};
    for (const k of dayKeys) daily[k] = 0;

    let totalVisits = 0;
    let linkCount = 0;
    let latestCreatedAt = 0;

    await Promise.all(allKeys.map(async ({ key }) => {
      if (isInternalKey(key, adminPath)) return;
      const value = await DB.get(key).catch(() => null);
      if (!value) return;
      try {
        const data = JSON.parse(value);
        if (!data.original || data.deletedAt) return;
        linkCount += 1;
        totalVisits += data.visits || 0;
        if (data.createdAt && data.createdAt > latestCreatedAt) latestCreatedAt = data.createdAt;
        const d = data.daily || {};
        for (const k of dayKeys) daily[k] += d[k] || 0;
      } catch (e) {}
    }));

    return jsonResponse({
      windowDays: days,
      daily,
      totalVisits,
      linkCount,
      latestCreatedAt,
      truncated
    });
  } catch (err) {
    return jsonResponse({ error: 'Failed to aggregate stats' }, 500);
  }
}
