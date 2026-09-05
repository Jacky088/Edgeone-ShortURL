// functions/api/create/index.js
// 创建短链：支持单条与批量（urls 数组，最多 20 条），支持可选的
// 有效期（ttlDays）/ 次数上限（maxVisits）/ 访问密码（password）/ 备注（note）。
// slug 生成策略、URL 去重、域名白名单、每 IP 每日创建上限均来自运行时设置。

import {
  jsonResponse, getKV, isAllowedUrl, isValidSlug, isReservedSlug,
  getSettings, generateSlug, isHostAllowed, getClientIp,
  sha256, checkCreateAuth
} from '../../utils.js';

const MAX_BATCH = 20;

function parsePositiveInt(value, max) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) return undefined; // undefined 表示非法
  return n;
}

function normalizeNote(value) {
  if (value === undefined || value === null) return null;
  const note = String(value).trim().slice(0, 100);
  return note || null;
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) {
    console.error('KV binding not found in /api/create');
    return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);
  }

  if (!(await checkCreateAuth(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized: session expired or invalid password' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON data' }, 400);
  }

  const settings = await getSettings(DB);
  const adminPath = env.ADMIN_PATH;

  // 统一待创建列表：三种形态（按优先级）
  //   items: [{ url, slug?, note? }]  批量逐条（支持逐条自定义短链与备注）
  //   urls:  [url, ...]               批量（共享选项，不支持自定义短链）
  //   url:   单条（支持自定义短链与备注）
  const isBatch = Array.isArray(body.items) || Array.isArray(body.urls);
  let entries = [];
  if (Array.isArray(body.items)) {
    if (body.items.length > MAX_BATCH) return jsonResponse({ error: `批量创建一次最多 ${MAX_BATCH} 条` }, 400);
    entries = body.items.map(it => ({
      url: String((it && it.url) || '').trim(),
      slug: it && typeof it.slug === 'string' ? it.slug.trim() : '',
      note: normalizeNote(it && it.note)
    }));
  } else if (Array.isArray(body.urls)) {
    if (body.urls.length > MAX_BATCH) return jsonResponse({ error: `批量创建一次最多 ${MAX_BATCH} 条` }, 400);
    entries = body.urls.map(u => ({ url: String(u || '').trim(), slug: '', note: normalizeNote(body.note) }));
  } else {
    entries = [{ url: String(body.url || '').trim(), slug: typeof body.slug === 'string' ? body.slug.trim() : '', note: normalizeNote(body.note) }];
  }
  if (!entries.length) {
    return jsonResponse({ error: 'URL is required' }, 400);
  }
  const sharedNote = normalizeNote(body.note);

  // 选项校验（对单条与批量统一生效）
  const expiresAt = body.ttlDays !== undefined && body.ttlDays !== null && body.ttlDays !== 0
    ? Date.now() + parsePositiveInt(body.ttlDays, 3650) * 86400000
    : (body.expiresAt ? Date.now() + parsePositiveInt(body.expiresAt, 3650) * 86400000 : null);
  if (body.ttlDays !== undefined && body.ttlDays !== null && body.ttlDays !== 0
      && parsePositiveInt(body.ttlDays, 3650) === undefined) {
    return jsonResponse({ error: '有效期不合法（1-3650 天）' }, 400);
  }
  let maxVisits = null;
  if (body.maxVisits !== undefined && body.maxVisits !== null && body.maxVisits !== '') {
    maxVisits = parsePositiveInt(body.maxVisits, 1000000000);
    if (maxVisits === undefined) return jsonResponse({ error: '次数上限不合法' }, 400);
  }
  let pwdHash = null;
  if (body.password) {
    const pwd = String(body.password);
    if (pwd.length < 4 || pwd.length > 64) {
      return jsonResponse({ error: '访问密码长度需在 4-64 位之间' }, 400);
    }
    pwdHash = await sha256(pwd);
  }
  const note = normalizeNote(body.note);

  // 每 IP 每日创建上限（0 = 不限）；单 key 复用，按日期重置
  const ip = getClientIp(request);
  let createdToday = 0;
  if (settings.dailyCreateLimit > 0) {
    const ipHash = await sha256(ip);
    const raw = await DB.get(`dc:${ipHash}`).catch(() => null);
    let counter = { date: '', count: 0 };
    try { if (raw) counter = JSON.parse(raw); } catch (e) {}
    const today = new Date().toISOString().slice(0, 10);
    if (counter.date !== today) counter = { date: today, count: 0 };
    if (counter.count + entries.length > settings.dailyCreateLimit) {
      return jsonResponse({ error: `已达每日创建上限（${settings.dailyCreateLimit} 条/天）` }, 429);
    }
    createdToday = entries.length;
    counter.count += entries.length;
    // 先落计数再创建，避免并发突破限额；创建失败造成的少量空耗可接受
    await DB.put(`dc:${ipHash}`, JSON.stringify(counter)).catch(() => {});
  }

  const results = [];
  const errors = [];

  for (const [index, entry] of entries.entries()) {
    const url = entry.url;

    // 无效行按行报错（index 定位），有效行照常生成（部分成功语义）
    if (!url) {
      errors.push({ index, url, error: '缺少目标链接' });
      continue;
    }
    if (!isAllowedUrl(url)) {
      errors.push({ index, url, error: '链接格式不正确，请以 http/https 开头' });
      continue;
    }
    if (!isHostAllowed(url, settings.domainWhitelist)) {
      errors.push({ index, url, error: `目标域名不在白名单内：${new URL(url).hostname}` });
      continue;
    }
    const urlHash = await sha256(url);

    // URL 去重（运行时设置开关）：相同长链接复用同一短链（仅单条且未指定自定义短链时）
    if (settings.dedupHash && !isBatch && !entry.slug) {
      const existingSlug = await DB.get(`hash:${urlHash}`).catch(() => null);
      if (existingSlug) {
        const existingLinkData = await DB.get(existingSlug).catch(() => null);
        if (existingLinkData) {
          try {
            const parsed = JSON.parse(existingLinkData);
            if (parsed.original && !parsed.deletedAt) {
              results.push({ index, slug: existingSlug, deduped: true, ...parsed });
              continue;
            }
          } catch (e) {}
        }
      }
    }

    let slug = entry.slug;

    if (slug) {
      if (isReservedSlug(slug, adminPath, settings.extraReserved)) {
        errors.push({ index, url, error: '该自定义短链不可用（保留字）' });
        continue;
      }
      if (!isValidSlug(slug)) {
        errors.push({ index, url, error: '自定义短链仅可使用字母、数字、短横线、下划线，最长 64 位' });
        continue;
      }
      const existing = await DB.get(slug).catch(() => null);
      if (existing) {
        errors.push({ index, url, error: '该自定义短链已被占用' });
        continue;
      }
    } else {
      let found = false;
      for (let attempts = 0; attempts < 10 && !found; attempts++) {
        const candidate = generateSlug(settings);
        if (isReservedSlug(candidate, adminPath, settings.extraReserved)) continue;
        const existing = await DB.get(candidate).catch(() => null);
        if (!existing) {
          slug = candidate;
          found = true;
        }
      }
      if (!found) {
        errors.push({ index, url, error: '生成短链失败，请重试' });
        continue;
      }
    }

    const linkData = { original: url, visits: 0, createdAt: Date.now() };
    if (expiresAt) linkData.expiresAt = expiresAt;
    if (maxVisits) linkData.maxVisits = maxVisits;
    if (pwdHash) linkData.pwdHash = pwdHash;
    const itemNote = entry.note || sharedNote;
    if (itemNote) linkData.note = itemNote;

    const ops = [DB.put(slug, JSON.stringify(linkData))];
    if (settings.dedupHash) ops.push(DB.put(`hash:${urlHash}`, slug));
    await Promise.all(ops);

    results.push({ index, slug, ...linkData });
  }

  // 全部失败：回滚今日计数，避免失败请求占用额度
  if (settings.dailyCreateLimit > 0 && createdToday > 0 && !results.length) {
    const ipHash = await sha256(ip);
    const raw = await DB.get(`dc:${ipHash}`).catch(() => null);
    try {
      if (raw) {
        const counter = JSON.parse(raw);
        counter.count = Math.max(0, counter.count - createdToday);
        await DB.put(`dc:${ipHash}`, JSON.stringify(counter));
      }
    } catch (e) {}
  }

  if (isBatch) {
    return jsonResponse({ results, errors });
  }
  if (!results.length) {
    return jsonResponse({ error: (errors[0] && errors[0].error) || '创建失败' }, 400);
  }
  return jsonResponse(results[0]);
}
