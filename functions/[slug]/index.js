// functions/[slug]/index.js
// 路由处理：favicon、管理后台、短链接跳转、主页。
// 页面 HTML 模板见 functions/pages.js，工具函数见 functions/utils.js

import { loginHtml, indexHtml, adminHtml } from '../pages.js';
import { getKV, isAllowedUrl, verifySession } from '../utils.js';

// 浏览器标签页图标（与 public/favicon.svg 一致）。
// 固定返回内联 SVG：本函数会拦截 /favicon.svg 等路径（部署时静态资源优先级不保证），
// 若不内联返回，浏览器请求图标将落到短链接查询而 404。
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c6bff"/><stop offset="1" stop-color="#1246b8"/></linearGradient></defs>
  <rect width="32" height="32" rx="8" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(4.6 4.6) scale(0.95)">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </g>
</svg>`;

export async function onRequest(context) {
  const { request, params, env = {} } = context;
  const { slug } = params;
  const adminPath = env.ADMIN_PATH;

  // A. 浏览器图标：无需 KV，直接返回（favicon.ico 302 到 favicon.svg）
  if (slug === 'favicon.svg') {
    return new Response(FAVICON_SVG, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }
    });
  }
  if (slug === 'favicon.ico') {
    return new Response(null, { status: 301, headers: { Location: '/favicon.svg' } });
  }

  // --- 安全获取 KV ---
  const DB = getKV(env);
  if (!DB && slug) {
    console.error(`KV binding not found in functions/[slug]. env keys: ${env ? Object.keys(env).join(',') : 'none'}`);
    return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

  // --- 鉴权状态检查（服务端会话）---
  const isAuthorized = await verifySession(request, env, DB);

  // --- 注入变量准备 ---
  // 核心逻辑：如果没设置 adminPath，status 传空字符串，前端 JS 捕获后会弹窗
  const adminPathStatus = adminPath || '';

  // B. 处理 Admin 路由 (受口令保护)
  if (adminPath && slug === adminPath) {
    if (!isAuthorized) {
      const finalLoginHtml = loginHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));
      return new Response(finalLoginHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
    }
    return new Response(adminHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
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
