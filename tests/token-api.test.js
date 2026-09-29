// tests/token-api.test.js
// /api/token 管理接口测试：名称必填（400）、创建返回明文且 KV 只存哈希。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/token/index.js';
import { TOKENS_KEY } from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: Object.keys(store).map((key) => ({ key })), complete: true })
  };
}

function call(store, method, body) {
  return onRequest({
    request: new Request('https://x/api/token', {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Admin-Slug': 'admin' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    env: { ADMIN_PATH: 'admin', my_kv: mockKV(store) }
  });
}

test('token API：名称必填——留空/纯空格返回 400 且不创建', async () => {
  const store = {};
  for (const name of ['', '   ']) {
    const res = await call(store, 'POST', { name });
    assert.equal(res.status, 400, '空名称应 400');
    const data = await res.json();
    assert.match(data.error, /名称必填/);
  }
  assert.equal(store[TOKENS_KEY], undefined, '不应写入任何 Token');
});

test('token API：正常创建返回明文一次，KV 中仅存哈希', async () => {
  const store = {};
  const res = await call(store, 'POST', { name: '自动化脚本' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.name, '自动化脚本');
  assert.match(data.token, /^[a-f0-9]{64}$/, '明文应为 64 位十六进制');
  const stored = JSON.parse(store[TOKENS_KEY]);
  assert.equal(stored.length, 1);
  assert.ok(stored[0].hash && stored[0].hash !== data.token, 'KV 不应存明文');
  assert.ok(!JSON.stringify(stored).includes(data.token), '明文不得落库');
});
