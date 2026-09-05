// functions/api/update/index.js
// 编辑短链：目标链接、备注、有效期、次数上限、访问密码。
// 目标链接变更时同步维护 URL 去重映射（移除旧映射，空闲时回填新映射）。

import { sha256, jsonResponse, getKV, isAllowedUrl, isValidSlug, isReservedSlug, getSettings, isHostAllowed, checkAdmin } from '../../utils.js';

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

  const raw = await DB.get(slug);
  if (!raw) return jsonResponse({ error: '短链不存在' }, 404);

  let linkData;
  try {
    linkData = JSON.parse(raw);
  } catch (e) {
    return jsonResponse({ error: '数据损坏，无法编辑' }, 500);
  }
  if (!linkData.original) return jsonResponse({ error: '数据异常，无法编辑' }, 500);

  const settings = await getSettings(DB);

  // 目标链接
  if (body.original !== undefined) {
    const original = String(body.original || '').trim();
    if (!isAllowedUrl(original)) return jsonResponse({ error: '目标链接格式不正确' }, 400);
    if (!isHostAllowed(original, settings.domainWhitelist)) {
      return jsonResponse({ error: `目标域名不在白名单内：${new URL(original).hostname}` }, 403);
    }
    if (original !== linkData.original) {
      const oldHashKey = `hash:${await sha256(linkData.original)}`;
      const mapped = await DB.get(oldHashKey).catch(() => null);
      if (mapped === slug) await DB.delete(oldHashKey).catch(() => {});
      linkData.original = original;
      if (settings.dedupHash) {
        const newHashKey = `hash:${await sha256(original)}`;
        const newMapped = await DB.get(newHashKey).catch(() => null);
        if (!newMapped) await DB.put(newHashKey, slug).catch(() => {});
      }
    }
  }

  // 备注（空字符串 = 清除）
  if (body.note !== undefined) {
    const note = String(body.note || '').trim().slice(0, 100);
    if (note) linkData.note = note; else delete linkData.note;
  }

  // 有效期（null = 永久；ttlDays 优先于 expiresAt 时间戳）
  if (body.expiresAt !== undefined || body.ttlDays !== undefined) {
    if (body.ttlDays !== undefined && body.ttlDays !== null && body.ttlDays !== 0) {
      const days = Number(body.ttlDays);
      if (!Number.isFinite(days) || days < 1 || days > 3650) {
        return jsonResponse({ error: '有效期不合法（1-3650 天）' }, 400);
      }
      linkData.expiresAt = Date.now() + Math.round(days) * 86400000;
    } else if (body.expiresAt === null || body.expiresAt === '' || body.expiresAt === 0) {
      delete linkData.expiresAt;
    } else {
      const ts = Number(body.expiresAt);
      if (!Number.isFinite(ts) || ts < Date.now()) {
        return jsonResponse({ error: '有效期必须是将来的时间' }, 400);
      }
      linkData.expiresAt = Math.round(ts);
    }
  }

  // 次数上限（null = 不限）
  if (body.maxVisits !== undefined) {
    if (body.maxVisits === null || body.maxVisits === '' || body.maxVisits === 0) {
      delete linkData.maxVisits;
    } else {
      const n = Number(body.maxVisits);
      if (!Number.isInteger(n) || n < 1 || n > 1000000000) {
        return jsonResponse({ error: '次数上限不合法' }, 400);
      }
      linkData.maxVisits = n;
    }
  }

  // 访问密码（password 设置新密码；clearPassword = 清除）
  if (body.password) {
    const pwd = String(body.password);
    if (pwd.length < 4 || pwd.length > 64) {
      return jsonResponse({ error: '访问密码长度需在 4-64 位之间' }, 400);
    }
    linkData.pwdHash = await sha256(pwd);
  }
  if (body.clearPassword === true) {
    delete linkData.pwdHash;
  }

  await DB.put(slug, JSON.stringify(linkData));

  const { pwdHash, ...rest } = linkData;
  return jsonResponse({ slug, ...rest, hasPassword: !!pwdHash });
}
