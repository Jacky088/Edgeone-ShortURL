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

function getKV(env) {
  if (env && env.my_kv) return env.my_kv;
  if (typeof my_kv !== 'undefined') return my_kv;
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

export async function onRequest({ request, env }) {
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
  if (!DB) return jsonResponse({ error: 'Server Error: KV binding not found' }, 500);

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
