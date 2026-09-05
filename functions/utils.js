// functions/utils.js
// 各 API 与页面处理函数共用的工具函数，统一维护

// 服务端会话兜底有效期：24 小时，活跃访问自动续期
// （登录 Cookie 为会话级，关闭浏览器标签即失效；服务端 exp 仅作安全兜底）
// v3.0 起可被运行时设置 settings.sessionHours 覆盖
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// 运行时设置与 API Token 的 KV 键（cfg: 前缀已加入保留字，短链无法占用）
export const SETTINGS_KEY = 'cfg:settings';
export const TOKENS_KEY = 'cfg:tokens';

// 运行时设置默认值：管理后台「系统设置」页保存后即时生效，无需重新部署。
// passwordHash 非空时覆盖环境变量 PASSWORD（口令以 SHA-256 哈希存储，不回传前端）；
// pwdVersion 在口令变更时自增，用于使所有旧会话立即失效。
export const DEFAULT_SETTINGS = {
  passwordHash: '',
  pwdVersion: 0,
  sessionHours: 24,
  rateLimit: { max: 5, windowMin: 10 },
  slug: { length: 8, charset: 'safe' },
  dedupHash: true,
  redirectCode: 302,
  domainWhitelist: [],
  dailyCreateLimit: 0,
  extraReserved: [],
  qr: { centerLogo: false, dark: '#16181d' },
  dedupMin: 0
};

// 读取运行时设置：与默认值按已知字段合并，读取失败时回退默认值
export async function getSettings(DB) {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!DB) return settings;
  try {
    const raw = await DB.get(SETTINGS_KEY);
    if (!raw) return settings;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return settings;
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const savedValue = saved[key];
      if (savedValue === undefined || savedValue === null) continue;
      const defaultValue = DEFAULT_SETTINGS[key];
      if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        if (typeof savedValue === 'object' && !Array.isArray(savedValue)) {
          settings[key] = { ...defaultValue, ...savedValue };
        }
      } else {
        settings[key] = savedValue;
      }
    }
    return settings;
  } catch (e) {
    return settings;
  }
}

