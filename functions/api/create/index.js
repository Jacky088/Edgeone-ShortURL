// functions/api/create/index.js

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

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(slug);
}

function isReservedSlug(slug, adminPath) {
  return slug === adminPath || slug === 'api' || slug === 'favicon.ico' || slug.startsWith('hash:');
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const envPassword = env.PASSWORD;
  if (envPassword) {
    const sessionHash = getCookie(request, 'auth_session');
    const validHash = await sha256(envPassword);

    if (!sessionHash || sessionHash !== validHash) {
      return jsonResponse({ error: 'Unauthorized: session expired or invalid password' }, 401);
    }
  }

  const DB = getKV(env);
  if (!DB) {
    const envKeys = env ? Object.keys(env) : [];
    return jsonResponse({ error: `KV binding not found. Debug: envKeys=${JSON.stringify(envKeys)}, hasMyKv=${!!(env && env.my_kv)}` }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON data' }, 400);
  }

  const { url, slug: customSlug } = body;
  const adminPath = env.ADMIN_PATH;

  if (!url) {
    return jsonResponse({ error: 'URL is required' }, 400);
  }

  if (!isAllowedUrl(url)) {
    return jsonResponse({ error: 'Invalid URL format' }, 400);
  }

  const urlHash = await sha256(url);

  if (!customSlug) {
    const existingSlug = await DB.get(`hash:${urlHash}`);
    if (existingSlug) {
      const existingLinkData = await DB.get(existingSlug);
      if (existingLinkData) {
        try {
          const parsedData = JSON.parse(existingLinkData);
          return jsonResponse({ slug: existingSlug, ...parsedData });
        } catch (e) {}
      }
    }
  }

  let slug = typeof customSlug === 'string' ? customSlug.trim() : '';

  if (slug) {
    if (isReservedSlug(slug, adminPath)) {
      return jsonResponse({ error: 'This custom slug is not available.' }, 409);
    }
    if (!isValidSlug(slug)) {
      return jsonResponse({ error: 'Custom slug can only contain letters, numbers, hyphens, and underscores, up to 64 characters.' }, 400);
    }
    const existing = await DB.get(slug);
    if (existing) {
      return jsonResponse({ error: 'This custom slug is already in use.' }, 409);
    }
  } else {
    let attempts = 0;
    let foundAvailableSlug = false;

    do {
      slug = Math.random().toString(36).substring(2, 8);
      if (isReservedSlug(slug, adminPath)) continue;

      const existing = await DB.get(slug);
      if (!existing) {
        foundAvailableSlug = true;
        break;
      }
      attempts++;
    } while (attempts < 10);

    if (!foundAvailableSlug) {
      return jsonResponse({ error: 'Failed to generate a short link. Please try again.' }, 503);
    }
  }

  const linkData = {
    original: url,
    visits: 0,
    createdAt: Date.now()
  };

  await Promise.all([
    DB.put(slug, JSON.stringify(linkData)),
    DB.put(`hash:${urlHash}`, slug)
  ]);

  return jsonResponse({ slug, ...linkData });
}
