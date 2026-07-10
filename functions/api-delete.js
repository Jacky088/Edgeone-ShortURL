// functions/api/delete/index.js

import {
  sha256,
  getKV,
  getCookie,
  validateSession,
  validateCsrfToken,
  checkRateLimit,
  isValidSlug,
  jsonResponse,
  logAudit
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
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    return jsonResponse({ error: 'Service unavailable' }, 503);
  }

  // 速率限制：每分钟最多30次删除请求
  const rateLimit = await checkRateLimit(request, DB, 'delete', 30, 60);
  if (!rateLimit.allowed) {
    return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  if (!(await isAuthorized(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // 验证CSRF令牌
  if (env.PASSWORD) {
    const csrfValid = await validateCsrfToken(request, DB);
    if (!csrfValid) {
      await logAudit(DB, 'csrf_validation_failed', {
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        endpoint: '/api/delete'
      });
      return jsonResponse({ error: 'CSRF validation failed' }, 403);
    }
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

          // 记录删除操作
          await logAudit(DB, 'link_deleted', {
            slug,
            ip: request.headers.get('CF-Connecting-IP') || 'unknown',
            timestamp: Date.now()
          });
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
