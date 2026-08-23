// tests/utils.test.js
// 运行方式：npm test（node --test，Node 18+，无第三方依赖）

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sha256,
  getCookie,
  getKV,
  isAllowedUrl,
  isValidSlug,
  isReservedSlug,
  verifySession
} from '../functions/utils.js';

test('sha256 输出已知向量', async () => {
  assert.equal(await sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('isValidSlug 校验', () => {
  assert.equal(isValidSlug('abc-123_X'), true);
  assert.equal(isValidSlug(''), false);
  assert.equal(isValidSlug('a'.repeat(65)), false);
  assert.equal(isValidSlug('bad slug'), false);
  assert.equal(isValidSlug('bad/slug'), false);
  assert.equal(isValidSlug('hash:xx'), false);
});

test('isAllowedUrl 只允许 http/https', () => {
  assert.equal(isAllowedUrl('https://example.com'), true);
  assert.equal(isAllowedUrl('http://example.com/a?b=1'), true);
  assert.equal(isAllowedUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedUrl('ftp://example.com'), false);
  assert.equal(isAllowedUrl('not a url'), false);
});

test('isReservedSlug 拦截保留字与内部键前缀', () => {
  assert.equal(isReservedSlug('api', 'admin'), true);
  assert.equal(isReservedSlug('favicon.ico', ''), true);
  assert.equal(isReservedSlug('hash:abc', ''), true);
  assert.equal(isReservedSlug('sess:abc', ''), true);
  assert.equal(isReservedSlug('rl:1.2.3.4', ''), true);
  assert.equal(isReservedSlug('myadmin', 'myadmin'), true);
  assert.equal(isReservedSlug('normal', 'admin'), false);
});

function mockRequest(cookie) {
  const headers = new Headers();
  if (cookie) headers.set('Cookie', cookie);
  return new Request('https://example.com/', { headers });
}

test('getCookie 解析 Cookie 头', () => {
  assert.equal(getCookie(mockRequest('a=1; auth_session=tok123; b=2'), 'auth_session'), 'tok123');
  assert.equal(getCookie(mockRequest(null), 'auth_session'), null);
  assert.equal(getCookie(mockRequest('other=1'), 'auth_session'), null);
});

test('getKV 按绑定名与环境扫描查找 KV', () => {
  const kv = { get: async () => null, put: async () => {} };
  assert.equal(getKV({ my_kv: kv }), kv);
  assert.equal(getKV({ MY_KV: kv }), kv);
  assert.equal(getKV({ PASSWORD: 'x', anything: kv }), kv);
  assert.equal(getKV({ PASSWORD: 'x', ADMIN_PATH: 'y' }), null);
});

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; }
  };
}

test('verifySession：未设密码时直接放行', async () => {
  assert.equal(await verifySession(mockRequest(null), { PASSWORD: '' }, mockKV({})), true);
});

test('verifySession：有效且未过期的会话通过', async () => {
  const token = 'a'.repeat(64);
  const kv = mockKV({ [`sess:${token}`]: JSON.stringify({ exp: Date.now() + 1000 }) });
  const env = { PASSWORD: 'secret' };
  assert.equal(await verifySession(mockRequest(`auth_session=${token}`), env, kv), true);
});

test('verifySession：过期、不存在、格式非法、缺 Cookie 均拒绝', async () => {
  const env = { PASSWORD: 'secret' };
  const token = 'b'.repeat(64);
  const kv = mockKV({ [`sess:${token}`]: JSON.stringify({ exp: Date.now() - 1000 }) });

  assert.equal(await verifySession(mockRequest(`auth_session=${token}`), env, kv), false); // 过期
  assert.equal(await verifySession(mockRequest('auth_session=' + 'c'.repeat(64)), env, kv), false); // 不存在
  assert.equal(await verifySession(mockRequest('auth_session=short'), env, kv), false); // 格式非法
  assert.equal(await verifySession(mockRequest(null), env, kv), false); // 无 Cookie
  assert.equal(await verifySession(mockRequest(`auth_session=${token}`), env, null), false); // 无 KV
});
