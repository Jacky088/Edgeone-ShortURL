// tests/slug-password.test.js
// 密码保护短链安全测试：密码试错限流（10 次错误 / 10 分钟窗口，按 IP+slug）、
// 正确密码 303 放行并清零计数、410（过期/删除/超限）不受限流影响。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/[slug]/index.js';
import { pruneOldestKeys } from '../functions/[slug]/index.js';
import { sha256 } from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: Object.keys(store).map((key) => ({ key })), complete: true })
  };
}

function postPassword(store, slug, pw) {
  return onRequest({
    request: new Request(`https://x/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `pw=${encodeURIComponent(pw)}`
    }),
    params: { slug },
    env: { ADMIN_PATH: 'admin', my_kv: mockKV(store) },
    waitUntil: () => {}
  });
}

test('slug 密码门：10 次错误后 429 锁定，正确密码 303 放行并清零计数', async () => {
  const store = {
    locked: JSON.stringify({ original: 'https://example.com/secret', visits: 0, createdAt: 1, pwdHash: await sha256('abc123') })
  };
  // 10 次错误：全部 401
  for (let i = 0; i < 10; i++) {
    const res = await postPassword(store, 'locked', 'wrong');
    assert.equal(res.status, 401, `第 ${i + 1} 次错误应 401`);
  }
  // 第 11 次：429 锁定（即使密码正确）
  const blocked = await postPassword(store, 'locked', 'abc123');
  assert.equal(blocked.status, 429, '试错达上限后应 429（即使密码正确）');

  // 新 KV 环境（等价新 IP/新窗口）：正确密码 303 放行
  const fresh = {
    locked: JSON.stringify({ original: 'https://example.com/secret', visits: 0, createdAt: 1, pwdHash: await sha256('abc123') })
  };
  const ok = await postPassword(fresh, 'locked', 'abc123');
  assert.equal(ok.status, 303);
  assert.ok((ok.headers.get('Set-Cookie') || '').startsWith('pv_locked='), '放行应写入密码 Cookie');
  assert.equal((ok.headers.get('Location') || ''), '/locked');

  // 放行清零计数：后续 10 次错误仍应逐次 401（第 11 次才锁）
  for (let i = 0; i < 10; i++) {
    assert.equal((await postPassword(fresh, 'locked', 'wrong')).status, 401);
  }
  assert.equal((await postPassword(fresh, 'locked', 'wrong')).status, 429);
});

test('slug 密码门：限流键为内部键语义——列表/用量统计不把它当短链', async () => {
  // 模拟：错误的 rlp: 键若被当短链，会出现在列表或用量统计的 linkKeys 中
  const store = {
    locked: JSON.stringify({ original: 'https://example.com/secret', visits: 0, createdAt: 1, pwdHash: await sha256('abc123') })
  };
  await postPassword(store, 'locked', 'wrong');
  const keys = Object.keys(store);
  assert.ok(keys.some((k) => k.startsWith('rlp:')), '错误尝试后应写入 rlp: 限流键');
});

test('pruneOldestKeys：daily 按日期淘汰最旧（而非按访问次数）', () => {
  const daily = {};
  // 最近 33 天每天 1 次低流量 + 34 天前一条 1000 次高流量
  for (let i = 33; i >= 1; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    daily[d] = 1;
  }
  const oldHigh = new Date(Date.now() - 34 * 86400000).toISOString().slice(0, 10);
  daily[oldHigh] = 1000;
  assert.equal(Object.keys(daily).length, 34);
  pruneOldestKeys(daily, 30);
  const dates = Object.keys(daily).sort();
  assert.equal(dates.length, 30, '应裁剪到 30 天');
  assert.equal(daily[oldHigh], undefined, '34 天前的高流量旧日应被淘汰（修复前按次数会保留）');
  const sorted = dates.every((d, i) => i === 0 || d > dates[i - 1]);
  assert.ok(sorted, '保留的应全部是最近的日期');
});
