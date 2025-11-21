// functions/api/auth/index.js

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { password } = await request.json();
    const envPassword = env.PASSWORD;

    // 如果环境变量没设置密码，直接返回成功（或者禁止访问，取决于策略，这里假设没设密码不需要登录）
    if (!envPassword) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (password === envPassword) {
      // 计算密码的哈希值存入 Cookie，避免明文存储
      const hash = await sha256(envPassword);
      
      // 关键：不设置 Max-Age 或 Expires，使其成为会话 Cookie (浏览器关闭即失效)
      const cookie = `auth_session=${hash}; HttpOnly; Path=/; SameSite=Strict; Secure`;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie
        }
      });
    } else {
      return new Response(JSON.stringify({ error: '口令错误' }), { status: 401 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: '验证失败' }), { status: 500 });
  }
}
