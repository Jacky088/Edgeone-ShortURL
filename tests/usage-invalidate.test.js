// tests/usage-invalidate.test.js
// 存储用量缓存失效链路：创建 / 删除 / 恢复 / 编辑（含批量）成功后，
// cfg:usage 缓存应被失效（删除），设置页下次打开时据此自动补扫。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as usageHandler } from '../functions/api/usage/index.js';
import { onRequest as createHandler } from '../functions/api/create/index.js';
import { onRequest as deleteHandler } from '../functions/api/delete/index.js';
import { onRequest as restoreHandler } from '../functions/api/restore/index.js';
import { onRequest as updateHandler } from '../functions/api/update/index.js';

function makeEnv() {
  const store = {};
  const kv = {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: Object.keys(store).map((key) => ({ key })), complete: true })
  };
  return { store, env: { ADMIN_PATH: 'admin', my_kv: kv } };
}

function call(handler, env, path, method, body) {
  return handler({
    request: new Request('https://x' + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Slug': 'admin' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    env
  });
}

test('usage 缓存失效：创建/删除/恢复/编辑成功后缓存被删除', async () => {
  const { store, env } = makeEnv();
  const H = undefined;
  // 1) 创建（带自定义 slug 走成功路径）→ 缓存应失效
  assert.equal((await call(createHandler, env, '/api/create', 'POST', { url: 'https://a.example/1', slug: 'alpha' })).status, 200);
  assert.ok(!('cfg:usage' in store), '创建后缓存应被失效');
  // 2) 手动统计一次 → 缓存存在
  assert.equal((await call(usageHandler, env, '/api/usage', 'POST')).status, 200);
  assert.ok('cfg:usage' in store, 'POST 后应有缓存');
  // 3) 编辑（改备注，不影响条数但影响字节）→ 失效
  assert.equal((await call(updateHandler, env, '/api/update', 'POST', { slug: 'alpha', note: '备注' })).status, 200);
  assert.ok(!('cfg:usage' in store), '编辑后缓存应被失效');
  // 4) 软删除 → 失效
  await call(usageHandler, env, '/api/usage', 'POST');
  assert.equal((await call(deleteHandler, env, '/api/delete', 'POST', { slug: 'alpha' })).status, 200);
  assert.ok(!('cfg:usage' in store), '删除后缓存应被失效');
  // 5) 恢复 → 失效
  await call(usageHandler, env, '/api/usage', 'POST');
  assert.equal((await call(restoreHandler, env, '/api/restore', 'POST', { slug: 'alpha' })).status, 200);
  assert.ok(!('cfg:usage' in store), '恢复后缓存应被失效');
});

test('usage 缓存失效：批量创建与批量恢复同样触发', async () => {
  const { store, env } = makeEnv();
  // 批量创建 2 条（urls 形态生成随机 slug，从响应取真实值）→ 失效
  const created = await (await call(createHandler, env, '/api/create', 'POST', { urls: ['https://b.example/1', 'https://b.example/2'] })).json();
  assert.equal(created.results.length, 2);
  const slugs = created.results.map((r) => r.slug);
  assert.ok(!('cfg:usage' in store), '批量创建后缓存应被失效');
  // 统计 → 批量软删 → 失效
  await call(usageHandler, env, '/api/usage', 'POST');
  assert.equal((await call(deleteHandler, env, '/api/delete', 'POST', { slugs: slugs })).status, 200);
  assert.ok(!('cfg:usage' in store), '批量删除后缓存应被失效');
  // 统计 → 批量恢复 → 失效
  await call(usageHandler, env, '/api/usage', 'POST');
  assert.equal((await call(restoreHandler, env, '/api/restore', 'POST', { slugs: slugs })).status, 200);
  assert.ok(!('cfg:usage' in store), '批量恢复后缓存应被失效');
});

test('usage 缓存失效：操作失败不误伤缓存', async () => {
  const { store, env } = makeEnv();
  await call(usageHandler, env, '/api/usage', 'POST');
  assert.ok('cfg:usage' in store, '前置：缓存存在');
  // 删除不存在的 slug → 404，缓存应保留
  const res = await call(deleteHandler, env, '/api/delete', 'POST', { slug: 'no-such' });
  assert.equal(res.status, 404);
  assert.ok('cfg:usage' in store, '失败操作不应失效缓存');
});
