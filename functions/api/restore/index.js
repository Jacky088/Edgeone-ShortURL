// functions/api/restore/index.js
// 从回收站恢复短链：移除 deletedAt 标记；若开启 URL 去重且映射空闲，则恢复去重映射。
// 支持批量：body.slugs 为数组时逐条恢复（≤100 条），单条 body.slug 行为保持不变。

import { sha256, jsonResponse, getKV, isValidSlug, isReservedSlug, getSettings, checkAdmin, USAGE_KEY } from '../../utils.js';

// 单条恢复核心：返回 { status, body }，单条与批量路径共用，保证响应形态一致
async function restoreOne(DB, slug, env, settings) {
  if (!slug || !isValidSlug(slug) || isReservedSlug(slug, env.ADMIN_PATH, settings.extraReserved)) {
    return { status: 400, body: { error: 'Invalid slug' } };
  }

  try {
    const raw = await DB.get(slug);
    if (!raw) return { status: 404, body: { error: '短链不存在' } };

    let linkData;
    try {
      linkData = JSON.parse(raw);
    } catch (e) {
      return { status: 500, body: { error: '数据损坏，无法恢复' } };
    }
    if (!linkData.original) return { status: 500, body: { error: '数据异常，无法恢复' } };
    if (!linkData.deletedAt) return { status: 200, body: { success: true, slug, alreadyActive: true } };

    delete linkData.deletedAt;
    await DB.put(slug, JSON.stringify(linkData));

    // 恢复去重映射：仅当映射空闲（不存在或指向已删除记录）时回填
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

    return { status: 200, body: { success: true, slug } };
  } catch (err) {
    return { status: 500, body: { error: 'Failed to restore link' } };
  }
}

// 批量结果条目：成功展开 success/alreadyActive 字段，失败统一为 { slug, error }
function toResult(body) {
  if (body && body.success) {
    const r = { slug: body.slug, success: true };
    if (body.alreadyActive) r.alreadyActive = true;
    return r;
  }
  return { slug: body && body.slug, error: (body && body.error) || 'Failed to restore link' };
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

  // 批量路径：{ slugs: [...] }，逐条尽力恢复，单条失败不影响其余
  if (Array.isArray(body.slugs)) {
    const slugs = [...new Set(body.slugs.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean))];
    if (!slugs.length) return jsonResponse({ error: 'Slugs is required' }, 400);
    if (slugs.length > 100) return jsonResponse({ error: '单次最多批量处理 100 条' }, 400);

    const settings = await getSettings(DB);
    const results = [];
    for (const slug of slugs) {
      const r = await restoreOne(DB, slug, env, settings);
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
  // 自定义保留字同样生效（与创建路径一致，需先读运行时设置）
  const settings = await getSettings(DB);
  const r = await restoreOne(DB, slug, env, settings);
  if (r.status === 200)   // 数据已变更：失效存储用量缓存（设置页打开时检测到无缓存会自动补扫）
  await DB.delete(USAGE_KEY).catch(() => {});
  return jsonResponse(r.body, r.status);
}
