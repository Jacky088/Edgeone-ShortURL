// functions/api/links/index.js
// 获取短链列表：默认返回全部有效短链；?trash=1 返回回收站（软删除）的短链。
// 默认返回列表瘦身字段（slug/original/visits/createdAt/note/expiresAt/maxVisits/hasPassword/deletedAt）；
// 传入 ?detail=1 时才附带聚合统计（daily/ref/dev，供导出使用），避免大列表 payload 膨胀。
// ?slug=xxx 精确查询单条（含聚合统计，供访问详情弹窗按需拉取）。
// 超过 2000 条时返回 { links, truncated: true } 并由前端提示（不再静默截断）。

import { jsonResponse, getKV, checkAdmin } from '../../utils.js';

// 内部键：不以短链数据存储，列表时跳过
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
    return new Response('Unauthorized', { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const trashOnly = params.get('trash') === '1';
  const wantDetail = params.get('detail') === '1';
  // 详情场景：按 slug 精确查询单条（含聚合统计），供访问详情弹窗按需拉取
  const detailSlug = params.get('slug') || '';
  if (detailSlug) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(detailSlug)) return jsonResponse({ error: 'Invalid slug' }, 400);
    const raw = await DB.get(detailSlug).catch(() => null);
    if (!raw) return jsonResponse({ error: '短链不存在' }, 404);
    try {
      const data = JSON.parse(raw);
      if (!data.original) return jsonResponse({ error: '数据异常' }, 500);
      return jsonResponse({
        slug: detailSlug,
        original: data.original,
        visits: data.visits || 0,
        createdAt: data.createdAt || 0,
        note: data.note || '',
        expiresAt: data.expiresAt || 0,
        maxVisits: data.maxVisits || 0,
        hasPassword: !!data.pwdHash,
        deletedAt: data.deletedAt || 0,
        daily: data.daily || {},
        ref: data.ref || {},
        dev: data.dev || { m: 0, d: 0 }
      });
    } catch (e) {
      return jsonResponse({ error: '数据损坏' }, 500);
    }
  }
  // 分页参数（供外部调用按页拉取；管理后台默认拉全量）：?limit=N（最大 500/页）+ ?cursor=…
  const pageParam = params.get('limit');
  const pageLimit = pageParam == null ? 0 : Math.min(500, Math.max(1, Number(pageParam) || 0));
  const pageCursor = params.get('cursor') || undefined;

  // 单页模式：只取一页 key，用于外部脚本分页遍历
  if (pageLimit > 0) {
    const listOptions = { limit: pageLimit };
    if (pageCursor) listOptions.cursor = pageCursor;
    const result = await DB.list(listOptions).catch(() => null);
    if (!result) return jsonResponse({ error: 'Failed to fetch links' }, 500);
    const items = [];
    for (const { key } of result.keys || []) {
      if (isInternalKey(key, adminPath)) continue;
      const value = await DB.get(key).catch(() => null);
      if (!value) continue;
      try {
        const data = JSON.parse(value);
        if (!data.original) continue;
        if (trashOnly !== !!data.deletedAt) continue;
        const item = {
          slug: key,
          original: data.original,
          visits: data.visits || 0,
          createdAt: data.createdAt || 0,
          note: data.note || '',
          expiresAt: data.expiresAt || 0,
          maxVisits: data.maxVisits || 0,
          hasPassword: !!data.pwdHash,
          deletedAt: data.deletedAt || 0
        };
        if (wantDetail) {
          item.daily = data.daily || {};
          item.ref = data.ref || {};
          item.dev = data.dev || { m: 0, d: 0 };
        }
        items.push(item);
      } catch (e) {}
    }
    return jsonResponse({ links: items, cursor: result.cursor || null, complete: !!result.complete });
  }

  try {
    // 全量模式（管理后台）：分页拉取全部 key（每轮 500 个，避免单次 list 过大）；超 MAX_KEYS 上限时报告截断
    let allKeys = [];
    let cursor = undefined;
    let complete = false;
    const MAX_KEYS = 2000;
    let truncated = false;

    do {
      const result = await DB.list(cursor ? { cursor, limit: 500 } : { limit: 500 });

      if (result.keys) {
        allKeys = allKeys.concat(result.keys);
      }

      cursor = result.cursor;
      complete = result.complete;
      if (allKeys.length >= MAX_KEYS) { truncated = !complete; break; }
    } while (!complete);

    const links = await Promise.all(
      allKeys.map(async ({ key }) => {
        if (isInternalKey(key, adminPath)) {
          return null;
        }

        const value = await DB.get(key);
        if (value) {
          try {
            const data = JSON.parse(value);
            if (data.original) {
              // 回收站模式只返回软删除记录；默认模式排除它们
              if (trashOnly !== !!data.deletedAt) return null;
              const item = {
                slug: key,
                original: data.original,
                visits: data.visits || 0,
                createdAt: data.createdAt || 0,
                note: data.note || '',
                expiresAt: data.expiresAt || 0,
                maxVisits: data.maxVisits || 0,
                hasPassword: !!data.pwdHash,
                deletedAt: data.deletedAt || 0
              };
              // 聚合统计仅按需返回（详情弹窗/导出），默认列表不再携带 daily/ref/dev/ipd
              if (wantDetail) {
                item.daily = data.daily || {};
                item.ref = data.ref || {};
                item.dev = data.dev || { m: 0, d: 0 };
              }
              return item;
            }
          } catch (e) {
            return null;
          }
        }
        return null;
      })
    );

    const list = links.filter(Boolean);
    // 兼容旧前端：未截断时直接返回数组；截断时返回 { links, truncated } 并由前端提示
    if (truncated) {
      return jsonResponse({ links: list, truncated: true });
    }
    return jsonResponse(list);
  } catch (err) {
    return jsonResponse({ error: 'Failed to fetch links' }, 500);
  }
}
