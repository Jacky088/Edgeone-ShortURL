// functions/api/logout/index.js

import { getCookie, getKV, buildAuthCookie } from '../../utils.js';

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' }
    });
  }

  // 清除服务端会话（即使 Cookie 清理失败，token 也已失效）
  const DB = getKV(env);
  if (DB) {
    const token = getCookie(request, 'auth_session');
    if (token && /^[a-f0-9]{16,128}$/.test(token)) {
      await DB.delete(`sess:${token}`).catch(() => {});
    }
  }

  // Max-Age=0 立即过期；Secure 写死与登录 Cookie 保持一致
  const cookie = buildAuthCookie('', 0);

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie
    }
  });
}
