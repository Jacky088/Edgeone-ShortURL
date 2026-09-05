// tests/v3.test.js
// v3.0 新增能力测试：运行时设置、slug 生成策略、域名白名单、API Token、会话版本失效。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  TOKENS_KEY,
  getSettings,
  saveSettings,
  generateSlug,
  isHostAllowed,
  isReservedSlug,
  verifySession,
  verifyApiToken,
  checkAdmin,
  sha256
} from '../functions/utils.js';

function mockKV(store) {
  return {
    get: async (k) => (k in store ? store[k] : null),
    put: async (k, v) => { store[k] = v; },
    delete: async (k) => { delete store[k]; }
  };
}

function mockRequest(headers = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return new Request('https://example.com/', { headers: h });
}

test('getSettings：无存储时返回默认值，已存设置按已知字段合并', async () => {
  assert.equal((await getSettings(null)).sessionHours, 24);
  assert.deepEqual((await getSettings(mockKV({}))).rateLimit, { max: 5, windowMin: 10 });

  const kv = mockKV({
    [SETTINGS_KEY]: JSON.stringify({ sessionHours: 72, rateLimit: { max: 9 }, unknownField: 'ignored' })
  });
  const settings = await getSettings(kv);
  assert.equal(settings.sessionHours, 72);
  assert.equal(settings.rateLimit.max, 9);
  assert.equal(settings.rateLimit.windowMin, 10, '嵌套对象未提供的字段应保留默认值');
  assert.equal(settings.unknownField, undefined, '未知字段不应进入设置');
  assert.equal(settings.slug.length, 8, '未提供的嵌套对象应整体保留默认值');
});

test('saveSettings：在当前设置基础上合并嵌套 patch', async () => {
  const store = {};
  const kv = mockKV(store);
  await saveSettings(kv, { rateLimit: { max: 8 }, dedupHash: false });
  const saved = await getSettings(kv);
  assert.equal(saved.rateLimit.max, 8);
  assert.equal(saved.rateLimit.windowMin, 10, '未提供的嵌套字段应保留');
  assert.equal(saved.dedupHash, false);
});

test('generateSlug：长度与字符集来自设置，safe 字符集无易混淆字符', () => {
  for (let i = 0; i < 20; i++) {
    const slug = generateSlug({ slug: { length: 6, charset: 'safe' } });
    assert.equal(slug.length, 6);
    assert.match(slug, /^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/);
  }
  const full = generateSlug({ slug: { length: 8, charset: 'full' } });
  assert.match(full, /^[a-z0-9]{8}$/);
  // 默认设置下长度为 8
  assert.equal(generateSlug(DEFAULT_SETTINGS).length, 8);
});

test('isHostAllowed：白名单匹配主域名与子域，空列表不限制', () => {
  const wl = ['example.com', 'sub.example.org'];
  assert.equal(isHostAllowed('https://example.com/a', wl), true);
  assert.equal(isHostAllowed('https://a.example.com/x', wl), true, '子域应命中主域名条目');
  assert.equal(isHostAllowed('https://sub.example.org/', wl), true);
  assert.equal(isHostAllowed('https://evil.com/', wl), false);
  assert.equal(isHostAllowed('https://notexample.com/', wl), false, '不应后缀误匹配');
  assert.equal(isHostAllowed('https://anything.com/', []), true, '空白名单不限制');
});

test('isReservedSlug：支持运行时追加的保留字', () => {
  assert.equal(isReservedSlug('vip', '', ['vip', 'admin2']), true);
  assert.equal(isReservedSlug('cfg:x', '', []), true, 'cfg: 内部前缀应保留');
  assert.equal(isReservedSlug('dc:x', '', []), true, 'dc: 内部前缀应保留');
  assert.equal(isReservedSlug('normal', '', ['vip']), false);
});

test('verifySession：自定义口令哈希生效，pwdVersion 变更使旧会话失效', async () => {
  const pwdHash = await sha256('newpass');
  const token = 'f'.repeat(64);
  const store = {
    [SETTINGS_KEY]: JSON.stringify({ passwordHash: pwdHash, pwdVersion: 2 }),
    [`sess:${token}`]: JSON.stringify({ exp: Date.now() + 60000, pv: 1 })
  };
  const kv = mockKV(store);

  // 自定义口令部署（env 未设 PASSWORD）也需要会话
  assert.equal(await verifySession(mockRequest({}), {}, kv), false);
  assert.equal(await verifySession(mockRequest({ Cookie: `auth_session=${token}` }), {}, kv), false, '会话版本过旧应拒绝');

  store[`sess:${token}`] = JSON.stringify({ exp: Date.now() + 60000, pv: 2 });
  assert.equal(await verifySession(mockRequest({ Cookie: `auth_session=${token}` }), {}, kv), true, '会话版本匹配应通过');

  // 环境变量口令部署在无自定义口令时行为不变
  const token2 = 'a'.repeat(64);
  const kv2 = mockKV({ [`sess:${token2}`]: JSON.stringify({ exp: Date.now() + 60000 }) });
  assert.equal(await verifySession(mockRequest({ Cookie: `auth_session=${token2}` }), { PASSWORD: 'x' }, kv2), true);
});

test('verifyApiToken + checkAdmin：Token 哈希比对通过，错误 Token 拒绝', async () => {
  const goodToken = 'b'.repeat(64);
  const store = {
    [TOKENS_KEY]: JSON.stringify([{ id: 't1', name: 'bot', hash: await sha256(goodToken), createdAt: 1 }]),
    [SETTINGS_KEY]: JSON.stringify({})
  };
  const kv = mockKV(store);
  assert.equal(await verifyApiToken(mockRequest({ 'X-API-Token': goodToken }), {}, kv), true);
  assert.equal(await verifyApiToken(mockRequest({ 'X-API-Token': 'c'.repeat(64) }), {}, kv), false);
  assert.equal(await verifyApiToken(mockRequest({}), {}, kv), false);

  // Token 可代替 Admin-Slug 头通过管理鉴权
  assert.equal(await checkAdmin(mockRequest({ 'X-API-Token': goodToken }), {}, kv), true);
  // 无 Token 时仍需 Admin-Slug 头 + 会话
  assert.equal(await checkAdmin(mockRequest({}), {}, kv), false);
});
