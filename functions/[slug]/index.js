// functions/[slug]/index.js
// 路由处理：管理后台、favicon、短链接跳转、主页。
// 页面 HTML 模板见 functions/pages.js，工具函数见 functions/utils.js

import { loginHtml, indexHtml, adminHtml } from '../pages.js';
import { getKV, isAllowedUrl, verifySession } from '../utils.js';

export async function onRequest(context) {
  const { request, params, env = {} } = context;
  const { slug } = params;
  const adminPath = env.ADMIN_PATH;

  // --- 安全获取 KV ---
  const DB = getKV(env);
  if (!DB && slug && slug !== 'favicon.ico') {
    console.error(`KV binding not found in functions/[slug]. env keys: ${env ? Object.keys(env).join(',') : 'none'}`);
    return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

  // --- 鉴权状态检查（服务端会话）---
  const isAuthorized = await verifySession(request, env, DB);

  // --- 注入变量准备 ---
  // 核心逻辑：如果没设置 adminPath，status 传空字符串，前端 JS 捕获后会弹窗
  const adminPathStatus = adminPath || '';

  // A. 处理 Admin 路由 (受口令保护)
  if (adminPath && slug === adminPath) {
    if (!isAuthorized) {
      const finalLoginHtml = loginHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));
      return new Response(finalLoginHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
    }
    return new Response(adminHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // B. 处理 favicon 请求
  if (slug === 'favicon.ico') {
    // 部分运行时 Response.redirect 要求绝对 URL，这里用 Location 头兼容相对地址
    return new Response(null, { status: 301, headers: { Location: '/favicon.svg' } });
  }

  // C. 处理短链接跳转 (公开访问)
  if (slug) {
    try {
      const cleanSlug = slug.trim().replace(/\/+$/, '');

      // 验证 slug 格式，防止路径遍历和注入攻击
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleanSlug)) {
        return new Response('Invalid slug format', { status: 400 });
      }

      const linkStr = await DB.get(cleanSlug);

      if (linkStr) {
        let linkData;
        try {
          linkData = JSON.parse(linkStr);
        } catch (parseErr) {
          // JSON 解析失败，可能是恶意数据
          return new Response('Invalid link data', { status: 500 });
        }

        if (!linkData.original || !isAllowedUrl(linkData.original)) {
          return new Response('Invalid link target', { status: 410 });
        }

        const newVisits = (linkData.visits || 0) + 1;
        linkData.visits = newVisits;

        // 访问计数写入不阻塞跳转；运行时不支持 waitUntil 时回退为同步等待
        const visitUpdate = DB.put(cleanSlug, JSON.stringify(linkData)).catch(err => {
          console.error(`Visit count update failed for ${cleanSlug}: ${err && err.message}`);
        });
        if (typeof context.waitUntil === 'function') {
          context.waitUntil(visitUpdate);
        } else {
          await visitUpdate;
        }
        return Response.redirect(linkData.original, 302);
      } else {
        return new Response('404 Not Found', { status: 404 });
      }
    } catch (err) {
      console.error(`KV Error: ${err.message}`);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  // D. 处理主页 (生成器) - 需要鉴权
  if (!isAuthorized) {
      const finalLoginHtml = loginHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));
      return new Response(finalLoginHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
  }

  const finalIndexHtml = indexHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));

  return new Response(finalIndexHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 200
  });
}
