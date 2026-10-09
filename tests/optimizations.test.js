// tests/optimizations.test.js
// 针对并发控制池、内网与私有 IP 过滤、Token 细分权限、分页修复等优化能力的专项测试。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { mapConcurrent, isPrivateHost, DEFAULT_SETTINGS, SETTINGS_KEY, TOKENS_KEY, sha256 } from '../functions/utils.js';
import { onRequest as createApi } from '../functions/api/create/index.js';
import { onRequest as linksApi } from '../functions/api/links/index.js';
import { onRequest as tokenApi } from '../functions/api/token/index.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async (opts = {}) => {
      const keys = Object.keys(store).map((key) => ({ key }));
      return { keys, complete: true };
    }
  };
}

test('mapConcurrent：限制最大并发并按序返回结果', async () => {
  let active = 0;
  let maxActive = 0;
  const items = Array.from({ length: 50 }, (_, i) => i);
  const results = await mapConcurrent(items, 5, async (item) => {
    active++;
    if (active > maxActive) maxActive = active;
    await new Promise((r) => setTimeout(r, 2));
    active--;
    return item * 2;
  });

  assert.equal(maxActive <= 5, true, '同时运行的任务数不应超过并发上限 5');
  assert.equal(results.length, 50);
  assert.equal(results[0], 0);
  assert.equal(results[49], 98);
});

test('isPrivateHost：准确识别本地回环、内网网段与公网域名', () => {
  assert.equal(isPrivateHost('http://127.0.0.1/test'), true);
  assert.equal(isPrivateHost('https://localhost:8080/'), true);
  assert.equal(isPrivateHost('http://10.0.0.1/api'), true);
  assert.equal(isPrivateHost('http://192.168.1.100/'), true);
  assert.equal(isPrivateHost('http://172.16.0.1/'), true);
  assert.equal(isPrivateHost('http://169.254.169.254/latest/meta-data'), true);
  assert.equal(isPrivateHost('http://[::1]/'), true);
  assert.equal(isPrivateHost('sub.company.local'), true);

  // 公网正常域名
  assert.equal(isPrivateHost('https://example.com'), false);
  assert.equal(isPrivateHost('https://1.1.1.1/dns'), false);
  assert.equal(isPrivateHost('https://github.com/Jacky088'), false);
});

test('create API：开启 blockPrivateIp 时拦截私有与内网地址', async () => {
  const store = {
    [SETTINGS_KEY]: JSON.stringify({ ...DEFAULT_SETTINGS, blockPrivateIp: true })
  };
  const env = { ADMIN_PATH: 'admin', my_kv: mockKV(store) };

  const res = await createApi({
    request: new Request('https://x/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' })
    }),
    env
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /不允许为内网或私有 IP/);
});

test('token API：支持创建指定 scope 的 Token，并按权限隔离', async () => {
  const store = {};
  const env = { ADMIN_PATH: 'admin', my_kv: mockKV(store) };

  // 1. 创建仅建链权限的 Token
  const createRes = await tokenApi({
    request: new Request('https://x/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Slug': 'admin' },
      body: JSON.stringify({ name: 'ci-bot', scope: 'create' })
    }),
    env
  });
  assert.equal(createRes.status, 200);
  const tokenData = await createRes.json();
  assert.equal(tokenData.scope, 'create');
  assert.ok(tokenData.token);

  // 2. 用该 Token 调 /api/create 应该成功通过鉴权
  const testCreateRes = await createApi({
    request: new Request('https://x/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Token': tokenData.token },
      body: JSON.stringify({ url: 'https://example.com/scoped-test' })
    }),
    env
  });
  assert.equal(testCreateRes.status, 200);

  // 3. 用该 Token 调 /api/links（需要 admin 权限）应被拒绝 401
  const testAdminRes = await linksApi({
    request: new Request('https://x/api/links', {
      method: 'GET',
      headers: { 'X-API-Token': tokenData.token }
    }),
    env
  });
  assert.equal(testAdminRes.status, 401, '仅拥有 create 权限的 Token 不应允许读取管理列表');
});

test('links API：单页模式在包含内部键时不缩减有效条数', async () => {
  const store = {
    'sess:123': JSON.stringify({ exp: 9999999999999 }),
    'rl:1:hash': JSON.stringify({ count: 1 }),
    'cfg:settings': JSON.stringify(DEFAULT_SETTINGS),
    link1: JSON.stringify({ original: 'https://example.com/1', visits: 0, createdAt: 1 }),
    link2: JSON.stringify({ original: 'https://example.com/2', visits: 0, createdAt: 2 }),
    link3: JSON.stringify({ original: 'https://example.com/3', visits: 0, createdAt: 3 })
  };
  const env = { ADMIN_PATH: 'admin', my_kv: mockKV(store) };

  const res = await linksApi({
    request: new Request('https://x/api/links?limit=2', {
      method: 'GET',
      headers: { 'X-Admin-Slug': 'admin' }
    }),
    env
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.links.length, 2, '即使开头有内部键，也应满足指定的 limit=2 个有效短链');
});
