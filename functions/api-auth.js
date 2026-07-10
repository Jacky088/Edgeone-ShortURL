// functions/api/auth/index.js

import {
  getKV,
  createSession,
  checkRateLimit,
  generateCsrfToken,
  jsonResponse,
  logAudit
} from './lib/security.js';

export async function onRequest({ request, env = {} }) {
  console.log('✅✅✅ /api/auth HANDLER CALLED! ✅✅✅');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    return jsonResponse({ error: 'Service unavailable' }, 503);
  }

  // 速率限制：每分钟最多5次登录尝试
  const rateLimit = await checkRateLimit(request, DB, 'auth', 5, 60);
  if (!rateLimit.allowed) {
    await logAudit(DB, 'auth_rate_limit_exceeded', {
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      timestamp: Date.now()
    });
    return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429);
  }

  try {
    const { password } = await request.json();
    const envPassword = env.PASSWORD;

    // 调试信息：检查环境变量是否正确读取（部署后请删除此行）
    console.log('Environment check:', {
      hasPassword: !!envPassword,
      passwordLength: envPassword ? envPassword.length : 0,
      inputLength: password ? password.length : 0,
      envKeys: Object.keys(env || {})
    });

    // 如果环境变量没设置密码，直接返回成功
    if (!envPassword) {
      return jsonResponse({ success: true, csrf: null }, 200);
    }

    // 去除可能的空格和换行符
    const cleanEnvPassword = String(envPassword).trim();
    const cleanInputPassword = String(password).trim();

    if (cleanInputPassword === cleanEnvPassword) {
      // 创建安全的会话令牌
      const sessionToken = await createSession(DB, 24 * 60 * 60 * 1000); // 24小时

      // 生成CSRF令牌
      const csrfToken = await generateCsrfToken(DB, sessionToken);

      // 记录成功登录
      await logAudit(DB, 'auth_success', {
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        timestamp: Date.now()
      });

      // 设置安全的会话Cookie
      const cookie = `session_token=${sessionToken}; HttpOnly; Path=/; SameSite=Strict; Secure; Max-Age=${24 * 60 * 60}`;

      return new Response(JSON.stringify({ success: true, csrf: csrfToken }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie
        }
      });
    } else {
      // 记录失败的登录尝试（包含调试信息）
      await logAudit(DB, 'auth_failed', {
        ip: request.headers.get('CF-Connecting-IP') || 'unknown',
        timestamp: Date.now(),
        debug: {
          envPasswordExists: !!envPassword,
          inputPasswordExists: !!password,
          match: cleanInputPassword === cleanEnvPassword
        }
      });

      return jsonResponse({ error: '口令错误' }, 401);
    }
  } catch (err) {
    console.error('Auth error:', err);
    return jsonResponse({ error: '验证失败: ' + err.message }, 500);
  }
}
