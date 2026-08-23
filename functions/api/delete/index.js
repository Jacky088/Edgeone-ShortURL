// functions/api/delete/index.js

import { sha256, getCookie, jsonResponse, getKV, isValidSlug, isReservedSlug } from '../../utils.js';

async function isAuthorized(request, env, DB) {
  const adminPath = env.ADMIN_PATH;
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return false;
  }

  if (!env.PASSWORD) return true;

  const token = getCookie(request, 'auth_session');
  if (!token || !/^[a-f0-9]{16,128}$/.test(token) || !DB) return false;
  try {
    const raw = await DB.get(`sess:${token}`);
    if (!raw) return false;
    const session = JSON.parse(raw);
    return typeof session.exp === 'number' && Date.now() < session.exp;
  } catch (e) {
    return false;
  }
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await isAuthorized(request, env, DB))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  if (!slug) {
    return jsonResponse({ error: 'Slug is required' }, 400);
  }

  if (!isValidSlug(slug) || isReservedSlug(slug, env.ADMIN_PATH)) {
    return jsonResponse({ error: 'Invalid slug' }, 400);
  }

  try {
    const linkDataStr = await DB.get(slug);
    if (linkDataStr) {
      try {
        const linkData = JSON.parse(linkDataStr);
        if (linkData.original) {
          // 只有当 hash 映射确实指向当前 slug 时才删除，
          // 避免误删同 URL 其他短链接共用的去重映射
          const urlHash = await sha256(linkData.original);
          const hashKey = `hash:${urlHash}`;
          const mappedSlug = await DB.get(hashKey).catch(() => null);
          const ops = [DB.delete(slug)];
          if (!mappedSlug || mappedSlug === slug) {
            ops.push(DB.delete(hashKey));
          }
          await Promise.all(ops);
        } else {
          await DB.delete(slug);
        }
      } catch (parseErr) {
        await DB.delete(slug);
      }
    }

    return jsonResponse({ success: true, slug });
  } catch (err) {
    return jsonResponse({ error: 'Failed to delete link' }, 500);
  }
}
