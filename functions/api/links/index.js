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

function isKVBinding(value) {
  if (!value || typeof value !== 'object') return false;
  // EdgeOne KV binding may expose get/put as functions or via proxy
  if (typeof value.get === 'function' && typeof value.put === 'function') return true;
  // Some runtimes expose KV as a plain object with string keys
  if ('get' in value && 'put' in value) return true;
  return false;
}

function getKV(env) {
  // Priority 1: Check known binding names
  if (env && env.my_kv != null && typeof env.my_kv === 'object') return env.my_kv;
  if (env && env.MY_KV != null && typeof env.MY_KV === 'object') return env.MY_KV;

  // Priority 2: Scan all env values for KV-like objects
  if (env && typeof env === 'object') {
    for (const [key, value] of Object.entries(env)) {
      if (key === 'ADMIN_PATH' || key === 'PASSWORD') continue;
      if (value && typeof value === 'object' && typeof value.get === 'function') {
        return value;
      }
    }
  }

  // Priority 3: Check global scope
  if (typeof globalThis.my_kv !== 'undefined' && globalThis.my_kv !== null && typeof globalThis.my_kv === 'object') return globalThis.my_kv;
  if (typeof globalThis.MY_KV !== 'undefined' && globalThis.MY_KV !== null && typeof globalThis.MY_KV === 'object') return globalThis.MY_KV;

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

export async function onRequest({ request, env = {} }) {
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!(await isAuthorized(request, env))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

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
