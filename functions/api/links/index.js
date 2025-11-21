// functions/api/links/index.js

export async function onRequest({ request, env }) {
  const adminPath = env.ADMIN_PATH;

  // 验证
  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return new Response('未授权', { status: 401 });
  }

  // 安全获取 KV
  let DB;
  if (env && env.my_kv) { DB = env.my_kv; } 
  else if (typeof my_kv !== 'undefined') { DB = my_kv; }
  if (!DB) { return new Response(JSON.stringify({ error: 'KV binding error' }), { status: 500 }); }

  try {
    let allKeys = [];
    let cursor = undefined;
    let complete = false;
    const MAX_KEYS = 2000; 

    do {
      const listOptions = cursor ? { cursor } : {};
      // @ts-ignore
      const result = await DB.list(listOptions);

      if (result.keys) {
        allKeys = allKeys.concat(result.keys);
      }

      cursor = result.cursor;
      complete = result.complete;
      if (allKeys.length >= MAX_KEYS) break;
    } while (!complete);

    const links = await Promise.all(
      allKeys.map(async ({ key }) => {
        if (key.startsWith('hash:') || key === 'visitCount' || key === adminPath) {
          return null;
        }

        const value = await DB.get(key);
        if (value) {
          try {
            const data = JSON.parse(value);
            if (data.original) {
              return {
                slug: key,
                original: data.original,
                visits: data.visits || 0,
              };
            }
          } catch (e) { return null; }
        }
        return null;
      })
    );

    const validLinks = links.filter(Boolean);

    return new Response(JSON.stringify(validLinks), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '获取列表失败' }), { status: 500 });
  }
}
