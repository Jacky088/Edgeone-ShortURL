// tests/security-perf.test.js
// 安全与性能回归测试：口令修改（sha256 导入）、settings 短缓存、限流 key 哈希化、
// 保留字一致性、创建写频限流、links 瘦身 + 单条详情 + 截断标记、安全响应头。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as settingsHandler } from '../functions/api/settings/index.js';
import { onRequest as authHandler } from '../functions/api/auth/index.js';
import { onRequest as createHandler } from '../functions/api/create/index.js';
import { onRequest as linksHandler } from '../functions/api/links/index.js';
import { onRequest as updateHandler } from '../functions/api/update/index.js';
import {
  SETTINGS_KEY,
  getSettings,
  saveSettings,
  clearSettingsCache,
  generateSlug,
  isReservedSlug,
  jsonResponse,
  sha256
} from '../functions/utils.js';

function mockKV(store, opts = {}) {
  let getCount = 0;
  const kv = {
    get: async (k) => { getCount++; return (k in store ? store[k] : null); },
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async (listOptions = {}) => {
      if (opts.listImpl) return opts.listImpl(listOptions);
      return { keys: Object.keys(store).map(key => ({ key })), complete: true };
    }
  };
  kv.__getCount = () => getCount;
  kv.__resetCount = () => { getCount = 0; };
  return kv;
}

function authedEnv(store) {
  // 无口令部署：checkAdmin 要求 ADMIN_PATH + 会话，但无口令时 verifySessionWithRenewal 直接放行
  return { ADMIN_PATH: 'admin', my_kv: mockKV(store) };
}

function req(url, method, headers = {}, body) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(url, init);
}

// —— P0：修改口令不再崩溃（sha256 已导入），pwdVersion 自增 ——
test('settings：修改口令成功并使 pwdVersion 自增', async () => {
  const store = {};
  const env = authedEnv(store);
  const res = await settingsHandler({
    request: req('https://x/api/settings', 'POST', { 'X-Admin-Slug': 'admin' }, { password: 'newpass123' }),
    env
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.sessionInvalidated, true);
  assert.equal(data.hasCustomPassword, true);
  assert.equal(JSON.parse(store[SETTINGS_KEY]).pwdVersion, 1);
});

// —— settings 短缓存：命中时省 KV 读，save 后失效 ——
test('getSettings：短缓存命中省 KV 读，saveSettings 后失效', async () => {
  const store = {};
  const kv = mockKV(store);
  clearSettingsCache();
  await getSettings(kv);
  const first = kv.__getCount();
  assert.ok(first >= 1, '首次应读 KV');
  kv.__resetCount();
  await getSettings(kv);
  assert.equal(kv.__getCount(), 0, '缓存命中不应再读 KV');
  await saveSettings(kv, { sessionHours: 48 });
  kv.__resetCount();
  const after = await getSettings(kv);
  assert.equal(after.sessionHours, 48, 'save 后应读到新值');
  assert.ok(kv.__getCount() >= 1, 'save 后缓存失效，应重新读 KV');
  clearSettingsCache();
});

// —— 限流 key 哈希化：KV 中不应出现原始 IP ——
test('auth：限流 key 只存 IP 哈希，不存原始 IP', async () => {
  const store = {};
  const kv = mockKV(store);
  const env = { PASSWORD: 'secret', my_kv: kv };
  const bad = req('https://x/api/auth', 'POST', { 'x-forwarded-for': '203.0.113.7' }, { password: 'wrong' });
  const res = await authHandler({ request: bad, env });
  assert.equal(res.status, 401);
  assert.ok(!Object.keys(store).some(k => k.includes('203.0.113.7')), 'KV key 不应包含原始 IP');
  const rlKey = Object.keys(store).find(k => k.startsWith('rl:'));
  assert.ok(rlKey, '应写入哈希限流 key');
  assert.equal(rlKey, `rl:${await sha256('203.0.113.7')}`);
});

// —— 保留字一致性：update/delete/restore 同样拦截自定义保留字 ——
test('保留字一致性：自定义保留字在 update/delete/restore 生效', async () => {
  const store = {
    [SETTINGS_KEY]: JSON.stringify({ extraReserved: ['vip'] }),
    vip: JSON.stringify({ original: 'https://example.com/', visits: 0, createdAt: 1 })
  };
  const env = authedEnv(store);
  const h = { 'X-Admin-Slug': 'admin' };
  const u = await updateHandler({ request: req('https://x/api/update', 'POST', h, { slug: 'vip', note: 'x' }), env });
  assert.equal(u.status, 400, 'update 应拦截自定义保留字');
  const d = await (await import('../functions/api/delete/index.js')).onRequest({ request: req('https://x/api/delete', 'POST', h, { slug: 'vip' }), env });
  assert.equal(d.status, 400, 'delete 应拦截自定义保留字');
  const r = await (await import('../functions/api/restore/index.js')).onRequest({ request: req('https://x/api/restore', 'POST', h, { slug: 'vip' }), env });
  assert.equal(r.status, 400, 'restore 应拦截自定义保留字');
  assert.ok(isReservedSlug('crl:abc', '', []), 'crl: 内部前缀应保留');
});

// —— 创建写频限流：30 次/分钟后 429 ——
test('create：同一调用方 1 分钟超 30 次返回 429', async () => {
  const store = {};
  const env = authedEnv(store);
  const h = { 'Content-Type': 'application/json' };
  let last;
  for (let i = 0; i < 31; i++) {
    last = await createHandler({
      request: req('https://x/api/create', 'POST', h, { url: `https://example.com/${i}` }),
      env
    });
  }
  assert.equal(last.status, 429);
  assert.match((await last.json()).error, /频繁/);
});

// —— links 瘦身：默认不带 daily/ref/dev，detail=1 才带 ——
test('links：默认瘦身字段，detail=1 补齐聚合统计', async () => {
  const store = {
    s1: JSON.stringify({ original: 'https://example.com/', visits: 3, createdAt: 1, daily: { '2026-01-01': 2 }, ref: { 'a.com': 1 }, dev: { m: 1, d: 2 } })
  };
  const env = authedEnv(store);
  const h = { 'X-Admin-Slug': 'admin' };
  const slim = await (await linksHandler({ request: req('https://x/api/links', 'GET', h), env })).json();
  assert.equal(slim.length, 1);
  assert.equal(slim[0].daily, undefined, '默认不应携带 daily');
  assert.equal(slim[0].ref, undefined, '默认不应携带 ref');
  const fat = await (await linksHandler({ request: req('https://x/api/links?detail=1', 'GET', h), env })).json();
  assert.deepEqual(fat[0].daily, { '2026-01-01': 2 });
  assert.deepEqual(fat[0].dev, { m: 1, d: 2 });
});

// —— links 单条详情：?slug= 精确查询含聚合统计 ——
test('links：?slug= 精确查询单条详情', async () => {
  const store = {
    s9: JSON.stringify({ original: 'https://example.com/9', visits: 5, createdAt: 7, daily: { x: 1 }, ref: {}, dev: { m: 0, d: 5 } })
  };
  const env = authedEnv(store);
  const res = await linksHandler({ request: req('https://x/api/links?slug=s9', 'GET', { 'X-Admin-Slug': 'admin' }), env });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.slug, 's9');
  assert.equal(data.visits, 5);
  assert.deepEqual(data.dev, { m: 0, d: 5 });
  const missing = await linksHandler({ request: req('https://x/api/links?slug=nope', 'GET', { 'X-Admin-Slug': 'admin' }), env });
  assert.equal(missing.status, 404);
});

