// functions/api/create/index.js

import {
  sha256,
  getKV,
  validateSession,
  validateCsrfToken,
  checkRateLimit,
  isAllowedUrl,
  isValidSlug,
  isReservedSlug,
  jsonResponse,
  logAudit
} from './lib/security.js';

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    return jsonResponse({ error: 'Service unavailable' }, 503);
  }

  // 速率限制：每分钟最多20次创建请求
  const rateLimit = await checkRateLimit(request, DB, 'create', 20, 60);
  if (!rateLimit.allowed) {
    return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  // 验证会话
  const envPassword = env.PASSWORD;
  if (envPassword) {
    const isValid = await validateSession(request, DB);
    if (!isValid) {
      return jsonResponse({ error: 'Unauthorized: session expired or invalid' }, 401);
    }

    // 验证CSRF令牌
    const csrfValid = await validateCsrfToken(request, DB);
    if (!csrfValid) {
      await logAudit(DB, 'csrf_validation_failed', {
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        endpoint: '/api/create'
      });
      return jsonResponse({ error: 'CSRF validation failed' }, 403);
    }
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

  // 增强的URL验证（包含黑名单）
  if (!isAllowedUrl(url)) {
    await logAudit(DB, 'blocked_url_attempt', {
      url,
      ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });
    return jsonResponse({ error: 'Invalid or blocked URL' }, 400);
  }

  // URL长度限制
  if (url.length > 2048) {
    return jsonResponse({ error: 'URL too long (max 2048 characters)' }, 400);
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
      return jsonResponse({ error: 'Custom slug can only contain letters, numbers, hyphens, and underscores, up to 32 characters.' }, 400);
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

  // 记录创建操作
  await logAudit(DB, 'link_created', {
    slug,
    ip: request.headers.get('CF-Connecting-IP') || 'unknown',
    timestamp: Date.now()
  });

  return jsonResponse({ slug, ...linkData });
}
