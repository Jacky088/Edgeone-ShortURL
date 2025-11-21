// functions/api/create/index.js

async function sha256(str) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const cookieString = request.headers.get('Cookie');
  if (!cookieString) return null;
  const cookies = cookieString.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // --- 鉴权逻辑 ---
  const envPassword = env.PASSWORD;
  if (envPassword) {
    const sessionHash = getCookie(request, 'auth_session');
    const validHash = await sha256(envPassword);
    
    if (!sessionHash || sessionHash !== validHash) {
      return new Response(JSON.stringify({ error: '未授权：会话已过期或口令错误' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // --- 安全获取 KV ---
  let DB;
  if (env && env.my_kv) { DB = env.my_kv; } 
  else if (typeof my_kv !== 'undefined') { DB = my_kv; }
  if (!DB) { return new Response(JSON.stringify({ error: 'Server Error: KV binding not found' }), { status: 500 }); }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: '无效的 JSON 数据' }), { status: 400 });
  }

  const { url, slug: customSlug } = body;
  const adminPath = env.ADMIN_PATH;

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL 是必需的' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 验证 URL 格式
  try { new URL(url); } catch (_) {
    return new Response(JSON.stringify({ error: '无效的 URL 格式' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 检查是否存在 (Hash check)
  const urlHash = await sha256(url);
  
  if (!customSlug) {
    const existingSlug = await DB.get(`hash:${urlHash}`);
    if (existingSlug) {
      const existingLinkData = await DB.get(existingSlug);
      if (existingLinkData) {
        try {
            const parsedData = JSON.parse(existingLinkData);
            return new Response(JSON.stringify({ slug: existingSlug, ...parsedData }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (e) {}
      }
    }
  }

  let slug = customSlug;

  if (slug) {
    if (adminPath && slug === adminPath) {
      return new Response(JSON.stringify({ error: '此自定义短链接不可用。' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
      return new Response(JSON.stringify({ error: '自定义短链接只能包含字母、数字、连字符和下划线。' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const existing = await DB.get(slug);
    if (existing) {
      return new Response(JSON.stringify({ error: '此自定义短链接已被使用。' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
  } else {
    // 生成随机 Slug
    let attempts = 0;
    do {
      slug = Math.random().toString(36).substring(2, 8);
      if (adminPath && slug === adminPath) continue;
      const existing = await DB.get(slug);
      if (!existing) break;
      attempts++;
    } while (attempts < 5);
  }

  const linkData = {
    original: url,
    visits: 0,
    createdAt: Date.now()
  };

  // 并发写入
  await Promise.all([
    DB.put(slug, JSON.stringify(linkData)),
    DB.put(`hash:${urlHash}`, slug)
  ]);

  return new Response(JSON.stringify({ slug, ...linkData }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
