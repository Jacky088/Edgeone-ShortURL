// functions/api/delete/index.js
// 删除短链：默认软删除（进入回收站，可恢复）；purge=true 彻底删除。
// 软删除会同步移除指向该 slug 的 URL 去重映射，使相同长链接可重新创建新短链。

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
  const purge = body.purge === true;

  if (!slug) {
    return jsonResponse({ error: 'Slug is required' }, 400);
  }

  if (!isValidSlug(slug) || isReservedSlug(slug, env.ADMIN_PATH)) {
    return jsonResponse({ error: 'Invalid slug' }, 400);
  }

  try {
    const linkDataStr = await DB.get(slug);
    if (!linkDataStr) {
      return jsonResponse({ error: '短链不存在' }, 404);
    }

    let linkData;
    try {
      linkData = JSON.parse(linkDataStr);
    } catch (parseErr) {
      linkData = null;
    }

    if (!linkData || !linkData.original) {
      // 非短链数据（异常键）：直接清除
      await DB.delete(slug);
      return jsonResponse({ success: true, slug, purged: true });
    }

    // 删除（软/硬）都移除指向该 slug 的去重映射，避免误删同 URL 其他短链共用的映射
    const urlHash = await sha256(linkData.original);
    const hashKey = `hash:${urlHash}`;
    const mappedSlug = await DB.get(hashKey).catch(() => null);

    if (purge) {
      const ops = [DB.delete(slug)];
      if (!mappedSlug || mappedSlug === slug) ops.push(DB.delete(hashKey));
      await Promise.all(ops);
      return jsonResponse({ success: true, slug, purged: true });
    }

    if (linkData.deletedAt) {
      return jsonResponse({ success: true, slug, alreadyDeleted: true });
    }

    linkData.deletedAt = Date.now();
    const ops = [DB.put(slug, JSON.stringify(linkData))];
    if (!mappedSlug || mappedSlug === slug) ops.push(DB.delete(hashKey));
    await Promise.all(ops);

    return jsonResponse({ success: true, slug });
  } catch (err) {
    return jsonResponse({ error: 'Failed to delete link' }, 500);
  }
}
