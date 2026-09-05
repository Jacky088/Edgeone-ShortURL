// functions/api/token/index.js
// 长期 API Token 管理：用于脚本 / 第三方调用管理接口（请求头 X-API-Token）。
// Token 明文只在创建响应中出现一次，KV 中仅存 SHA-256 哈希。

import { jsonResponse, getKV, getSettings, checkAdmin, sha256, TOKENS_KEY } from '../../utils.js';

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function tokenId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function readTokens(DB) {
  try {
    const raw = await DB.get(TOKENS_KEY);
    const tokens = raw ? JSON.parse(raw) : [];
    return Array.isArray(tokens) ? tokens : [];
  } catch (e) {
    return [];
  }
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const DB = getKV(env);
  if (!DB) return jsonResponse({ error: 'KV binding not found. Please bind a KV namespace in EdgeOne Pages settings.' }, 500);

  if (!(await checkAdmin(request, env, DB))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const tokens = await readTokens(DB);

  if (request.method === 'GET') {
    return jsonResponse(tokens.map(({ hash, ...rest }) => rest));
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (request.method === 'DELETE') {
    const id = String(body.id || '').trim();
    const next = tokens.filter(t => t.id !== id);
    if (next.length === tokens.length) return jsonResponse({ error: 'Token 不存在' }, 404);
    await DB.put(TOKENS_KEY, JSON.stringify(next));
    return jsonResponse({ success: true });
  }

  // POST：创建新 Token
  if (tokens.length >= 20) {
    return jsonResponse({ error: 'Token 数量已达上限（20 个），请先吊销不用的 Token' }, 409);
  }
  const name = String(body.name || '').trim().slice(0, 30) || '未命名 Token';
  const token = generateToken();
  const record = { id: tokenId(), name, hash: await sha256(token), createdAt: Date.now() };
  tokens.push(record);
  await DB.put(TOKENS_KEY, JSON.stringify(tokens));

  return jsonResponse({ id: record.id, name: record.name, createdAt: record.createdAt, token });
}
