// functions/lib/security.js - 安全工具库

/**
 * 生成安全的随机会话令牌
 */
export function generateSessionToken() {
  return crypto.randomUUID();
}

/**
 * SHA256 哈希函数
 */
export async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取Cookie值
 */
export function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;

  const cookies = cookieString.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value || '');
  }
  return null;
}

/**
 * 验证会话令牌
 */
export async function validateSession(request, DB) {
  const sessionToken = getCookie(request, 'session_token');
  if (!sessionToken) return false;

  try {
    const sessionData = await DB.get(`session:${sessionToken}`);
    if (!sessionData) return false;

    const session = JSON.parse(sessionData);
    const now = Date.now();

    // 检查会话是否过期
    if (session.expiresAt && session.expiresAt < now) {
      await DB.delete(`session:${sessionToken}`);
      return false;
    }

    return session.authenticated === true;
  } catch (e) {
    return false;
  }
}

/**
 * 创建会话
 */
export async function createSession(DB, maxAge = 24 * 60 * 60 * 1000) {
  const sessionToken = generateSessionToken();
  const now = Date.now();

  const sessionData = {
    authenticated: true,
    createdAt: now,
    expiresAt: now + maxAge
  };

  // 设置会话有效期（秒）
  await DB.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
    expirationTtl: Math.floor(maxAge / 1000)
  });

  return sessionToken;
}

/**
 * 销毁会话
 */
export async function destroySession(request, DB) {
  const sessionToken = getCookie(request, 'session_token');
  if (sessionToken) {
    await DB.delete(`session:${sessionToken}`);
  }
}

/**
 * 速率限制检查
 */
export async function checkRateLimit(request, DB, endpoint, limit = 10, windowSeconds = 60) {
  const clientIP = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   request.headers.get('X-Real-IP') ||
                   'unknown';

  const rateLimitKey = `ratelimit:${clientIP}:${endpoint}`;

  try {
    const currentCount = await DB.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // 增加计数
    await DB.put(rateLimitKey, String(count + 1), {
      expirationTtl: windowSeconds
    });

    return { allowed: true, remaining: limit - count - 1 };
  } catch (e) {
    // 如果速率限制检查失败，允许请求通过但记录错误
    console.error('Rate limit check failed:', e);
    return { allowed: true, remaining: limit };
  }
}

/**
 * 验证URL是否安全
 */
export function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);

    // 只允许 http 和 https 协议
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // 黑名单：阻止常见的恶意域名模式
    const hostname = parsed.hostname.toLowerCase();

    // 阻止本地地址
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname === '[::1]') {
      return false;
    }

    // 阻止常见的钓鱼域名特征
    const suspiciousPatterns = [
      /paypal.*login/i,
      /account.*verify/i,
      /secure.*update/i,
      /banking.*confirm/i,
      /.*\.tk$/,  // 免费域名后缀
      /.*\.ml$/,
      /.*\.ga$/,
      /.*\.cf$/,
      /.*\.gq$/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(hostname) || pattern.test(url)) {
        return false;
      }
    }

    // 阻止URL中包含多个@符号（常见的钓鱼技巧）
    if ((url.match(/@/g) || []).length > 1) {
      return false;
    }

    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 验证slug格式
 */
export function isValidSlug(slug) {
  // 限制为字母数字、下划线和连字符，长度1-32
  return /^[a-zA-Z0-9_-]{1,32}$/.test(slug);
}

/**
 * 检查是否为保留slug
 */
export function isReservedSlug(slug, adminPath) {
  const reservedSlugs = [
    'api',
    'favicon.ico',
    'public',
    'static',
    'admin',
    'login',
    'logout',
    'assets',
    '_next',
    '__',
    'system',
    'config'
  ];

  return reservedSlugs.includes(slug.toLowerCase()) ||
         slug === adminPath ||
         slug.startsWith('hash:') ||
         slug.startsWith('session:') ||
         slug.startsWith('ratelimit:') ||
         slug.startsWith('log:') ||
         slug.startsWith('csrf:');
}

/**
 * 生成CSRF令牌
 */
export async function generateCsrfToken(DB, sessionToken) {
  const csrfToken = generateSessionToken();
  const csrfKey = `csrf:${sessionToken}`;

  await DB.put(csrfKey, csrfToken, {
    expirationTtl: 3600 // 1小时
  });

  return csrfToken;
}

/**
 * 验证CSRF令牌
 */
export async function validateCsrfToken(request, DB) {
  const sessionToken = getCookie(request, 'session_token');
  if (!sessionToken) return false;

  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!csrfToken) return false;

  try {
    const storedToken = await DB.get(`csrf:${sessionToken}`);
    return storedToken === csrfToken;
  } catch (e) {
    return false;
  }
}

/**
 * 记录审计日志
 */
export async function logAudit(DB, action, details) {
  const timestamp = Date.now();
  const logKey = `log:${action}:${timestamp}:${crypto.randomUUID()}`;

  const logEntry = {
    action,
    timestamp,
    details
  };

  try {
    // 日志保留7天
    await DB.put(logKey, JSON.stringify(logEntry), {
      expirationTtl: 7 * 24 * 60 * 60
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

/**
 * JSON响应辅助函数
 */
export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

/**
 * 获取KV绑定
 */
export function getKV(env) {
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
