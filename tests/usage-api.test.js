// tests/usage-api.test.js
// /api/usage 存储用量统计测试：分类计数、活跃/回收站区分、字节累加、
// 缓存语义（GET 读缓存 / POST 全量扫描）、partial 截断、鉴权。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest, runUsageScan } from '../functions/api/usage/index.js';

// 内存 KV：list 与 local-serve / EdgeOne 语义一致（cursor 分页 + complete）
function mockKV(store, pageSize) {
  return {
    __store: store,
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async (opts = {}) => {
      const keys = Object.keys(store).map((key) => ({ key }));
      const limit = pageSize || (opts.limit > 0 ? Math.min(1000, opts.limit) : 1000);
      let start = 0;
      if (opts.cursor) start = Number(opts.cursor) || 0;
      const slice = keys.slice(start, start + limit);
      const next = start + limit;
      return { keys: slice, cursor: next < keys.length ? String(next) : null, complete: next >= keys.length };
    }
  };
}

function call(store, { method = 'GET', headers = {} } = {}, envExtra = {}) {
  const env = Object.assign({ ADMIN_PATH: 'admin', my_kv: store.__kv || mockKV(store) }, envExtra);
  return onRequest({
    request: new Request('https://x/api/usage', { method, headers }),
    env
  });
}

function seed() {
  const store = {};
  store.alpha = JSON.stringify({ original: 'https://a.example/1', visits: 5, createdAt: 1 });
  store.beta = JSON.stringify({ original: 'https://b.example/2', visits: 0, createdAt: 2, note: '备注' });
  store.gamma = JSON.stringify({ original: 'https://c.example/3', visits: 1, createdAt: 3, daily: {} });
  store.gone = JSON.stringify({ original: 'https://d.example/4', visits: 2, createdAt: 4, deletedAt: 100 });
  store['hash:abc'] = 'alpha';
  store['sess:0123abcd0123abcd'] = JSON.stringify({ exp: Date.now() + 1000 });
  store['rl:1:ff'] = JSON.stringify({ ts: 1, count: 1 });
  store['cfg:settings'] = JSON.stringify({ slug: { length: 8 } });
  store['dc:20260929:aa'] = JSON.stringify({ count: 2 });
  store.visitCount = '7';
  return store;
}

test('usage API：未统计时 GET 返回 scannedAt=0，未鉴权返回 401', async () => {
  const store = {};
  const res = await call(store, { headers: { 'X-Admin-Slug': 'admin' } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.scannedAt, 0, '从未统计时应返回 scannedAt=0');

  const deny = await call(seed(), { headers: {} }, { ADMIN_PATH: 'admin' });
  assert.equal(deny.status, 401, '缺少 X-Admin-Slug 头应 401');
});

test('usage API：POST 全量扫描——分类计数、活跃/回收站、字节累加', async () => {
  const store = seed();
  const res = await call(store, { method: 'POST', headers: { 'X-Admin-Slug': 'admin' } });
  assert.equal(res.status, 200);
  const u = await res.json();

  assert.equal(u.activeLinks, 3, '3 条活跃短链');
  assert.equal(u.trashLinks, 1, '1 条回收站短链（deletedAt）');
  assert.equal(u.badKeys, 0);
  // 系统键：hash 1 + sess 1 + rl 1 + cfg 1 + dc 1 + legacy(visitCount) 1 = 6
  assert.equal(u.systemKeys, 6);
  assert.equal(u.systemBreakdown.hash, 1);
  assert.equal(u.systemBreakdown.cfg, 1);
  assert.equal(u.systemBreakdown.legacy, 1);
  assert.equal(u.totalKeys, 10, '4 短链 + 6 系统键');
  assert.ok(u.partial === false, '量小应完整扫描');
  assert.ok(u.linkBytes > 0, '字节应累加');
  // 字节精确校验：短链键+值（不含系统键）的 UTF-8 字节和
  let expect = 0;
  for (const k of ['alpha', 'beta', 'gamma', 'gone']) expect += Buffer.byteLength(k) + Buffer.byteLength(store[k]);
  assert.equal(u.linkBytes, expect, '字节 = 短链键+值 UTF-8 字节，不含系统键');
  assert.ok(u.durationMs >= 0);
  assert.ok(u.scannedAt <= Date.now());

  // 缓存：写入了 cfg:usage，再次 GET 返回同一份结果
  const cached = await (await call(store, { headers: { 'X-Admin-Slug': 'admin' } })).json();
  assert.equal(cached.scannedAt, u.scannedAt, 'GET 应返回缓存的统计结果');
  assert.equal(cached.activeLinks, 3);
});

test('usage API：非短链 JSON 值计入异常键，字节省略', async () => {
  const store = { ok: JSON.stringify({ original: 'https://a.example/1' }), junk: 'not-json' };
  const u = await (await call(store, { method: 'POST', headers: { 'X-Admin-Slug': 'admin' } })).json();
  assert.equal(u.activeLinks, 1);
  assert.equal(u.badKeys, 1, '无法解析的键应单列不崩溃');
  assert.equal(u.totalKeys, 2);
});

test('runUsageScan：maxKeys 截断标记 partial，翻页 cursor 生效', async () => {
  const store = seed();
  const kv = mockKV(store, 3); // 每页 3 键，强制多页翻页
  const u = await runUsageScan(kv, { maxKeys: 5, adminPath: 'admin' });
  assert.equal(u.partial, true, '超过 maxKeys 应标记部分统计');
  assert.equal(u.totalKeys, 5, '只统计到上限为止');
  // 不设上限时应翻完所有页
  const full = await runUsageScan(mockKV(store, 3), { adminPath: 'admin' });
  assert.equal(full.totalKeys, 10);
  assert.equal(full.partial, false);
});
