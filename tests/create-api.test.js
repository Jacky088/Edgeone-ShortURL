// tests/create-api.test.js
// /api/create 批量 items 形态测试：逐条自定义短链 / 备注、index 定位、共享选项。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/create/index.js';
import { sha256 } from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: Object.keys(store).map(key => ({ key })), complete: true })
  };
}

function call(store, payload) {
  const env = { ADMIN_PATH: 'admin', my_kv: mockKV(store) };
  return onRequest({
    request: new Request('https://x/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    env
  });
}

test('create API：items 批量支持逐条自定义短链与备注', async () => {
  const store = {};
  const res = await call(store, {
    items: [
      { url: 'https://a.example/one', slug: 'alpha', note: '第一条' },
      { url: 'https://b.example/two' }
    ],
    ttlDays: 7
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.results.length, 2);
  assert.equal(data.errors.length, 0);
  assert.equal(data.results[0].index, 0);
  assert.equal(data.results[0].slug, 'alpha');
  assert.equal(data.results[0].note, '第一条');
  assert.ok(data.results[0].expiresAt > Date.now(), '共享有效期应应用到位');
  assert.ok(data.results[1].slug, '未指定 slug 的行应随机生成');
  assert.equal(data.results[1].note, '', '未提供备注时返回空串（与 links 列表瘦身字段一致）');
  // 创建响应只含瘦身字段，不泄露 daily/ref/dev/ipd 聚合统计
  assert.equal(data.results[1].daily, undefined, '创建响应不应携带 daily 统计');
  assert.equal(data.results[1].pwdHash, undefined, '创建响应不应回传密码哈希');
});

test('create API：重复自定义短链按行报错（index 定位），其余行正常创建', async () => {
  const store = { alpha: JSON.stringify({ original: 'https://x.example/taken', visits: 0, createdAt: 1 }) };
  const res = await call(store, {
    items: [
      { url: 'https://a.example/one', slug: 'alpha' },
      { url: 'https://b.example/two', slug: 'beta' }
    ]
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.errors.length, 1);
  assert.equal(data.errors[0].index, 0);
  assert.match(data.errors[0].error, /已被占用/);
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].index, 1);
  assert.equal(data.results[0].slug, 'beta');
});

test('create API：urls 旧形态仍然兼容（共享备注，无逐条 slug）', async () => {
  const store = {};
  const res = await call(store, { urls: ['https://a.example/1', 'https://b.example/2'], note: '活动' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.results.length, 2);
  assert.equal(data.results[0].note, '活动');
  assert.equal(data.results[1].note, '活动');
});

test('create API：无效行按行报错，有效行照常生成（部分成功）', async () => {
  const store = {};
  const res = await call(store, { items: [{ url: 'not-a-url' }, { url: 'https://b.example/ok', slug: 'ok-row' }] });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.errors.length, 1);
  assert.equal(data.errors[0].index, 0);
  assert.match(data.errors[0].error, /链接格式不正确/);
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].index, 1);
});

test('create API：缺少目标链接按行报错，其余行正常', async () => {
  const store = {};
  const res = await call(store, { items: [{ url: 'https://a.example/ok' }, { slug: 'only-slug', note: '缺链接' }] });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.errors.length, 1);
  assert.equal(data.errors[0].index, 1);
  assert.match(data.errors[0].error, /缺少目标链接/);
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].index, 0);
});

test('create API：超过 20 条拒绝', async () => {
  const store = {};
  const items = Array.from({ length: 21 }, (_, i) => ({ url: 'https://x.example/' + i }));
  const res = await call(store, { items });
  assert.equal(res.status, 400);
});

// ---------- 长链重复校验（不修改不得创建） ----------

test('create API：长链已存在（非 dedup 场景）返回 409 conflicts，不创建', async () => {
  // 已有短链 beta 指向该长链；批量形态不走 dedup 复用 → 必须拒绝
  const url = 'https://a.example/one';
  const store = {
    beta: JSON.stringify({ original: url, visits: 0, createdAt: 1 }),
    ['hash:' + await sha256(url)]: 'beta'
  };
  const res = await call(store, { items: [{ url, slug: 'newone' }] });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.conflict, true);
  assert.equal(data.conflicts.length, 1);
  assert.equal(data.conflicts[0].type, 'url');
  assert.equal(data.conflicts[0].existingSlug, 'beta');
  // 未创建任何行
  assert.ok(!store.newone, '冲突时不得写入新短链');
});

test('create API：同批次内长链互重返回 409（批内互查），不创建', async () => {
  const store = {};
  const res = await call(store, {
    items: [
      { url: 'https://same.example/x', slug: 'first' },
      { url: 'https://same.example/x', slug: 'second' }
    ]
  });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.conflicts.length, 1);
  assert.ok(data.conflicts[0].firstIndex === 0, '应指出与第 1 行重复');
  assert.ok(!store.first && !store.second, '冲突时整单不创建');
});

test('create API：单条未指定短链 + dedup 开启时复用现有短链（不算冲突）', async () => {
  const url = 'https://reuse.example/a';
  const store = {
    old: JSON.stringify({ original: url, visits: 3, createdAt: 1 }),
    ['hash:' + await sha256(url)]: 'old'
  };
  const res = await call(store, { url });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.slug, 'old');
  assert.equal(data.deduped, true, '应走 dedup 复用而非冲突');
});

test('create API：单条指定了自定义短链时即使长链重复也拒绝（dedup 不适用）', async () => {
  const url = 'https://reuse.example/a';
  const store = {
    old: JSON.stringify({ original: url, visits: 0, createdAt: 1 }),
    ['hash:' + await sha256(url)]: 'old'
  };
  const res = await call(store, { url, slug: 'mine' });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.conflict, true);
  assert.ok(!store.mine, '冲突时不得写入');
});

test('create API：回收站中的同长链不算冲突（deletedAt 跳过）', async () => {
  const url = 'https://trash.example/a';
  const store = {
    trashed: JSON.stringify({ original: url, visits: 0, createdAt: 1, deletedAt: 2 }),
    ['hash:' + await sha256(url)]: 'trashed'
  };
  const res = await call(store, { items: [{ url, slug: 'fresh' }] });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].slug, 'fresh');
});
