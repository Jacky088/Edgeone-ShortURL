// functions/api/delete/index.js
// 删除短链：默认软删除（进入回收站，可恢复）；purge=true 彻底删除。
// 软删除会同步移除指向该 slug 的 URL 去重映射，使相同长链接可重新创建新短链。
// 支持批量：body.slugs 为数组时逐条处理（≤100 条），单条 body.slug 行为保持不变。

import { sha256, jsonResponse, getKV, isValidSlug, isReservedSlug, getSettings, checkAdmin, USAGE_KEY } from '../../utils.js';

// 单条删除核心：返回 { status, body }，单条与批量路径共用，保证响应形态一致
async function deleteOne(DB, slug, purge, env, settings) {
  if (!isValidSlug(slug) || isReservedSlug(slug, env.ADMIN_PATH, settings.extraReserved)) {
    return { status: 400, body: { error: 'Invalid slug' } };
  }

  try {
    const linkDataStr = await DB.get(slug);
    if (!linkDataStr) {
      return { status: 404, body: { error: '短链不存在' } };
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
      return { status: 200, body: { success: true, slug, purged: true } };
    }

    // 删除（软/硬）都移除指向该 slug 的去重映射，避免误删同 URL 其他短链共用的映射
    const urlHash = await sha256(linkData.original);
    const hashKey = `hash:${urlHash}`;
    const mappedSlug = await DB.get(hashKey).catch(() => null);

    if (purge) {
      const ops = [DB.delete(slug)];
      if (!mappedSlug || mappedSlug === slug) ops.push(DB.delete(hashKey));
      await Promise.all(ops);
      return { status: 200, body: { success: true, slug, purged: true } };
    }

    if (linkData.deletedAt) {
      return { status: 200, body: { success: true, slug, alreadyDeleted: true } };
    }

    linkData.deletedAt = Date.now();
    const ops = [DB.put(slug, JSON.stringify(linkData))];
    if (!mappedSlug || mappedSlug === slug) ops.push(DB.delete(hashKey));
    await Promise.all(ops);

    return { status: 200, body: { success: true, slug } };
  } catch (err) {
    return { status: 500, body: { error: 'Failed to delete link' } };
  }
}

// 批量结果条目：成功展开 success/purged 等字段，失败统一为 { slug, error }
function toResult(body) {
  if (body && body.success) {
    const r = { slug: body.slug, success: true };
    if (body.purged) r.purged = true;
    if (body.alreadyDeleted) r.alreadyDeleted = true;
    return r;
  }
  return { slug: body && body.slug, error: (body && body.error) || 'Failed to delete link' };
}

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

  const purge = body.purge === true;

  // 批量路径：{ slugs: [...], purge }，逐条尽力执行，单条失败不影响其余
  if (Array.isArray(body.slugs)) {
    const slugs = [...new Set(body.slugs.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean))];
    if (!slugs.length) return jsonResponse({ error: 'Slugs is required' }, 400);
    if (slugs.length > 100) return jsonResponse({ error: '单次最多批量处理 100 条' }, 400);

    const settings = await getSettings(DB);
    const results = [];
    for (const slug of slugs) {
      const r = await deleteOne(DB, slug, purge, env, settings);
      const item = toResult(r.body);
      item.slug = slug;
      results.push(item);
    }
    const ok = results.filter(r => r.success).length;
    if (ok > 0)   // 数据已变更：失效存储用量缓存（设置页打开时检测到无缓存会自动补扫）
  await DB.delete(USAGE_KEY).catch(() => {});
    return jsonResponse({ success: true, batch: true, results, ok, total: slugs.length });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  if (!slug) {
    return jsonResponse({ error: 'Slug is required' }, 400);
  }

  // 自定义保留字同样生效（与创建路径一致，需先读运行时设置）
  const settings = await getSettings(DB);
  const r = await deleteOne(DB, slug, purge, env, settings);
  if (r.status === 200)   // 数据已变更：失效存储用量缓存（设置页打开时检测到无缓存会自动补扫）
  await DB.delete(USAGE_KEY).catch(() => {});
  return jsonResponse(r.body, r.status);
}
