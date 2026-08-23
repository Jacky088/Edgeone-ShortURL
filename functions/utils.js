// functions/utils.js
// 各 API 与页面处理函数共用的工具函数，统一维护

export async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

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

export function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(slug);
}

// 内部键前缀与保留字，禁止被注册为短链接
const RESERVED_SLUGS = ['api', 'favicon.ico'];
const INTERNAL_PREFIXES = ['hash:', 'sess:', 'rl:'];

export function isReservedSlug(slug, adminPath) {
  return slug === adminPath || RESERVED_SLUGS.includes(slug) || INTERNAL_PREFIXES.some(p => slug.startsWith(p));
}

// 校验服务端会话：Cookie 中是随机 token，真实会话存在 KV 的 sess:<token>
export async function verifySession(request, env, DB) {
  if (!env.PASSWORD) return true;
  if (!DB) return false;
  const token = getCookie(request, 'auth_session');
  if (!token || !/^[a-f0-9]{16,128}$/.test(token)) return false;
  try {
    const raw = await DB.get(`sess:${token}`);
    if (!raw) return false;
    const session = JSON.parse(raw);
    return typeof session.exp === 'number' && Date.now() < session.exp;
  } catch (e) {
    return false;
  }
}
