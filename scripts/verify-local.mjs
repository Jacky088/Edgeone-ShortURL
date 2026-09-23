// scripts/verify-local.mjs
// 本地全功能验证：静态检查（CSS/占位符/依赖覆盖）+ 端到端（需先起 local-serve）。
// 用法：node scripts/local-serve.mjs 8787 &  sleep 1; node scripts/verify-local.mjs [端口]
import fs from 'node:fs';

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`✔ ${name}`); }
  else { fail++; console.log(`✖ ${name} ${extra}`); }
}

// ---------- A. 静态检查 ----------
const css = fs.readFileSync('public/app.css', 'utf8');
let ob = 0, cb = 0;
for (const c of css) { if (c === '{') ob++; if (c === '}') cb++; }
ok('A1 CSS括号配平', ob === cb && ob > 300, `(${ob}/${cb})`);
ok('A2 CSS无杂散反引号', !css.includes('`'));
for (const k of ['.app ', '.app-header', '.sidebar', '.stat-card', '.batch-row-edit', '.settings-grid', '.qr-view', '.auth-card', '.toast', '[data-theme="dark"]']) {
  ok(`A3 CSS含 ${k.trim()}`, css.includes(k));
}

const pages = await import('../functions/pages.js');
const render = (h) => h.split('__ADMIN_PATH_STATUS__').join(JSON.stringify('admin'))
  .split('__QR_SETTINGS__').join('{}').split('__ADMIN_TOP_BUTTON__').join('<a>管理后台</a>');
const rendered = {
  login: pages.loginHtml, index: render(pages.indexHtml), admin: render(pages.adminHtml),
  error: pages.errorPageHtml(), password: pages.passwordHtml({ slug: 'abc' })
};
for (const [n, h] of Object.entries(rendered)) {
  ok(`A4 ${n}无占位符残留`, !['__QR_SETTINGS__', '__ADMIN_PATH_STATUS__', '__ADMIN_TOP_BUTTON__'].some((k) => h.includes(k)));
  ok(`A5 ${n}走静态css`, h.includes('/app.css'));
  const scripts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  let okAll = true, msg = '';
  scripts.forEach((c, i) => { try { new Function(c); } catch (e) { okAll = false; msg = `脚本${i + 1}:${e.message}`; } });
  ok(`A6 ${n}内联脚本可编译`, okAll, msg);
}
// HTML class 全覆盖（简单子串检查，避免正则转义坑）
{
  const allCls = new Set();
  for (const h of Object.values(rendered)) {
    for (const m of h.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => allCls.add(c));
  }
  // open-about 是纯 JS 钩子（aboutJs 用它绑定弹窗，无需样式）；
  // nf-code 是错误页内联 css 参数定义的，不在 app.css 主体中。两者豁免。
  const CSS_ALLOWLIST = new Set(['open-about', 'nf-code']);
  const missing = [...allCls].filter((c) => !CSS_ALLOWLIST.has(c) && !css.includes('.' + c));
  ok('A7 HTML class全被CSS定义', missing.length === 0, missing.slice(0, 10).join(','));
}
// 内联全局依赖全被 ui.js/qr-draw.js 导出
{
  const ui = fs.readFileSync('public/ui.js', 'utf8');
  const qd = fs.readFileSync('public/qr-draw.js', 'utf8');
  const names = ['showToast', 'showToastClosable', 'pad2', 'numberFormat', 'fmtDateShort', 'fmtDateTime', 'fmtFullDateTime', 'dayKey', 'setStatDate', 'drawQrResult', 'drawQrDialog'];
  for (const n of ['index', 'admin']) {
    const s = [...rendered[n].matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).slice(1).join('\n');
    const calls = new Set([...s.matchAll(/(?<![.\w$])(showToast|showToastClosable|pad2|numberFormat|fmtDateShort|fmtDateTime|fmtFullDateTime|dayKey|setStatDate|drawQrResult|drawQrDialog)\s*\(/g)].map((m) => m[1]));
    const miss = [...calls].filter((c) => !ui.includes(c) && !qd.includes(c));
    ok(`A8 ${n}全局依赖全导出`, miss.length === 0, miss.join(','));
  }
  ok('A9 qr-lib导出qrcode', /var qrcode=function/.test(fs.readFileSync('public/qr-lib.js', 'utf8')));
  // 兜底与 public 同源
  const sa = await import('../functions/static-assets.js');
  ok('A10 兜底APP_CSS一致', sa.APP_CSS === css);
  ok('A11 兜底UI_JS一致', sa.UI_JS === fs.readFileSync('public/ui.js', 'utf8'));
}

// ---------- B. 端到端（local-serve） ----------
const PORT = Number(process.argv[2]) || 8787;
const BASE = `http://127.0.0.1:${PORT}`;
let jar = '';
async function req(path, init = {}) {
  const r = await fetch(BASE + path, { ...init, headers: { Cookie: jar, ...(init.headers || {}) } });
  const setCookie = r.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/auth_session=[^;]*/);
    if (m) jar = m[0];
  }
  return r;
}
try {
  await fetch(BASE + '/');
} catch {
  console.log('— 跳过B部分：local-serve 未启动（先跑 node scripts/local-serve.mjs）');
  console.log(`\n静态: ${pass}过 ${fail}挂`);
  process.exit(fail ? 1 : 0);
}

