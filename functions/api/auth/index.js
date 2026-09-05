// functions/api/auth/index.js

import { getKV, buildAuthCookie, getSettings, sessionTtlMs, sha256, getClientIp } from '../../utils.js';

// 会话安全设计：
// - Cookie 只存随机 token，服务端在 KV 中维护 sess:<token>（含过期时间与会话版本）
// - 登录失败按 IP 计数，阈值与窗口来自运行时设置（默认 5 次 / 10 分钟）
// - 口令来源：运行时自定义口令（SHA-256 哈希存储）优先，其次环境变量 PASSWORD 明文

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
    const DB = getKV(env);
    if (!DB) {
      // 没有 KV 绑定时无法存储会话，拒绝登录而不是退化到不安全的方案
      return new Response(JSON.stringify({ error: '服务配置错误，请联系管理员' }), { status: 500 });
    }

    const settings = await getSettings(DB);

    // 口令来源：运行时自定义口令优先，其次环境变量；都没有则无需登录
    if (!settings.passwordHash && !env.PASSWORD) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // 按 IP 限流：窗口期内失败次数过多则临时锁定
    const ip = getClientIp(request);
    const rl = await getRateLimit(DB, ip);
    const maxAttempts = Math.min(100, Math.max(1, Number(settings.rateLimit && settings.rateLimit.max) || 5));
    const lockoutMs = Math.min(1440, Math.max(1, Number(settings.rateLimit && settings.rateLimit.windowMin) || 10)) * 60000;
    if (rl.count >= maxAttempts && Date.now() - rl.firstAt < lockoutMs) {
      return new Response(JSON.stringify({ error: '尝试次数过多，请稍后再试' }), { status: 429 });
    }

    // 自定义口令按哈希比对；环境变量口令按明文比对，均使用常量时间比较
    let ok = false;
    if (settings.passwordHash) {
      ok = timingSafeEqual(await sha256(String(password || '')), settings.passwordHash);
    } else {
      ok = timingSafeEqual(String(password || ''), env.PASSWORD);
    }

    if (!ok) {
      const newRl = Date.now() - rl.firstAt >= lockoutMs
        ? { count: 1, firstAt: Date.now() }
        : { count: rl.count + 1, firstAt: rl.firstAt };
      await DB.put(`rl:${ip}`, JSON.stringify(newRl));
      return new Response(JSON.stringify({ error: '口令错误' }), { status: 401 });
    }

    // 登录成功：清除失败计数，创建服务端会话（记录会话版本，口令变更后旧会话立即失效）
    await DB.delete(`rl:${ip}`).catch(() => {});

    const token = randomToken();
    const session = {
      createdAt: Date.now(),
      exp: Date.now() + sessionTtlMs(settings),
      pv: settings.pwdVersion || 0
    };
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
