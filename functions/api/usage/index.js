// functions/api/usage/index.js
// 存储用量精确统计：list 全量分页枚举键 → 按前缀分类计数 → 短链键并发读值
// （判断活跃 / 回收站，累加键+值字节）；结果缓存到 cfg:usage。
// GET 返回上次统计结果（从未统计时 scannedAt=0）；POST 执行新一轮全量扫描并覆盖缓存。
// 说明：EdgeOne 控制台口径的命名空间真实用量（含平台元数据 / 复制开销）没有开放给
// 边缘函数的计量 API，本端点统计的是「本服务写入 KV 的数据」，供设置页展示。

import { jsonResponse, getKV, checkAdmin } from '../../utils.js';

const USAGE_KEY = 'cfg:usage';
const MAX_KEYS = 20000;      // 扫描键数上限，超过则标记 partial（部分统计）
const GET_CONCURRENCY = 50;  // 短链值并发读取批量（KV 读是廉价操作，50 并发毫秒级完成一批）

// UTF-8 字节长度（TextEncoder 复用一个实例，避免每键新建）
const encoder = new TextEncoder();
function utf8len(str) {
  return encoder.encode(str).length;
}

// 全量扫描统计。maxKeys 仅供测试注入小上限验证 partial 语义。
export async function runUsageScan(DB, opts = {}) {
  const maxKeys = Number(opts.maxKeys) || MAX_KEYS;
  const adminPath = opts.adminPath;
  const started = Date.now();

  // 1) list 全量分页，按前缀分类（与 /api/stats 的内部键口径一致）
  const sys = { cfg: 0, hash: 0, sess: 0, rate: 0, dc: 0, legacy: 0 };
  const linkKeys = [];
  let total = 0;
  let partial = false;
  let complete = false;
  let cursor;
  do {
    let result = null;
    try {
      result = await DB.list(cursor ? { cursor } : {});
    } catch (e) {
      result = null;
    }
    if (!result) throw new Error('KV list failed');
    for (const item of (result.keys || [])) {
      // 兼容不同实现的字段名（key / name）
      const key = item && (item.key || item.name);
      if (!key) continue;
      total++;
      if ((adminPath && key === adminPath) || key === 'visitCount') sys.legacy++;
      else if (key.startsWith('cfg:')) sys.cfg++;
      else if (key.startsWith('hash:')) sys.hash++;
      else if (key.startsWith('sess:')) sys.sess++;
      else if (key.startsWith('rl:') || key.startsWith('crl:')) sys.rate++;
      else if (key.startsWith('dc:')) sys.dc++;
      else linkKeys.push(key);
      // 页内即时截断（放在分类之后、循环体末尾：任何类型的键都计入且必达）
      if (total >= maxKeys) { partial = true; break; }
    }
    if (partial) break;
    complete = !!result.complete;
    cursor = result.cursor;
  } while (!complete);

  // 2) 短链键分批并发读值：判断活跃/回收站，累加键+值字节
  let active = 0, trash = 0, bad = 0, linkBytes = 0;
  for (let i = 0; i < linkKeys.length; i += GET_CONCURRENCY) {
    const batch = linkKeys.slice(i, i + GET_CONCURRENCY);
    const values = await Promise.all(batch.map(k => DB.get(k).catch(() => null)));
    for (let j = 0; j < batch.length; j++) {
      const raw = values[j];
      if (raw == null) { bad++; continue; } // 读取失败或扫描间隙被删除
      linkBytes += utf8len(batch[j]) + utf8len(raw);
      try {
        const data = JSON.parse(raw);
        if (data && data.deletedAt) trash++;
        else active++;
      } catch (e) {
        bad++; // 值不是短链 JSON（外部写入的键）
      }
    }
  }

  const system = sys.cfg + sys.hash + sys.sess + sys.rate + sys.dc + sys.legacy;
  return {
    scannedAt: Date.now(),
    durationMs: Date.now() - started,
    partial,
    totalKeys: total,
    activeLinks: active,
    trashLinks: trash,
    badKeys: bad,
    linkBytes,
    systemKeys: system,
    systemBreakdown: sys
  };
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await checkAdmin(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // GET：读缓存（未统计过时返回 scannedAt=0，前端引导手动触发）
  if (request.method === 'GET') {
    const raw = await DB.get(USAGE_KEY).catch(() => null);
    if (!raw) return jsonResponse({ scannedAt: 0 });
    try {
      return jsonResponse(JSON.parse(raw));
    } catch (e) {
      return jsonResponse({ scannedAt: 0 });
    }
  }

  // POST：全量扫描并覆盖缓存
  try {
    const usage = await runUsageScan(DB, { adminPath: env.ADMIN_PATH });
    await DB.put(USAGE_KEY, JSON.stringify(usage)).catch(() => {});
    return jsonResponse(usage);
  } catch (err) {
    return jsonResponse({ error: '存储用量统计失败：' + ((err && err.message) || '未知错误') }, 500);
  }
}
