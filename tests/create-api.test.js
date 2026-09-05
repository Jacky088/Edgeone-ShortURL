// tests/create-api.test.js
// /api/create 批量 items 形态测试：逐条自定义短链 / 备注、index 定位、共享选项。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/create/index.js';

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
  assert.equal(data.results[1].note, undefined);
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
