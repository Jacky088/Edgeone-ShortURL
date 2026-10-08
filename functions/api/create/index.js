// functions/api/create/index.js
// 创建短链：支持单条与批量（urls 数组，最多 20 条），支持可选的
// 有效期（ttlDays）/ 次数上限（maxVisits）/ 访问密码（password）/ 备注（note）。
// slug 生成策略、URL 去重、域名白名单、每 IP 每日创建上限均来自运行时设置。

import {
  jsonResponse, getKV, isAllowedUrl, isValidSlug, isReservedSlug, USAGE_KEY,
  getSettings, generateSlug, isHostAllowed, getClientIp,
  sha256, checkCreateAuth, windowedKey
} from '../../utils.js';

const MAX_BATCH = 20;
const RATE_LIMIT_PER_MIN = 30;
const RATE_LIMIT_WINDOW_MS = 60000;

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

  // 分钟级写频限流（防会话/Token 被盗刷：同一调用方 30 次/分钟；key 只存哈希，不存原始 IP/Token）
  // 键名带分钟桶，历史桶键在写当前键前被顺手清理，键空间不随时间累积
  const rlSubject = request.headers.get('X-API-Token') || ('ip:' + getClientIp(request));
  const rlHash = await sha256(rlSubject);
  const nowMs = Date.now();
  const rlKey = windowedKey('crl:', rlHash, RATE_LIMIT_WINDOW_MS, nowMs);
  try {
    for (const delta of [1, 2]) {
      const oldBucketKey = `crl:${Math.floor(nowMs / RATE_LIMIT_WINDOW_MS) - delta}:${rlHash}`;
      await DB.delete(oldBucketKey).catch(() => {});
    }
    const rlRaw = await DB.get(rlKey).catch(() => null);
    let rlState = { ts: nowMs, count: 0 };
    try { if (rlRaw) rlState = JSON.parse(rlRaw); } catch (e) {}
    if (nowMs - rlState.ts >= RATE_LIMIT_WINDOW_MS) rlState = { ts: nowMs, count: 0 };
    if (rlState.count >= RATE_LIMIT_PER_MIN) {
      const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (nowMs - rlState.ts)) / 1000));
      return jsonResponse({ error: '创建过于频繁，请稍后再试' }, 429, { 'Retry-After': String(retryAfterSec) });
    }
    rlState.count += 1;
    await DB.put(rlKey, JSON.stringify(rlState)).catch(() => {});
  } catch (e) {}

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

  // 选项校验（对单条与批量统一生效）：有效期统一用 ttlDays（1-3650 天）
  if (body.expiresAt !== undefined) {
    return jsonResponse({ error: '有效期请使用 ttlDays（1-3650 天）' }, 400);
  }
  const ttlDays = parsePositiveInt(body.ttlDays, 3650);
  if (body.ttlDays !== undefined && body.ttlDays !== null && body.ttlDays !== 0 && ttlDays === undefined) {
    return jsonResponse({ error: '有效期不合法（1-3650 天）' }, 400);
  }
  const expiresAt = ttlDays ? Date.now() + ttlDays * 86400000 : null;
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
  // 键名带日期桶（dc:<yyyymmdd>:<ipHash>），跨天后旧键离开读取路径并被顺手清理
  const ip = getClientIp(request);
  let createdToday = 0;
  if (settings.dailyCreateLimit > 0) {
    const ipHash = await sha256(ip);
    const today = new Date().toISOString().slice(0, 10);
    const dcKey = `dc:${today.replace(/-/g, '')}:${ipHash}`;
    const raw = await DB.get(dcKey).catch(() => null);
    let counter = { count: 0 };
    try { if (raw) counter = JSON.parse(raw); } catch (e) {}
    // 清理昨天（更早的键不再追溯：每日首次请求只多一次 delete 开销）
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    await DB.delete(`dc:${yesterday}:${ipHash}`).catch(() => {});
    if ((counter.count || 0) + entries.length > settings.dailyCreateLimit) {
      return jsonResponse({ error: `已达每日创建上限（${settings.dailyCreateLimit} 条/天）` }, 429, { 'Retry-After': '86400' });
    }
    createdToday = entries.length;
    counter.count = (counter.count || 0) + entries.length;
    // 先落计数再创建，避免并发突破限额；创建失败造成的少量空耗可接受
    await DB.put(dcKey, JSON.stringify(counter)).catch(() => {});
  }

  const results = [];
  const errors = [];
  // 长链重复预检：任何模式（单条/批量）下，目标长链已存在（活跃短链指向它）且本次
  // 不会走 dedup 复用时，阻止创建并返回 conflicts，由前端弹窗提醒用户修改。
  // 修改后（换链接或换短链）重新提交才可能创建——「不修改不得创建」。
  const urlHashesSeen = new Map(); // 本批次内 url -> 首次出现的 index（批量内部互查）
  const conflicts = [];
  if (!entries.some(e => !e.url)) {
    for (const [index, entry] of entries.entries()) {
      if (!isAllowedUrl(entry.url)) continue;
      const urlHash = await sha256(entry.url);
      // 批内互查：同一次提交里出现相同长链（且都会真实创建）也算重复
      if (urlHashesSeen.has(urlHash)) {
        conflicts.push({ index, url: entry.url, type: 'url', existingSlug: null, firstIndex: urlHashesSeen.get(urlHash) });
        continue;
      }
      urlHashesSeen.set(urlHash, index);
      const existingSlug = await DB.get(`hash:${urlHash}`).catch(() => null);
      if (!existingSlug) continue;
      const existingRaw = await DB.get(existingSlug).catch(() => null);
      try {
        const parsed = existingRaw ? JSON.parse(existingRaw) : null;
        if (parsed && parsed.original && !parsed.deletedAt) {
          // dedup 复用场景（单条+未指定短链+开关开）不算冲突：服务端会复用现有短链
          if (!(settings.dedupHash && !isBatch && !entry.slug)) {
            conflicts.push({ index, url: entry.url, type: 'url', existingSlug });
          }
        }
      } catch (e) {}
    }
  }
  // 任何冲突：整单拒绝，不创建任何行（「不修改不得创建」）
  if (conflicts.length) {
    if (settings.dailyCreateLimit > 0 && createdToday > 0) {
      const ipHash = await sha256(ip);
      const dcKey = `dc:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}:${ipHash}`;
      const raw = await DB.get(dcKey).catch(() => null);
      try {
        if (raw) {
          const counter = JSON.parse(raw);
          counter.count = Math.max(0, (counter.count || 0) - createdToday);
          await DB.put(dcKey, JSON.stringify(counter));
        }
      } catch (e) {}
    }
    return jsonResponse({ conflict: true, conflicts }, 409);
  }

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

    // URL 去重（运行时设置开关）：相同长链接复用同一短链（仅单条且未指定自定义短链时）。
    // 命中时只返回瘦身字段（与 /api/links 列表一致）：完整的 daily/ref/dev/ipd 统计
    // 属于管理侧数据，不能随创建响应泄露给任何持有创建权限的调用方。
    if (settings.dedupHash && !isBatch && !entry.slug) {
      const existingSlug = await DB.get(`hash:${urlHash}`).catch(() => null);
      if (existingSlug) {
        const existingLinkData = await DB.get(existingSlug).catch(() => null);
        if (existingLinkData) {
          try {
            const parsed = JSON.parse(existingLinkData);
            if (parsed.original && !parsed.deletedAt) {
              results.push({
                index,
                slug: existingSlug,
                deduped: true,
                original: parsed.original,
                visits: parsed.visits || 0,
                createdAt: parsed.createdAt || 0,
                note: parsed.note || '',
                expiresAt: parsed.expiresAt || 0,
                maxVisits: parsed.maxVisits || 0,
                hasPassword: !!parsed.pwdHash
              });
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

    // 自定义短链并发竞态兜底：写入后回读校验归属。KV last-write-wins 下，
    // 两个并发同名创建都可能「检查不存在→写入」成功，回读发现内容不是自己的即判失败
    if (entry.slug) {
      const written = await DB.get(slug).catch(() => null);
      try {
        if (!written || JSON.parse(written).original !== url) {
          errors.push({ index, url, error: '该自定义短链已被占用（并发创建）' });
          continue;
        }
      } catch (e) {}
    }

    results.push({
      index, slug,
      original: linkData.original,
      visits: 0,
      createdAt: linkData.createdAt,
      note: linkData.note || '',
      expiresAt: linkData.expiresAt || 0,
      maxVisits: linkData.maxVisits || 0,
      hasPassword: !!linkData.pwdHash
    });
  }

  // 全部失败：回滚今日计数，避免失败请求占用额度
  if (settings.dailyCreateLimit > 0 && createdToday > 0 && !results.length) {
    const ipHash = await sha256(ip);
    const dcKey = `dc:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}:${ipHash}`;
    const raw = await DB.get(dcKey).catch(() => null);
    try {
      if (raw) {
        const counter = JSON.parse(raw);
        counter.count = Math.max(0, (counter.count || 0) - createdToday);
        await DB.put(dcKey, JSON.stringify(counter));
      }
    } catch (e) {}
  }

  // 数据已变更：失效存储用量缓存（设置页打开时检测到无缓存会自动补扫）
  await DB.delete(USAGE_KEY).catch(() => {});
  if (isBatch) {
    return jsonResponse({ results, errors });
  }
  if (!results.length) {
    return jsonResponse({ error: (errors[0] && errors[0].error) || '创建失败' }, 400);
  }
  return jsonResponse(results[0]);
}
