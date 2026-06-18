// functions/api/delete/index.js

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
  if (env && env.MY_KV) return env.MY_KV;
  return null;
}

function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(slug);
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
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!(await isAuthorized(request, env))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding MY_KV/my_kv not found' }, 500);

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

  if (!isValidSlug(slug) || slug === 'api' || slug === 'favicon.ico' || slug.startsWith('hash:')) {
    return jsonResponse({ error: 'Invalid slug' }, 400);
  }

  try {
    const linkDataStr = await DB.get(slug);
    if (linkDataStr) {
      try {
        const linkData = JSON.parse(linkDataStr);
        if (linkData.original) {
          const urlHash = await sha256(linkData.original);
          await Promise.all([
            DB.delete(slug),
            DB.delete(`hash:${urlHash}`)
          ]);
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
