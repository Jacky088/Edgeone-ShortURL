// functions/api/links/index.js
// 获取短链列表：默认返回全部有效短链；?trash=1 返回回收站（软删除）的短链。
// 返回字段包含创建选项与聚合统计（note / expiresAt / maxVisits / hasPassword / daily / ref / dev），
// 供管理后台列表、详情弹窗与导出使用。

import { jsonResponse, getKV, checkAdmin } from '../../utils.js';

// 内部键：不以短链数据存储，列表时跳过
function isInternalKey(key, adminPath) {
  return key.startsWith('hash:') || key.startsWith('sess:') || key.startsWith('rl:')
    || key.startsWith('cfg:') || key.startsWith('dc:') || key === 'visitCount' || key === adminPath;
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

  const trashOnly = new URL(request.url).searchParams.get('trash') === '1';

  try {
    let allKeys = [];
    let cursor = undefined;
    let complete = false;
    const MAX_KEYS = 2000;

    do {
      const listOptions = cursor ? { cursor } : {};
      const result = await DB.list(listOptions);

      if (result.keys) {
        allKeys = allKeys.concat(result.keys);
      }

      cursor = result.cursor;
      complete = result.complete;
      if (allKeys.length >= MAX_KEYS) break;
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
              return {
                slug: key,
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
              };
            }
          } catch (e) {
            return null;
          }
        }
        return null;
      })
    );

    return jsonResponse(links.filter(Boolean));
  } catch (err) {
    return jsonResponse({ error: 'Failed to fetch links' }, 500);
  }
}
