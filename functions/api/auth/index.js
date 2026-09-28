// functions/api/auth/index.js

import { getKV, buildAuthCookie, getSettings, sessionTtlMs, sha256, getClientIp, windowedKey } from '../../utils.js';

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

async function getRateLimit(DB, ipHash, now) {
  try {
    // 键名带分钟桶：锁定窗口改变后旧键自然离开当前窗口，登录成功时顺手清理历史键
    const key = windowedKey('rl:', ipHash, 60000, now);
    const raw = await DB.get(key);
    if (raw) return JSON.parse(raw);
    return { count: 0, firstAt: now };
  } catch (e) {
    return { count: 0, firstAt: Date.now() };
  }
}

// 清理该 IP 历史分钟桶的限流键（超出当前窗口的桶都属历史，最多回看 2 个桶）
async function cleanupOldRateLimit(DB, ipHash, now) {
  try {
    for (const delta of [1, 2]) {
      const oldKey = `rl:${Math.floor(now / 60000) - delta}:${ipHash}`;
      await DB.delete(oldKey).catch(() => {});
    }
  } catch (e) {}
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
    // 限流 key 存 IP 的 SHA-256 哈希（不存原始 IP；IPv6 含分隔符、'unknown' 共享桶问题一并消除）
    const ip = getClientIp(request);
    const ipHash = ip === 'unknown' ? 'unknown' : await sha256(ip);
    const nowMs = Date.now();
    const rl = await getRateLimit(DB, ipHash, nowMs);
    const maxAttempts = Math.min(100, Math.max(1, Number(settings.rateLimit && settings.rateLimit.max) || 5));
    const lockoutMs = Math.min(1440, Math.max(1, Number(settings.rateLimit && settings.rateLimit.windowMin) || 10)) * 60000;
    if (rl.count >= maxAttempts && nowMs - rl.firstAt < lockoutMs) {
      const retryAfterSec = Math.max(1, Math.ceil((lockoutMs - (nowMs - rl.firstAt)) / 1000));
      return new Response(JSON.stringify({ error: '尝试次数过多，请稍后再试' }), {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec), 'Content-Type': 'application/json' }
      });
    }

    // 自定义口令按哈希比对；环境变量口令按明文比对，均使用常量时间比较
    let ok = false;
    if (settings.passwordHash) {
      ok = timingSafeEqual(await sha256(String(password || '')), settings.passwordHash);
    } else {
      ok = timingSafeEqual(String(password || ''), env.PASSWORD);
    }

    if (!ok) {
      const newRl = nowMs - rl.firstAt >= lockoutMs
        ? { count: 1, firstAt: nowMs }
        : { count: rl.count + 1, firstAt: rl.firstAt };
      await DB.put(windowedKey('rl:', ipHash, 60000, nowMs), JSON.stringify(newRl));
      return new Response(JSON.stringify({ error: '口令错误' }), { status: 401 });
    }

    // 登录成功：清除失败计数（含历史分钟桶），创建服务端会话（记录会话版本，口令变更后旧会话立即失效）
    await cleanupOldRateLimit(DB, ipHash, nowMs);
    await DB.delete(windowedKey('rl:', ipHash, 60000, nowMs)).catch(() => {});

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
