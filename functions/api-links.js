// functions/api/links/index.js

import {
  getKV,
  validateSession,
  checkRateLimit,
  jsonResponse
} from './lib/security.js';

async function isAuthorized(request, env, DB) {
  const adminPath = env.ADMIN_PATH;
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return false;
  }

  if (!env.PASSWORD) return true;

  return await validateSession(request, DB);
}

export async function onRequest({ request, env = {} }) {
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    return jsonResponse({ error: 'Service unavailable' }, 503);
  }

  // 速率限制：每分钟最多10次查询请求
  const rateLimit = await checkRateLimit(request, DB, 'links', 10, 60);
  if (!rateLimit.allowed) {
    return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  if (!(await isAuthorized(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

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
        if (key.startsWith('hash:') ||
            key.startsWith('session:') ||
            key.startsWith('ratelimit:') ||
            key.startsWith('log:') ||
            key.startsWith('csrf:') ||
            key === 'visitCount' ||
            key === adminPath) {
          return null;
        }

        const value = await DB.get(key);
        if (value) {
          try {
            const data = JSON.parse(value);
            if (data.original) {
              return {
                slug: key,
                original: data.original,
                visits: data.visits || 0,
                createdAt: data.createdAt || 0
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
