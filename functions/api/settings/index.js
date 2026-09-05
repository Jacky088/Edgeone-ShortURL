// functions/api/settings/index.js
// 运行时设置：管理后台「系统设置」页读写，保存在 KV 的 cfg:settings，即时生效。

import { jsonResponse, getKV, getSettings, saveSettings, checkAdmin, isValidSlug } from '../../utils.js';

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeHostList(input) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const out = [];
  for (const item of input) {
    const domain = String(item || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    // 仅接受合法主机名（允许通配子域语义：条目本身即主域名）
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(domain)) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);
    out.push(domain);
    if (out.length >= 50) break;
  }
  return out;
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await checkAdmin(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET') {
    const settings = await getSettings(DB);
    // 口令哈希不回传前端，只暴露是否已设置自定义口令
    const { passwordHash, ...publicSettings } = settings;
    return jsonResponse({ ...publicSettings, hasCustomPassword: !!passwordHash });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const settings = await getSettings(DB);
  const patch = {};
  const errors = [];

  // 口令：非空 = 设置新口令（哈希存储 + 会话版本自增使旧会话失效）；clearPassword = 恢复环境变量口令
  if (typeof body.password === 'string' && body.password.length > 0) {
    const pwd = body.password;
    if (pwd.length < 4 || pwd.length > 64) {
      errors.push('自定义口令长度需在 4-64 位之间');
    } else {
      patch.passwordHash = await sha256(pwd);
      patch.pwdVersion = (settings.pwdVersion || 0) + 1;
    }
  }
  if (body.clearPassword === true) {
    patch.passwordHash = '';
    patch.pwdVersion = (settings.pwdVersion || 0) + 1;
  }

  if (body.sessionHours !== undefined) {
    patch.sessionHours = clampInt(body.sessionHours, 1, 720, 24);
  }
  if (body.rateLimit && typeof body.rateLimit === 'object') {
    patch.rateLimit = {
      max: clampInt(body.rateLimit.max, 1, 100, 5),
      windowMin: clampInt(body.rateLimit.windowMin, 1, 1440, 10)
    };
  }
  if (body.slug && typeof body.slug === 'object') {
    patch.slug = {
      length: clampInt(body.slug.length, 4, 16, 8),
      charset: body.slug.charset === 'full' ? 'full' : 'safe'
    };
  }
  if (body.dedupHash !== undefined) patch.dedupHash = body.dedupHash === true;
  if (body.redirectCode !== undefined) {
    patch.redirectCode = body.redirectCode === 301 ? 301 : 302;
  }
  if (body.domainWhitelist !== undefined) {
    const list = normalizeHostList(body.domainWhitelist);
    if (list === null) errors.push('域名白名单格式不正确');
    else patch.domainWhitelist = list;
  }
  if (body.dailyCreateLimit !== undefined) {
    patch.dailyCreateLimit = clampInt(body.dailyCreateLimit, 0, 10000, 0);
  }
  if (body.extraReserved !== undefined) {
    if (!Array.isArray(body.extraReserved)) {
      errors.push('保留字列表格式不正确');
    } else {
      const list = [];
      for (const item of body.extraReserved) {
        const slug = String(item || '').trim();
        if (slug && isValidSlug(slug) && !list.includes(slug)) list.push(slug);
        if (list.length >= 100) break;
      }
      patch.extraReserved = list;
    }
  }
  if (body.dedupMin !== undefined) {
    patch.dedupMin = clampInt(body.dedupMin, 0, 1440, 0);
  }
  if (body.qr && typeof body.qr === 'object') {
    patch.qr = {
      centerLogo: body.qr.centerLogo === true,
      dark: /^#[0-9a-fA-F]{6}$/.test(String(body.qr.dark || '')) ? body.qr.dark : '#16181d'
    };
    // 自定义中心 Logo：空串 = 恢复默认（网站 Logo）；否则仅接受 base64 图片且限制大小
    if (body.qr.logoDataUrl !== undefined) {
      const logo = String(body.qr.logoDataUrl || '');
      if (logo === '') {
        patch.qr.logoDataUrl = '';
      } else if (/^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(logo) && logo.length <= 150000) {
        patch.qr.logoDataUrl = logo;
      } else {
        errors.push('Logo 图片不合法（仅支持 PNG/JPG/WebP/SVG，且不超过 110KB）');
      }
    }
  }

  if (errors.length) {
    return jsonResponse({ error: errors.join('；') }, 400);
  }

  const saved = await saveSettings(DB, patch);
  const { passwordHash, ...publicSettings } = saved;
  return jsonResponse({
    ...publicSettings,
    hasCustomPassword: !!passwordHash,
    // 口令变更后所有旧会话立即失效，前端据此引导重新登录
    sessionInvalidated: patch.pwdVersion !== undefined
  });
}