// 保存运行时设置：在当前设置基础上合并 patch（嵌套对象同样合并）
export async function saveSettings(DB, patch) {
  const current = await getSettings(DB);
  const next = { ...current };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined) continue;
    if (typeof current[key] === 'object' && current[key] !== null && !Array.isArray(current[key])
        && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = { ...current[key], ...value };
    } else {
      next[key] = value;
    }
  }
  await DB.put(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

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
const INTERNAL_PREFIXES = ['hash:', 'sess:', 'rl:', 'cfg:', 'dc:'];

export function isReservedSlug(slug, adminPath, extraReserved) {
  if (slug === adminPath) return true;
  if (RESERVED_SLUGS.includes(slug)) return true;
  if (INTERNAL_PREFIXES.some(p => slug.startsWith(p))) return true;
  if (Array.isArray(extraReserved) && extraReserved.includes(slug)) return true;
  return false;
}

// 随机短链生成：长度与字符集来自运行时设置。
// safe 字符集去掉易混淆字符（i l o 0 1），full 为完整小写字母 + 数字
const SAFE_CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789';
const FULL_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSlug(settings) {
  const config = (settings && settings.slug) || {};
  const length = Math.min(16, Math.max(4, Number(config.length) || 8));
  const charset = config.charset === 'full' ? FULL_CHARSET : SAFE_CHARSET;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

// 目标域名白名单：空列表不限制；条目匹配主域名或其任意子域
export function isHostAllowed(url, whitelist) {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return true;
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (e) {
    return false;
  }
  return whitelist.some(entry => {
    const domain = String(entry || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    if (!domain) return false;
    return host === domain || host.endsWith('.' + domain);
  });
}

// 客户端 IP：优先代理头，回退 EdgeOne 注入头
export function getClientIp(request) {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return request.headers.get('EO-Client-IP') || 'unknown';
}

// 当前是否需要登录鉴权：运行时自定义口令优先，其次环境变量
function needsAuth(env, settings) {
  return !!(settings.passwordHash || env.PASSWORD);
}

async function readSession(DB, token) {
  const raw = await DB.get(`sess:${token}`);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session || typeof session.exp !== 'number') return null;
    return session;
  } catch (e) {
    return null;
  }
}

// 校验服务端会话：Cookie 中是随机 token，真实会话存在 KV 的 sess:<token>
export async function verifySession(request, env, DB) {
  const settings = await getSettings(DB);
  if (!needsAuth(env, settings)) return true;
  if (!DB) return false;
  const token = getCookie(request, 'auth_session');
  if (!token || !/^[a-f0-9]{16,128}$/.test(token)) return false;
  try {
    const session = await readSession(DB, token);
    if (!session) return false;
    if (Date.now() >= session.exp) {
      // 惰性清理：EdgeOne KV 不支持 TTL，过期会话在鉴权时顺手删除
      await DB.delete(`sess:${token}`).catch(() => {});
      return false;
    }
    // 口令变更后旧会话立即失效（pwdVersion 校验；旧会话无 pv 字段则宽限至自然过期）
    if (session.pv != null && settings.pwdVersion && session.pv !== settings.pwdVersion) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// 滑动续期版会话校验：
// - 返回布尔值，true 表示会话有效
// - 会话剩余有效期不足一半时续期到完整有效期（来自运行时设置，默认 24 小时）
//   Cookie 本身是会话级（无 Max-Age），无需刷新浏览器 Cookie
export async function verifySessionWithRenewal(request, env, DB) {
  const settings = await getSettings(DB);
  if (!needsAuth(env, settings)) return true;
  if (!DB) return false;
  const token = getCookie(request, 'auth_session');
  if (!token || !/^[a-f0-9]{16,128}$/.test(token)) return false;
  try {
    const session = await readSession(DB, token);
    if (!session) return false;
    if (Date.now() >= session.exp) {
      await DB.delete(`sess:${token}`).catch(() => {});
      return false;
    }
    if (session.pv != null && settings.pwdVersion && session.pv !== settings.pwdVersion) return false;
    const ttlMs = sessionTtlMs(settings);
    if (session.exp - Date.now() < ttlMs / 2) {
      session.exp = Date.now() + ttlMs;
      await DB.put(`sess:${token}`, JSON.stringify(session)).catch(() => {});
    }
    return true;
  } catch (e) {
    return false;
  }
}

export function sessionTtlMs(settings) {
  const hours = Number(settings && settings.sessionHours) || 24;
  return Math.min(720, Math.max(1, hours)) * 60 * 60 * 1000;
}

// 校验长期 API Token（请求头 X-API-Token，SHA-256 比对 cfg:tokens 中的哈希）
export async function verifyApiToken(request, env, DB) {
  const token = request.headers.get('X-API-Token');
  if (!token || !/^[a-f0-9]{32,128}$/.test(token) || !DB) return false;
  try {
    const raw = await DB.get(TOKENS_KEY);
    if (!raw) return false;
    const tokens = JSON.parse(raw);
    if (!Array.isArray(tokens) || !tokens.length) return false;
    const hash = await sha256(token);
    return tokens.some(t => t && t.hash === hash);
  } catch (e) {
    return false;
  }
}

// 管理类接口统一鉴权：API Token 或「Admin-Slug 头 + 会话」
// 语义与原 links/delete 一致：未设置 ADMIN_PATH 时仅 Token 可用
export async function checkAdmin(request, env, DB) {
  if (await verifyApiToken(request, env, DB)) return true;
  const adminPath = env.ADMIN_PATH;
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) return false;
  return verifySession(request, env, DB);
}

// 创建类接口鉴权：会话或 API Token（与原 /api/create 一致，不要求 Admin-Slug 头）
export async function checkCreateAuth(request, env, DB) {
  if (await verifyApiToken(request, env, DB)) return true;
  return verifySession(request, env, DB);
}
