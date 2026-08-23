// functions/api/links/index.js

import { getCookie, jsonResponse, getKV } from '../../utils.js';

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
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await isAuthorized(request, env, DB))) {
    return new Response('Unauthorized', { status: 401 });
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
        if (key.startsWith('hash:') || key.startsWith('sess:') || key.startsWith('rl:') || key === 'visitCount' || key === adminPath) {
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
