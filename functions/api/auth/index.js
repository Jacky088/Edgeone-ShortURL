import { getKV, SESSION_TTL_MS, buildAuthCookie } from '../../utils.js';

// 会话安全设计：
// - Cookie 只存随机 token，服务端在 KV 中维护 sess:<token>（含过期时间）
// - 登录失败按 IP 计数，5 次失败后锁定 10 分钟

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getClientIp(request) {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return request.headers.get('EO-Client-IP') || 'unknown';
}

async function getRateLimit(DB, ip) {
  try {
    const raw = await DB.get(`rl:${ip}`);
    if (!raw) return { count: 0, firstAt: Date.now() };
    return JSON.parse(raw);
  } catch (e) {
    return { count: 0, firstAt: Date.now() };
  }
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { password } = await request.json();
    const envPassword = env.PASSWORD;

    // 如果环境变量没设置密码，直接返回成功（无密码部署不需要登录）
    if (!envPassword) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const DB = getKV(env);
    if (!DB) {
      // 没有 KV 绑定时无法存储会话，拒绝登录而不是退化到不安全的方案
      return new Response(JSON.stringify({ error: '服务配置错误，请联系管理员' }), { status: 500 });
    }

    // 按 IP 限流：窗口期内失败次数过多则临时锁定
    const ip = getClientIp(request);
    const rl = await getRateLimit(DB, ip);
    if (rl.count >= MAX_ATTEMPTS && Date.now() - rl.firstAt < LOCKOUT_MS) {
      return new Response(JSON.stringify({ error: '尝试次数过多，请稍后再试' }), { status: 429 });
    }

    if (!timingSafeEqual(String(password || ''), envPassword)) {
      const newRl = Date.now() - rl.firstAt >= LOCKOUT_MS
        ? { count: 1, firstAt: Date.now() }
        : { count: rl.count + 1, firstAt: rl.firstAt };
      await DB.put(`rl:${ip}`, JSON.stringify(newRl));
      return new Response(JSON.stringify({ error: '口令错误' }), { status: 401 });
    }

    // 登录成功：清除失败计数，创建服务端会话
    await DB.delete(`rl:${ip}`).catch(() => {});

    const token = randomToken();
    const session = { createdAt: Date.now(), exp: Date.now() + SESSION_TTL_MS };
    await DB.put(`sess:${token}`, JSON.stringify(session));

    const cookie = buildAuthCookie(token);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '验证失败' }), { status: 500 });
  }
}
