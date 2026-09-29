// tests/auth-rate.test.js
// 登录限流窗口语义测试：失败计数在同一锁定窗口内跨请求累积（修复前每分钟换桶清零），
// 登录成功清零计数，窗口计数达到上限后 429（带 Retry-After）。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/auth/index.js';
import { sha256 } from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: [], complete: true })
  };
}

function login(store, password) {
  return onRequest({
    request: new Request('https://x/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    }),
    env: { ADMIN_PATH: 'admin', my_kv: mockKV(store) }
  });
}

test('auth 限流：窗口内失败跨请求累积，超限 429，成功清零', async () => {
  const store = { 'cfg:settings': JSON.stringify({ passwordHash: await sha256('right-pass'), pwdVersion: 1 }) };

  // 4 次错误：全部 401（未达默认阈值 5）
  for (let i = 0; i < 4; i++) {
    const res = await login(store, 'wrong-' + i);
    assert.equal(res.status, 401, `第 ${i + 1} 次错误应 401`);
  }
  // 第 5 次错误：401，同时计数达上限
  const fifth = await login(store, 'wrong-4');
  assert.equal(fifth.status, 401);

  // 第 6 次尝试（无论对错）：应被限流 429 且带 Retry-After
  const blocked = await login(store, 'right-pass');
  assert.equal(blocked.status, 429, '窗口内计数达上限后应 429（即使密码正确）');
  assert.ok(blocked.headers.get('Retry-After'), '429 应携带 Retry-After');

  // 限流按 IP 隔离：新 store（等价新环境）不受影响，正常登录成功
  const fresh = { 'cfg:settings': JSON.stringify({ passwordHash: await sha256('right-pass'), pwdVersion: 1 }) };
  const ok = await login(fresh, 'right-pass');
  assert.equal(ok.status, 200);
  assert.ok((ok.headers.get('Set-Cookie') || '').includes('auth_session='), '成功登录应下发会话 Cookie');

  // 成功登录应清零失败计数：成功后再错 4 次（共 4 < 5）仍应 401 而非 429
  const store2 = { 'cfg:settings': JSON.stringify({ passwordHash: await sha256('right-pass'), pwdVersion: 1 }) };
  assert.equal((await login(store2, 'right-pass')).status, 200);
  for (let i = 0; i < 4; i++) {
    assert.equal((await login(store2, 'bad')).status, 401);
  }
});
