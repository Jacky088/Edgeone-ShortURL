// functions/api/delete/index.js

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env }) {
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 验证 Admin Slug
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return new Response('未授权', { status: 401 });
  }

  // 安全获取 KV
  let DB;
  if (env && env.my_kv) { DB = env.my_kv; } 
  else if (typeof my_kv !== 'undefined') { DB = my_kv; }
  if (!DB) { return new Response(JSON.stringify({ error: 'KV binding error' }), { status: 500 }); }

  let body;
  try { body = await request.json(); } catch(e) { return new Response('Invalid JSON', { status: 400 }); }
  const { slug } = body;

  if (!slug) {
    return new Response('Slug is required', { status: 400 });
  }

  try {
    const linkDataStr = await DB.get(slug);
    if (linkDataStr) {
      try {
        const linkData = JSON.parse(linkDataStr);
        if (linkData.original) {
            const urlHash = await sha256(linkData.original);
            await Promise.all([
                DB.delete(slug),
                DB.delete(`hash:${urlHash}`)
            ]);
        } else {
            await DB.delete(slug);
        }
      } catch (parseErr) {
          await DB.delete(slug);
      }
    }

    return new Response(JSON.stringify({ success: true, slug }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: '删除失败' }), { status: 500 });
  }
}