{
  const r = await req('/');
  ok('B1 未登录返回登录页', r.status === 200 && (await r.text()).includes('id="login-form"'));
}
{
  const r = await req('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test123' }) });
  ok('B2 口令登录成功', r.status === 200 && jar.includes('auth_session'));
}
{
  const cssR = await req('/app.css');
  ok('B3 /app.css 200', cssR.status === 200 && (cssR.headers.get('content-type') || '').includes('css'));
  const uiR = await req('/ui.js');
  ok('B4 /ui.js 200', uiR.status === 200);
  const qlR = await req('/qr-lib.js');
  ok('B5 /qr-lib.js 200', qlR.status === 200);
  const qdR = await req('/qr-draw.js');
  ok('B6 /qr-draw.js 200', qdR.status === 200);
}
{
  const idx = await (await req('/')).text();
  ok('B7 主页含创建表单+管理入口+批量', idx.includes('id="link-form"') && idx.includes('管理后台') && idx.includes('id="batch-panel"'));
  ok('B8 主页QR配置已注入', /window\.__QR_CFG__ = \{/.test(idx));
  const adm = await (await req('/admin')).text();
  ok('B9 后台四视图齐全', ['id="links-table-body"', 'id="view-stats"', 'id="view-settings"', 'id="about-dialog"'].every((k) => adm.includes(k)));
}
{
  const mk = await (await req('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/verify-e2e' }) })).json();
  ok('B10 创建短链', !!mk.slug);
  const j = await req('/' + mk.slug, { redirect: 'manual' });
  ok('B11 跳转302到原文', j.status === 302 && j.headers.get('location') === 'https://example.com/verify-e2e');
  const demo = await req('/demo', { redirect: 'manual' });
  ok('B12 旧数据/demo可跳转', demo.status === 302);
  const gone = await req('/gone');
  ok('B13 回收站gone返回410', gone.status === 410);
  const old = await req('/old');
  ok('B14 过期old返回410', old.status === 410);
  const nope = await req('/nope-verify-xyz');
  ok('B15 不存在返回404', nope.status === 404);
}
{
  const H = { 'Content-Type': 'application/json', 'X-Admin-Slug': 'admin' };
  const list = await (await req('/api/links', { headers: H })).json();
  ok('B16 列表返回旧数据', Array.isArray(list) && list.some((l) => l.slug === 'demo'));
  const detail = await (await req('/api/links?slug=demo', { headers: H })).json();
  ok('B17 单条详情含daily', !!detail.daily && !!detail.ref);
  const trash = await (await req('/api/links?trash=1', { headers: H })).json();
  ok('B18 回收站含gone', trash.some((l) => l.slug === 'gone'));
  const upd = await (await req('/api/update', { method: 'POST', headers: H, body: JSON.stringify({ slug: 'demo', note: 'e2e备注' }) })).json();
  ok('B19 更新备注', upd.note === 'e2e备注');
  const del = await (await req('/api/delete', { method: 'POST', headers: H, body: JSON.stringify({ slug: 'demo' }) })).json();
  ok('B20 软删除', del.success === true);
  const goneNow = await req('/demo');
  ok('B21 删除后跳转410', goneNow.status === 410);
  const rst = await (await req('/api/restore', { method: 'POST', headers: H, body: JSON.stringify({ slug: 'demo' }) })).json();
  ok('B22 恢复', rst.success === true);
  const back = await req('/demo', { redirect: 'manual' });
  ok('B23 恢复后跳转302', back.status === 302);
  const pwd = await (await req('/api/settings', { method: 'POST', headers: H, body: JSON.stringify({ password: 'e2e-new-pass' }) })).json();
  ok('B24 改口令不崩溃', pwd.sessionInvalidated === true);
}

console.log(`\n共 ${pass}过 ${fail}挂`);
process.exit(fail ? 1 : 0);
