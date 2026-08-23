// functions/api/create/index.js

import { sha256, jsonResponse, getKV, isAllowedUrl, isValidSlug, isReservedSlug, verifySession } from '../../utils.js';

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    console.error('KV binding not found in /api/create');
    return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);
  }

  if (!(await verifySession(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized: session expired or invalid password' }, 401);
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
      // 8 位 base36，降低链接量增长后的碰撞重试频率
      slug = Math.random().toString(36).substring(2, 10);
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
