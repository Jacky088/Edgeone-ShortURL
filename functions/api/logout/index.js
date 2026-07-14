export async function onRequest({ request }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' }
    });
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
