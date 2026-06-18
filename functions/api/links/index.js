// functions/api/links/index.js

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;

  const cookies = cookieString.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value || '');
  }
  return null;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getKV(env) {
  if (env && env.my_kv) return env.my_kv;
  if (typeof my_kv !== 'undefined') return my_kv;
  return null;
}

async function isAuthorized(request, env) {
  const adminPath = env.ADMIN_PATH;
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return false;
  }

  if (!env.PASSWORD) return true;

  const sessionHash = getCookie(request, 'auth_session');
  const validHash = await sha256(env.PASSWORD);
  return sessionHash === validHash;
}

export async function onRequest({ request, env }) {
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!(await isAuthorized(request, env))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding error' }, 500);

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
        if (key.startsWith('hash:') || key === 'visitCount' || key === adminPath) {
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
