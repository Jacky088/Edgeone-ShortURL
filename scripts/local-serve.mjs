// scripts/local-serve.mjs
// 本地端到端验证服务器：模拟 EdgeOne Pages 路由（静态优先 + Functions 回退），
// 用内存 KV 跑真实 onRequest 逻辑，浏览器打开 http://127.0.0.1:8787/ 即可目检。
// 用法：node scripts/local-serve.mjs [端口] ；仅本地验证，不提交。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2]) || 8787;

// ---- 内存 KV（含 list 分页语义） ----
function createMemKV() {
  const store = new Map();
  return {
    __store: store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list(opts = {}) {
      const keys = [...store.keys()].map((key) => ({ key }));
      const limit = opts.limit && opts.limit > 0 ? Math.min(1000, opts.limit) : 1000;
      let start = 0;
      if (opts.cursor) start = Number(opts.cursor) || 0;
      const slice = keys.slice(start, start + limit);
      const next = start + limit;
      return {
        keys: slice,
        cursor: next < keys.length ? String(next) : null,
        complete: next >= keys.length
      };
    }
  };
}
const DB = createMemKV();

// ---- 预置演示数据（旧数据形态：聚合统计 + 密码 + 过期 + 回收站各一条） ----
const now = Date.now();
const DAY = 86400000;
function seed() {
  const put = (k, v) => DB.__store.set(k, JSON.stringify(v));
  const daily = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    daily[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = (i % 3) + 1;
  }
  put('demo', { original: 'https://example.com/very-long-demo-link', visits: 128, createdAt: now - 6 * DAY, note: '演示短链', daily, ref: { 'google.com': 40, 'bing.com': 12 }, dev: { m: 80, d: 48 } });
  put('locked', { original: 'https://example.com/secret', visits: 5, createdAt: now - 2 * DAY, note: '密码保护', pwdHash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
  put('old', { original: 'https://example.com/expired', visits: 9, createdAt: now - 10 * DAY, expiresAt: now - DAY });
  put('gone', { original: 'https://example.com/deleted', visits: 3, createdAt: now - 9 * DAY, deletedAt: now - DAY });
  put('hash:e4d909c290d0fb1ca068ffaddf22cbd0', 'demo');
}
seed();

// ---- 模块加载 ----
const slugMod = await import('../functions/[slug]/index.js');
const apiMods = {};
for (const n of ['auth', 'create', 'links', 'update', 'delete', 'restore', 'settings', 'token', 'logout']) {
  apiMods[n] = await import(`../functions/api/${n}/index.js`);
}

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

// 把 Node req 桥成 fetch Request（含 body / cookie / ip 头）
async function toRequest(req, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const rawBody = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) headers.set(k, v.join(', '));
    else if (v !== undefined) headers.set(k, v);
  }
  if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', '127.0.0.1');
  return new Request(url, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : rawBody
  });
}

async function pipeResponse(webRes, nodeRes) {
  const headers = {};
  webRes.headers.forEach((v, k) => { headers[k] = v; });
  nodeRes.writeHead(webRes.status, headers);
  if (webRes.body) {
    const buf = Buffer.from(await webRes.arrayBuffer());
    nodeRes.end(buf);
  } else nodeRes.end();
}

const ENV = { ADMIN_PATH: 'admin', PASSWORD: 'test123', my_kv: DB };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = decodeURIComponent(url.pathname);

    // 1) 静态优先（模拟 EdgeOne 静态托管；根目录 / -> 不处理，交给 Function 主页）
    if (pathname !== '/') {
      const rel = pathname.replace(/^\/+/, '').split('?')[0];
      const file = path.join(ROOT, 'public', rel);
      if (!rel.includes('..') && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file).toLowerCase();
        const maxAge = /\.(css|js|svg|ico|png)$/.test(ext) ? 'public, max-age=3600' : 'no-store';
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': maxAge });
        fs.createReadStream(file).pipe(res);
        return;
      }
    }

    // 2) API 路由
    const apiMatch = pathname.match(/^\/api\/([a-z]+)/);
    if (apiMatch && apiMods[apiMatch[1]]) {
      const request = await toRequest(req, url);
      const webRes = await apiMods[apiMatch[1]].onRequest({ request, env: ENV });
      await pipeResponse(webRes, res);
      return;
    }

    // 3) 页面/短链路由：模拟 EdgeOne [slug] 参数
    //    EdgeOne 行为：/app.css 先走静态（上面已处理），落到这里说明静态未命中
    let slug = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    const request = await toRequest(req, url);
    const webRes = await slugMod.onRequest({
      request,
      params: { slug },
      env: ENV,
      waitUntil: () => {}
    });
    await pipeResponse(webRes, res);
  } catch (e) {
    console.error('[local-serve]', e);
    send(res, 500, 'local-serve error: ' + (e && e.message));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`本地验证服: http://127.0.0.1:${PORT}/  (口令 test123, 后台 /admin)`);
  console.log('预置短链: /demo /locked(密码abc) /old(已过期) /gone(回收站)');
});
