// tests/batch-stats.test.js
// 批量删除/恢复接口（slugs 数组）、全站统计聚合（/api/stats）、
// 管理员会话点击短链不计数（访客匿名访问正常计数）。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequest as deleteApi } from '../functions/api/delete/index.js';
import { onRequest as restoreApi } from '../functions/api/restore/index.js';
import { onRequest as statsApi } from '../functions/api/stats/index.js';
import { onRequest as slugRoute } from '../functions/[slug]/index.js';

function mockKV(store) {
  return {
    __store: store,
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; },
    list: async () => ({ keys: Object.keys(store).map((key) => ({ key })), complete: true })
  };
}

const TOKEN = 'a'.repeat(32);
function buildEnv(store) {
  const env = { ADMIN_PATH: 'admin', PASSWORD: 'test-pass', my_kv: mockKV(store) };
  store['sess:' + TOKEN] = JSON.stringify({ exp: Date.now() + 3600000 });
  return env;
}

function callApi(handler, env, method, payload, extraHeaders = {}) {
  const init = { method, headers: { 'X-Admin-Slug': 'admin', Cookie: 'auth_session=' + TOKEN, ...extraHeaders } };
  if (payload !== undefined) init.body = JSON.stringify(payload);
  return handler({ request: new Request('https://x/api/' + (handler === statsApi ? 'stats' : handler === deleteApi ? 'delete' : 'restore'), init), env });
}

function seedLink(store, slug, extra = {}) {
  store[slug] = JSON.stringify({ original: 'https://example.com/' + slug, visits: 0, createdAt: Date.now() - 1000, ...extra });
}

test('delete API：批量 slugs 软删除 + 彻底删除', async () => {
  const store = {};
  seedLink(store, 'bat1');
  seedLink(store, 'bat2');
  seedLink(store, 'bat3');
  const env = buildEnv(store);

  const res = await callApi(deleteApi, env, 'POST', { slugs: ['bat1', 'bat2', 'ghost-x'], purge: false });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.batch, true);
  assert.equal(data.total, 3);
  assert.equal(data.ok, 2, '不存在的 slug 不应计入成功');
  const byslug = Object.fromEntries(data.results.map((r) => [r.slug, r]));
  assert.equal(byslug.bat1.success, true);
  assert.equal(byslug.bat2.success, true);
  assert.ok(byslug['ghost-x'].error, '不存在的 slug 应报告错误');
  assert.ok(JSON.parse(store.bat1).deletedAt, '软删除应写入 deletedAt');

  const purgeRes = await callApi(deleteApi, env, 'POST', { slugs: ['bat1', 'bat2'], purge: true });
  const purgeData = await purgeRes.json();
  assert.equal(purgeData.ok, 2);
  assert.equal(store.bat1, undefined, '彻底删除应移除记录');
});

test('delete API：批量上限 100 条与空数组 400', async () => {
  const store = {};
  const env = buildEnv(store);
  let res = await callApi(deleteApi, env, 'POST', { slugs: [] });
  assert.equal(res.status, 400);
  res = await callApi(deleteApi, env, 'POST', { slugs: Array.from({ length: 101 }, (_, i) => 's' + i) });
  assert.equal(res.status, 400);
});

test('delete API：单条 slug 响应形态保持不变', async () => {
  const store = {};
  seedLink(store, 'single1');
  const env = buildEnv(store);
  const res = await callApi(deleteApi, env, 'POST', { slug: 'single1' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { success: true, slug: 'single1' });
  const res2 = await callApi(deleteApi, env, 'POST', { slug: 'single1' });
  assert.deepEqual(await res2.json(), { success: true, slug: 'single1', alreadyDeleted: true });
});

test('restore API：批量 slugs 恢复', async () => {
  const store = {};
  seedLink(store, 'rst1', { deletedAt: Date.now() - 100 });
  seedLink(store, 'rst2', { deletedAt: Date.now() - 100 });
  const env = buildEnv(store);

  const res = await callApi(restoreApi, env, 'POST', { slugs: ['rst1', 'rst2'] });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, 2);
  assert.equal(JSON.parse(store.rst1).deletedAt, undefined);
  // 再恢复一次：alreadyActive 也算成功
  const res2 = await callApi(restoreApi, env, 'POST', { slugs: ['rst1'] });
  const data2 = await res2.json();
  assert.equal(data2.results[0].success, true);
  assert.equal(data2.results[0].alreadyActive, true);
});

test('stats API：聚合近 N 天访问趋势与总量（排除回收站）', async () => {
  const store = {};
  const today = new Date().toISOString().slice(0, 10);
  seedLink(store, 'st1', { visits: 10, daily: { [today]: 4, '2000-01-01': 100 } });
  seedLink(store, 'st2', { visits: 5, daily: { [today]: 1 } });
  seedLink(store, 'dead', { visits: 50, deletedAt: Date.now() - 100, daily: { [today]: 99 } });
  store['sess:irrelevant'] = 'x';
  store['hash:abc'] = 'st1';
  const env = buildEnv(store);

  const res = await callApi(statsApi, env, 'GET');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.windowDays, 14);
  assert.equal(data.daily[today], 5, '今日访问应等于两条有效短链之和');
  assert.equal(data.totalVisits, 15, '总访问不应包含回收站记录');
  assert.equal(data.linkCount, 2);
  assert.equal(Object.keys(data.daily).length, 14);
  assert.equal(data.truncated, false);
});

test('[slug]：管理员会话点击不计数，匿名访问正常计数', async () => {
  const store = {};
  seedLink(store, 'pv1', { visits: 7 });
  const env = buildEnv(store);

  // 管理会话点击：跳转成功但计数不变
  const adminReq = new Request('https://x/pv1', { headers: { Cookie: 'auth_session=' + TOKEN }, redirect: 'manual' });
  const waits1 = [];
  const res1 = await slugRoute({ request: adminReq, params: { slug: 'pv1' }, env, waitUntil: (p) => waits1.push(p) });
  assert.equal(res1.status, 302);
  await Promise.all(waits1);
  assert.equal(JSON.parse(store.pv1).visits, 7, '管理员会话点击不应计数');

  // 匿名访问：计数 +1
  const anonReq = new Request('https://x/pv1', { redirect: 'manual' });
  const waits2 = [];
  const res2 = await slugRoute({ request: anonReq, params: { slug: 'pv1' }, env, waitUntil: (p) => waits2.push(p) });
  assert.equal(res2.status, 302);
  await Promise.all(waits2);
  assert.equal(JSON.parse(store.pv1).visits, 8, '匿名访问应正常计数');
});

test('[slug]：密码保护短链的管理员预览仍需密码（仅跳过计数）', async () => {
  const store = {};
  // sha256('abc') 与 verify-local 演示数据一致的示例：这里直接放一个错误哈希确保走密码页
  seedLink(store, 'pvpw', { visits: 1, pwdHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
  const env = buildEnv(store);
  const adminReq = new Request('https://x/pvpw', { headers: { Cookie: 'auth_session=' + TOKEN }, redirect: 'manual' });
  const res = await slugRoute({ request: adminReq, params: { slug: 'pvpw' }, env, waitUntil: () => {} });
  // 无密码 Cookie → 仍返回密码页（200 HTML），管理员身份不绕过密码
  assert.equal(res.status, 200);
  assert.ok((await res.text()).includes('password'), '应返回密码验证页');
  assert.equal(JSON.parse(store.pvpw).visits, 1);
});
