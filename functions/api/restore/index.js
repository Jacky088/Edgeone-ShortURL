// functions/api/restore/index.js
// 从回收站恢复短链：移除 deletedAt 标记；若开启 URL 去重且映射空闲，则恢复去重映射。

import { sha256, jsonResponse, getKV, isValidSlug, isReservedSlug, getSettings, checkAdmin } from '../../utils.js';

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await checkAdmin(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug || !isValidSlug(slug) || isReservedSlug(slug, env.ADMIN_PATH)) {
    return jsonResponse({ error: 'Invalid slug' }, 400);
  }

  try {
    const raw = await DB.get(slug);
    if (!raw) return jsonResponse({ error: '短链不存在' }, 404);

    let linkData;
    try {
      linkData = JSON.parse(raw);
    } catch (e) {
      return jsonResponse({ error: '数据损坏，无法恢复' }, 500);
    }
    if (!linkData.original) return jsonResponse({ error: '数据异常，无法恢复' }, 500);
    if (!linkData.deletedAt) return jsonResponse({ success: true, slug, alreadyActive: true });

    delete linkData.deletedAt;
    await DB.put(slug, JSON.stringify(linkData));

    // 恢复去重映射：仅当映射空闲（不存在或指向已删除记录）时回填
    const settings = await getSettings(DB);
    if (settings.dedupHash) {
      const hashKey = `hash:${await sha256(linkData.original)}`;
      const mappedSlug = await DB.get(hashKey).catch(() => null);
      if (!mappedSlug) {
        await DB.put(hashKey, slug).catch(() => {});
      } else if (mappedSlug !== slug) {
        const mappedRaw = await DB.get(mappedSlug).catch(() => null);
        try {
          if (mappedRaw && JSON.parse(mappedRaw).deletedAt) {
            await DB.put(hashKey, slug).catch(() => {});
          }
        } catch (e) {}
      }
    }

    return jsonResponse({ success: true, slug });
  } catch (err) {
    return jsonResponse({ error: 'Failed to restore link' }, 500);
  }
}
