// tests/settings-api.test.js
// 运行时设置接口测试：二维码自定义 Logo 的校验、保存与清除。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/settings/index.js';
import { SETTINGS_KEY } from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: [], complete: true })
  };
}

function buildEnv(store) {
  return { ADMIN_PATH: 'admin', my_kv: mockKV(store) };
}

function call(env, method, payload) {
  const init = { method, headers: { 'X-Admin-Slug': 'admin' } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  return onRequest({ request: new Request('https://x/api/settings', init), env });
}

test('settings API：合法 Logo data URL 保存并返回', async () => {
  const store = {};
  const good = 'data:image/png;base64,' + 'A'.repeat(64);
  const res = await call(buildEnv(store), 'POST', { qr: { centerLogo: true, logoDataUrl: good } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.qr.logoDataUrl, good);
  assert.equal(data.qr.centerLogo, true);
  assert.equal(JSON.parse(store[SETTINGS_KEY]).qr.logoDataUrl, good, 'Logo 应持久化到 KV');
});

test('settings API：非法 Logo（前缀不符 / 超长）返回 400', async () => {
  const store = {};
  const env = buildEnv(store);
  let res = await call(env, 'POST', { qr: { logoDataUrl: 'https://evil.example/x.png' } });
  assert.equal(res.status, 400);
  res = await call(env, 'POST', { qr: { logoDataUrl: 'data:image/png;base64,' + 'A'.repeat(200000) } });
  assert.equal(res.status, 400);
  assert.equal(store[SETTINGS_KEY], undefined, '校验失败时不应写入任何设置');
});

test('settings API：空字符串清除自定义 Logo，恢复默认', async () => {
  const store = {};
  const env = buildEnv(store);
  const good = 'data:image/png;base64,' + 'B'.repeat(64);
  await call(env, 'POST', { qr: { logoDataUrl: good } });
  const res = await call(env, 'POST', { qr: { logoDataUrl: '' } });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.qr.logoDataUrl, '');
});

test('settings API：保存设置不带 logoDataUrl 时不清除已有自定义 Logo', async () => {
  const store = {};
  const env = buildEnv(store);
  const good = 'data:image/png;base64,' + 'C'.repeat(64);
  await call(env, 'POST', { qr: { logoDataUrl: good } });
  await call(env, 'POST', { qr: { centerLogo: true, dark: '#ff0000' } });
  const res = await call(env, 'GET');
  const data = await res.json();
  assert.equal(data.qr.logoDataUrl, good, '普通设置保存不应影响已上传的 Logo');
  assert.equal(data.qr.dark, '#ff0000');
});