// —— links 截断标记：超 2000 条返回 { links, truncated } ——
test('links：超上限返回截断标记而非静默丢弃', async () => {
  // mockKV.list 不支持 limit/cursor 分页：用 listImpl 模拟「每轮返回 1000 key 且 complete=false」，
  // 验证服务端在 allKeys 达到 MAX_KEYS=2000 时停下并标记 truncated
  const bigStore = {};
  for (let i = 0; i < 2500; i++) bigStore[`b${i}`] = JSON.stringify({ original: `https://e.com/${i}`, visits: 0, createdAt: i });
  const allKeys = Object.keys(bigStore).map(key => ({ key }));
  const pagedKv = mockKV(bigStore, {
    listImpl: (opts = {}) => {
      const start = opts.cursor ? Number(opts.cursor) : 0;
      const slice = allKeys.slice(start, start + 1000);
      const next = start + 1000;
      return { keys: slice, cursor: next < allKeys.length ? String(next) : null, complete: next >= allKeys.length };
    }
  });
  const pagedEnv = { ADMIN_PATH: 'admin', my_kv: pagedKv };
  const res = await linksHandler({ request: req('https://x/api/links', 'GET', { 'X-Admin-Slug': 'admin' }), env: pagedEnv });
  const payload = await res.json();
  assert.ok(!Array.isArray(payload) && payload.truncated === true, '截断时应返回对象形态并标记 truncated');
  assert.ok(payload.links.length === 2000, `截断长度应为 2000，实际 ${payload.links.length}`);
});

// —— 安全响应头：JSON 与 404 页均携带 ——
test('安全头：jsonResponse 携带 no-store 与 nosniff', async () => {
  const res = jsonResponse({ ok: true });
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
});

// —— 静态资源兜底：带点路径被 Function 拦截时返回 200（线上曾出现 /app.css 400） ——
test('静态兜底：app.css/ui.js/qr-*.js 被 [slug] 路由拦截时返回静态内容', async () => {
  const fs = await import('node:fs');
  const { onRequest } = await import('../functions/[slug]/index.js');
  const cases = [
    ['app.css', 'public/app.css', 'text/css'],
    ['ui.js', 'public/ui.js', 'javascript'],
    ['qr-lib.js', 'public/qr-lib.js', 'javascript'],
    ['qr-draw.js', 'public/qr-draw.js', 'javascript']
  ];
  for (const [slug, file, typePart] of cases) {
    const res = await onRequest({ request: new Request(`https://x/${slug}`), params: { slug }, env: {} });
    assert.equal(res.status, 200, `/${slug} 应兜底 200`);
    assert.ok(res.headers.get('Content-Type').includes(typePart), `/${slug} Content-Type 应为 ${typePart}`);
    assert.ok(res.headers.get('Cache-Control').includes('immutable'), `/${slug} 应可长期缓存`);
    assert.equal(await res.text(), fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), `/${slug} 内容应与 public 一致`);
  }
  // 非法 slug 不应被兜底误伤：仍走短链校验（400）而非返回静态内容
  const bad = await onRequest({
    request: new Request('https://x/badslug!!'),
    params: { slug: 'badslug!!' },
    env: { ADMIN_PATH: '', my_kv: mockKV({}) }
  });
  assert.equal(bad.status, 400, '非法 slug 应仍返回 400');
});

// —— generateSlug：拒绝采样下长度稳定、无易混淆字符 ——
test('generateSlug：拒绝采样后长度稳定且字符集正确', () => {
  for (let i = 0; i < 50; i++) {
    const s = generateSlug({ slug: { length: 8, charset: 'safe' } });
    assert.equal(s.length, 8);
    assert.match(s, /^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
  }
});
