// functions/api/delete/index.js

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequest({ request, env }) {
  const adminPath = env.ADMIN_PATH;

  if (request.method !== 'POST') {
    return new Response('请求方法不允许', { status: 405 });
  }

  // Admin Auth check
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return new Response('未授权', { status: 401 });
  }

  let body;
  try {
      body = await request.json();
  } catch(e) {
      return new Response('Invalid JSON', { status: 400 });
  }
  const { slug } = body;

  if (!slug) {
    return new Response('短链接标识是必需的', { status: 400 });
  }

  try {
    const linkDataStr = await my_kv.get(slug);
    if (linkDataStr) {
      try {
        const linkData = JSON.parse(linkDataStr);
        if (linkData.original) {
            const urlHash = await sha256(linkData.original);
            // 并行删除
            await Promise.all([
                my_kv.delete(slug),
                my_kv.delete(`hash:${urlHash}`)
            ]);
        } else {
            // 即使数据格式不对，也要删除这个 key
            await my_kv.delete(slug);
        }
      } catch (parseErr) {
          // 如果解析失败，强制删除 key，防止占位
          await my_kv.delete(slug);
      }
    }

    return new Response(JSON.stringify({ success: true, slug }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: '删除链接失败' }), { status: 500 });
  }
}
