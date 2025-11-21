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

  // --- 鉴权逻辑开始 ---
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
  // --- 鉴权逻辑结束 ---

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

  // 验证 URL 格式 (简单验证)
  try {
    new URL(url);
  } catch (_) {
    return new Response(JSON.stringify({ error: '无效的 URL 格式' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 检查是否已存在该 URL 的短链 (仅当用户没有自定义 slug 时复用)
  const urlHash = await sha256(url);
  
  if (!customSlug) {
    const existingSlug = await my_kv.get(`hash:${urlHash}`);
    if (existingSlug) {
      const existingLinkData = await my_kv.get(existingSlug);
      if (existingLinkData) {
        try {
            const parsedData = JSON.parse(existingLinkData);
            return new Response(JSON.stringify({ slug: existingSlug, ...parsedData }), {
                headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                },
            });
        } catch (e) {
            // 如果 JSON 解析失败，说明数据损坏，忽略并重新生成
            console.error('Data corruption for slug:', existingSlug);
        }
      }
    }
  }

  let slug = customSlug;

  if (slug) {
    // 检查自定义 slug 是否冲突
    if (adminPath && slug === adminPath) {
      return new Response(JSON.stringify({ error: '此自定义短链接不可用。' }), { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    // 验证 slug 格式
    if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
      return new Response(JSON.stringify({ error: '自定义短链接只能包含字母、数字、连字符和下划线。' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    
    const existing = await my_kv.get(slug);
    if (existing) {
      return new Response(JSON.stringify({ error: '此自定义短链接已被使用。' }), { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  } else {
    // 生成随机 slug，并确保唯一
    let newSlug, existing;
    let attempts = 0;
    do {
      newSlug = Math.random().toString(36).substring(2, 8);
      // 避免与 adminPath 冲突
      if (adminPath && newSlug === adminPath) continue;
      existing = await my_kv.get(newSlug);
      attempts++;
    } while (existing && attempts < 5); // 防止死循环

    if (existing) {
         return new Response(JSON.stringify({ error: '生成短链失败，请重试。' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    slug = newSlug;
  }

  const linkData = {
    original: url,
    visits: 0,
    createdAt: Date.now() // 增加创建时间字段，便于未来扩展
  };

  // 并发写入 KV
  await Promise.all([
    my_kv.put(slug, JSON.stringify(linkData)),
    my_kv.put(`hash:${urlHash}`, slug)
  ]);

  return new Response(JSON.stringify({ slug, ...linkData }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
