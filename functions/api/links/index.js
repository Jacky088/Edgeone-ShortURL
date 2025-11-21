// functions/api/links/index.js

export async function onRequest({ request, env }) {
  const adminPath = env.ADMIN_PATH;

  if (!adminPath || request.headers.get('X-Admin-Slug') !== adminPath) {
    return new Response('未授权', { status: 401 });
  }

  try {
    let allKeys = [];
    let cursor = undefined;
    let complete = false;

    // 限制最大拉取数量，防止 KV 太大导致超时
    const MAX_KEYS = 2000; 

    do {
      const listOptions = cursor ? { cursor } : {};
      // @ts-ignore
      const result = await my_kv.list(listOptions);

      if (result.keys) {
        allKeys = allKeys.concat(result.keys);
      }

      cursor = result.cursor;
      complete = result.complete;
      
      if (allKeys.length >= MAX_KEYS) break;

    } while (!complete);

    // 并发获取数据
    const links = await Promise.all(
      allKeys.map(async ({ key }) => {
        // 过滤系统 key
        if (key.startsWith('hash:') || key === 'visitCount') {
          return null;
        }
        // 过滤掉 admin path 本身（如果 admin path 也是个短字符串的话）
        if (key === adminPath) return null;

        const value = await my_kv.get(key);
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
          } catch (e) {
            return null;
          }
        }
        return null;
      })
    );

    const validLinks = links.filter(Boolean);

    return new Response(JSON.stringify(validLinks), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: '获取链接列表失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
