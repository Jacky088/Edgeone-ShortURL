// functions/[slug]/index.js
// 路由处理：favicon、管理后台、短链接跳转（支持有效期/次数上限/密码保护/访问去重/来源统计）、主页。

import { loginHtml, indexHtml, adminHtml, errorPageHtml, passwordHtml, ADMIN_BUTTON_HTML } from '../pages.js';
import { getKV, isAllowedUrl, verifySessionWithRenewal, getSettings, getCookie, sha256 } from '../utils.js';

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

// 统一的 HTML 响应头（错误页 / 密码页与正常页面共用）
const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' };

const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod/i;
const MAX_DAILY_KEYS = 30;   // 单条短链保留最近 30 天的按日访问计数
const MAX_REFERRERS = 10;    // 单条短链保留 TOP 10 来路域名
const MAX_IP_ENTRIES = 50;   // 访问去重的 IP 指纹表上限（超出淘汰最旧）

function dayKeyOf(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

// 按数量上限裁剪对象：删除 value 最小的若干项（用于 ref 表）
function pruneByCount(obj, max) {
  const keys = Object.keys(obj);
  if (keys.length <= max) return;
  keys.sort((a, b) => obj[a] - obj[b]);
  for (let i = 0; i < keys.length - max; i++) delete obj[keys[i]];
}

// 按时间戳裁剪对象：删除最旧的若干项（用于 daily / ipd 表）
function pruneByTime(obj, max) {
  const keys = Object.keys(obj);
  if (keys.length <= max) return;
  keys.sort((a, b) => obj[a] - obj[b]);
  for (let i = 0; i < keys.length - max; i++) delete obj[keys[i]];
}

export async function onRequest(context) {
  const { request, params, env = {} } = context;
  const { slug } = params;
  const adminPath = env.ADMIN_PATH;

  // A. 浏览器图标：无需 KV，直接返回（favicon.ico 301 到 favicon.svg）
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

  // --- 鉴权状态检查（服务端会话，含滑动续期；口令与会话时长来自运行时设置）---
  const isAuthorized = await verifySessionWithRenewal(request, env, DB);

  // --- 注入变量准备 ---
  // 核心逻辑：如果没设置 adminPath，status 传空字符串，前端 JS 捕获后会弹窗
  const adminPathStatus = adminPath || '';

  // B. 处理 Admin 路由 (受口令保护)
  if (adminPath && slug === adminPath) {
    if (!isAuthorized) {
      const finalLoginHtml = loginHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));
      return new Response(finalLoginHtml, { headers: HTML_HEADERS, status: 200 });
    }
    // 注入二维码样式设置（后台二维码弹窗与主页保持一致）
    const adminSettings = await getSettings(DB);
    const finalAdminHtml = adminHtml.replace('__QR_SETTINGS__', JSON.stringify(adminSettings.qr || {}));
    return new Response(finalAdminHtml, { headers: HTML_HEADERS });
  }

  // C. 处理短链接跳转 (公开访问)
  if (slug) {
    try {
      const cleanSlug = slug.trim().replace(/\/+$/, '');

      // 验证 slug 格式，防止路径遍历和注入攻击
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleanSlug)) {
        return new Response(errorPageHtml({ code: '400', title: '链接格式不正确', message: '短链接格式不正确，请检查访问的链接是否完整。' }), { status: 400, headers: HTML_HEADERS });
      }

      const linkStr = await DB.get(cleanSlug);

      if (linkStr) {
        let linkData;
        try {
          linkData = JSON.parse(linkStr);
        } catch (parseErr) {
          // JSON 解析失败，可能是恶意数据
          return new Response('Invalid link data', { status: 500, headers: { 'Content-Type': 'text/plain' } });
        }

        if (!linkData.original || !isAllowedUrl(linkData.original)) {
          return new Response(errorPageHtml({ code: '410', title: '链接已失效', message: '该短链接的目标地址无效或已被禁用。' }), { status: 410, headers: HTML_HEADERS });
        }

        // 回收站（软删除）/ 有效期 / 次数上限
        if (linkData.deletedAt) {
          return new Response(errorPageHtml({ code: '410', title: '链接已删除', message: '该短链接已被管理员删除，可联系分享者获取新链接。' }), { status: 410, headers: HTML_HEADERS });
        }
        if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
          return new Response(errorPageHtml({ code: '410', title: '链接已过期', message: '该短链接已超过有效期。' }), { status: 410, headers: HTML_HEADERS });
        }
        if (linkData.maxVisits && (linkData.visits || 0) >= linkData.maxVisits) {
          return new Response(errorPageHtml({ code: '410', title: '链接已达访问上限', message: '该短链接的访问次数已达上限。' }), { status: 410, headers: HTML_HEADERS });
        }

        const settings = await getSettings(DB);

        // 密码保护：验证通过前展示密码页；通过后写路径级 Cookie（24 小时内免输）
        if (linkData.pwdHash) {
          const cookieName = `pv_${cleanSlug}`;
          if (getCookie(request, cookieName) !== linkData.pwdHash) {
            if (request.method === 'POST') {
              let password = '';
              try {
                const form = await request.formData();
                password = String(form.get('pw') || '');
              } catch (e) {}
              if (password && (await sha256(password)) === linkData.pwdHash) {
                return new Response(null, {
                  status: 303,
                  headers: {
                    'Set-Cookie': `${cookieName}=${linkData.pwdHash}; HttpOnly; Path=/${cleanSlug}; SameSite=Lax; Max-Age=86400; Secure`,
                    'Location': `/${cleanSlug}`
                  }
                });
              }
              return new Response(passwordHtml({ slug: cleanSlug, error: '密码错误，请重试' }), { status: 401, headers: HTML_HEADERS });
            }
            return new Response(passwordHtml({ slug: cleanSlug }), { status: 200, headers: HTML_HEADERS });
          }
        }

        // 访问统计：按日计数、来路域名、设备类型；可选按 IP 指纹去重（运行时设置）
        const now = Date.now();
        let counted = true;
        const ipHash = settings.dedupMin > 0 ? await sha256(`${await getClientIpHash(request)}|${cleanSlug}`) : '';
        if (settings.dedupMin > 0 && linkData.ipd && linkData.ipd[ipHash] && now - linkData.ipd[ipHash] < settings.dedupMin * 60000) {
          counted = false;
        }

        if (counted) {
          linkData.visits = (linkData.visits || 0) + 1;

          const dk = dayKeyOf(now);
          linkData.daily = linkData.daily || {};
          linkData.daily[dk] = (linkData.daily[dk] || 0) + 1;
          pruneByTime(linkData.daily, MAX_DAILY_KEYS);

          const referer = request.headers.get('Referer');
          if (referer) {
            try {
              const host = new URL(referer).hostname;
              if (host) {
                linkData.ref = linkData.ref || {};
                linkData.ref[host] = (linkData.ref[host] || 0) + 1;
                pruneByCount(linkData.ref, MAX_REFERRERS);
              }
            } catch (e) {}
          }

          const ua = request.headers.get('User-Agent') || '';
          linkData.dev = linkData.dev || { m: 0, d: 0 };
          if (MOBILE_UA.test(ua)) linkData.dev.m += 1; else linkData.dev.d += 1;
        }

        // 去重指纹表：命中与否都刷新时间戳；超出上限淘汰最旧
        if (settings.dedupMin > 0 && ipHash) {
          linkData.ipd = linkData.ipd || {};
          linkData.ipd[ipHash] = now;
          pruneByTime(linkData.ipd, MAX_IP_ENTRIES);
        }

        // 计数写入不阻塞跳转；运行时不支持 waitUntil 时回退为同步等待
        const visitUpdate = DB.put(cleanSlug, JSON.stringify(linkData)).catch(err => {
          console.error(`Visit count update failed for ${cleanSlug}: ${err && err.message}`);
        });
        if (typeof context.waitUntil === 'function') {
          context.waitUntil(visitUpdate);
        } else {
          await visitUpdate;
        }
        return Response.redirect(linkData.original, settings.redirectCode === 301 ? 301 : 302);
      } else {
        return new Response(errorPageHtml({ code: '404', title: '链接不存在', message: '该短链接不存在或已被删除，请向分享者确认链接是否正确。' }), { status: 404, headers: HTML_HEADERS });
      }
    } catch (err) {
      console.error(`KV Error: ${err.message}`);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  // D. 处理主页 (生成器) - 需要鉴权
  if (!isAuthorized) {
      const finalLoginHtml = loginHtml.replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus));
      return new Response(finalLoginHtml, { headers: HTML_HEADERS, status: 200 });
  }

  // 注入二维码样式设置（管理后台「系统设置」页可改）；管理入口按 ADMIN_PATH 是否配置条件渲染
  const settings = await getSettings(DB);
  const finalIndexHtml = indexHtml
    .replace('__ADMIN_PATH_STATUS__', JSON.stringify(adminPathStatus))
    .replace('__QR_SETTINGS__', JSON.stringify(settings.qr || {}))
    .replace('__ADMIN_TOP_BUTTON__', adminPath ? ADMIN_BUTTON_HTML : '');

  return new Response(finalIndexHtml, {
      headers: HTML_HEADERS,
      status: 200
  });
}

// IP 指纹：哈希后落库，不存原始 IP
async function getClientIpHash(request) {
  const xf = request.headers.get('x-forwarded-for');
  const ip = (xf && xf.split(',')[0].trim()) || request.headers.get('EO-Client-IP') || 'unknown';
  return sha256(ip).then(h => h.slice(0, 16));
}
