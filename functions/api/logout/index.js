// functions/api/logout/index.js

import { getCookie, getKV } from '../../utils.js';

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

  const url = new URL(request.url);
  const secureFlag = url.protocol === 'https:' ? '; Secure' : '';
  const cookie = `auth_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`;

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie
    }
  });
}
