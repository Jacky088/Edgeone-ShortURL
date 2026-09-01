// functions/utils.js
// 各 API 与页面处理函数共用的工具函数，统一维护

// 服务端会话兜底有效期：24 小时，活跃访问自动续期
// （登录 Cookie 为会话级，关闭浏览器标签即失效；服务端 exp 仅作安全兜底）
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// 构造登录 Cookie：HttpOnly + Secure 写死（EdgeOne Pages 始终走 HTTPS）
// 默认不携带 Max-Age/Expires => 会话级 Cookie，浏览器关闭标签后自动失效
// 显式传入 maxAgeSec（如登出时传 0）则生成带 Max-Age 的过期/清除 Cookie
export function buildAuthCookie(token, maxAgeSec) {
  const maxAgePart = maxAgeSec == null ? '' : `; Max-Age=${maxAgeSec}`;
  return `auth_session=${token}; HttpOnly; Path=/; SameSite=Lax${maxAgePart}; Secure`;
}

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
    if (typeof session.exp !== 'number' || Date.now() >= session.exp) {
      // 惰性清理：EdgeOne KV 不支持 TTL，过期会话在鉴权时顺手删除
      await DB.delete(`sess:${token}`).catch(() => {});
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// 滑动续期版会话校验：
// - 返回布尔值，true 表示会话有效
// - 会话剩余有效期不足一半时续期到完整 SESSION_TTL_MS（服务端兜底）
//   Cookie 本身是会话级（无 Max-Age），无需刷新浏览器 Cookie
export async function verifySessionWithRenewal(request, env, DB) {
  if (!env.PASSWORD) return true;
  if (!DB) return false;
  const token = getCookie(request, 'auth_session');
  if (!token || !/^[a-f0-9]{16,128}$/.test(token)) return false;
  try {
    const raw = await DB.get(`sess:${token}`);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (typeof session.exp !== 'number' || Date.now() >= session.exp) {
      await DB.delete(`sess:${token}`).catch(() => {});
      return false;
    }
    if (session.exp - Date.now() < SESSION_TTL_MS / 2) {
      session.exp = Date.now() + SESSION_TTL_MS;
      await DB.put(`sess:${token}`, JSON.stringify(session)).catch(() => {});
    }
    return true;
  } catch (e) {
    return false;
  }
}
