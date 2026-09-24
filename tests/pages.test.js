// tests/pages.test.js
// 页面模板冒烟测试：HTML 结构完整性、关键交互元素、内嵌 <script> 可编译（无语法错误）。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loginHtml, indexHtml, adminHtml, errorPageHtml } from '../functions/pages.js';

// 提取页面内所有 <script> 内容（含 head 主题预载脚本与页面脚本）
function extractScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// 模拟服务端占位符替换（[slug]/index.js 返回页面前会替换这些变量）
function serverRender(html) {
  return html
    .split('__ADMIN_PATH_STATUS__').join(JSON.stringify('admin'))
    .split('__QR_SETTINGS__').join('{"centerLogo":false,"dark":"#16181d"}');
}

// 逐段编译内嵌脚本：只编译不执行，捕获语法错误与顶层重名声明
function assertScriptsCompile(html, label) {
  const scripts = extractScripts(serverRender(html));
  assert.ok(scripts.length >= 2, `${label} 应包含主题预载与页面脚本`);
  scripts.forEach((code, i) => {
    assert.doesNotThrow(() => new Function(code), `${label} 第 ${i + 1} 段内嵌脚本应可编译`);
  });
}

test('三个页面 + 错误页均输出完整 HTML 且内嵌脚本可编译', () => {
  for (const [label, html] of [
    ['登录页', loginHtml],
    ['主页', indexHtml],
    ['管理后台', adminHtml],
    ['错误页', errorPageHtml()],
  ]) {
    assert.ok(html.startsWith('<!DOCTYPE html>'), `${label} 应以 DOCTYPE 开头`);
    assert.ok(html.includes('</html>'), `${label} 应完整闭合`);
    assert.ok(html.includes('data-theme="light"'), `${label} 应有主题预载机制`);
    assertScriptsCompile(html, label);
  }
});

test('登录页：无「管理后台」入口，口令框自动聚焦，含统一页脚', () => {
  assert.ok(!loginHtml.includes('管理后台'), '登录页不应再出现管理后台入口');
  assert.ok(loginHtml.includes('autofocus'), '口令输入框应自动聚焦');
  assert.ok(loginHtml.includes('运行在 EdgeOne Pages'), '应包含统一页脚');
});

test('主页：专注创建（无侧边栏 / 统计卡 / 关于入口），管理入口交由服务端条件渲染', () => {
  assert.ok(!indexHtml.includes('class="sidebar"'), '前台不应有侧边栏');
  assert.ok(!indexHtml.includes('data-admin-view'), '深链导航应随侧边栏移除');
  assert.ok(!indexHtml.includes('id="stat-visits"'), '迷你统计卡应移除');
  assert.ok(!indexHtml.includes('loadIndexStats'), '统计拉取脚本应移除');
  assert.ok(!indexHtml.includes('id="about-dialog"'), '关于弹窗入口应移至管理后台（样式为全站共用保留）');
  assert.ok(indexHtml.includes('__ADMIN_TOP_BUTTON__'), '管理入口应交由服务端按 ADMIN_PATH 条件渲染');
  assert.ok(indexHtml.includes('id="qr-download"'), '结果卡应提供二维码下载');
  assert.ok(indexHtml.includes('pending_create_url'), '401 后应保存已填内容');
  assert.ok(indexHtml.includes('已恢复上次填写的内容'), '登录后应提示恢复');
  assert.ok(indexHtml.includes('运行在 EdgeOne Pages'), '应包含统一页脚');
});

test('主页占位符：管理入口按 ADMIN_PATH 条件渲染，二维码设置可注入', () => {
  const render = (adminPath) => indexHtml
    .split('__ADMIN_PATH_STATUS__').join(JSON.stringify(adminPath))
    .split('__QR_SETTINGS__').join('{"centerLogo":false}')
    .split('__ADMIN_TOP_BUTTON__').join(adminPath ? '<span>管理后台</span>' : '');
  assert.ok(render('admin').includes('<span>管理后台</span>'), '配置 ADMIN_PATH 时应渲染管理入口');
  assert.ok(!render('').includes('<span>管理后台</span>'), '未配置 ADMIN_PATH 时不渲染管理入口');
});

test('主页 + 登录页的 __ADMIN_PATH_STATUS__ 占位符可被服务端完整替换', () => {
  for (const html of [loginHtml, indexHtml]) {
    const replaced = html.split('__ADMIN_PATH_STATUS__').join(JSON.stringify('admin'));
    assert.ok(!replaced.includes('__ADMIN_PATH_STATUS__'), '替换后不应残留占位符');
  }
});

test('管理后台：统计视图深链、客户端分页、列类名、完整时间', () => {
  assert.ok(adminHtml.includes("get('view')"), '管理后台应解析 ?view= 深链参数');
  assert.ok(indexHtml.includes("?view=' + encodeURIComponent(view)"), '主页侧边栏深链应带视图参数');
  assert.ok(adminHtml.includes('id="load-more-wrap"') && adminHtml.includes('PAGE_SIZE'), '应有客户端分页');
  assert.ok(adminHtml.includes('col-orig') && adminHtml.includes('col-created'), '移动端隐藏列应按类名');
  assert.ok(adminHtml.includes('fmtDateTime'), '创建时间应显示到时分');
  assert.ok(adminHtml.includes('setStatDate'), '最近创建应显示相对日期');
  assert.ok(adminHtml.includes('运行在 EdgeOne Pages'), '应包含统一页脚');
});

test('静态资源：样式与公共脚本走 public 静态文件（可缓存），二维码库仅主页/后台加载', () => {
  for (const [label, html] of [['登录页', loginHtml], ['主页', indexHtml], ['管理后台', adminHtml]]) {
    assert.ok(html.includes('/app.css'), `${label} 样式应走静态 /app.css`);
    assert.ok(html.includes('/ui.js'), `${label} 公共脚本应走静态 /ui.js`);
  }
  assert.ok(!loginHtml.includes('qrcode'), '登录页不应加载二维码库');
  assert.ok(indexHtml.includes('/qr-lib.js') && indexHtml.includes('/qr-draw.js'), '主页应加载二维码库与绘制脚本');
  assert.ok(adminHtml.includes('/qr-lib.js') && adminHtml.includes('/qr-draw.js'), '管理后台应加载二维码库与绘制脚本');
  for (const f of ['../public/app.css', '../public/ui.js', '../public/qr-lib.js', '../public/qr-draw.js']) {
    const stat = fs.statSync(new URL(f, import.meta.url));
    assert.ok(stat.size > 1000, `${f} 应存在且非空`);
  }
  const ui = fs.readFileSync(new URL('../public/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes('showToast') && ui.includes('setStatDate'), 'ui.js 应包含 Toast 与格式化工具');
  assert.doesNotThrow(() => new Function(ui), 'ui.js 应可编译');
  const qrDraw = fs.readFileSync(new URL('../public/qr-draw.js', import.meta.url), 'utf8');
  assert.ok(qrDraw.includes('drawQrResult') && qrDraw.includes('drawQrDialog'), 'qr-draw.js 应导出主页/后台两种绘制入口');
  assert.doesNotThrow(() => new Function(qrDraw), 'qr-draw.js 应可编译');
});

test('脚本时序：静态脚本不用 defer，内联业务脚本解析期调用不报错', () => {
  // body 末尾内联脚本在解析期就调用 showToastClosable/numberFormat/getLinks（定义在 ui.js），
  // 静态 <script src> 必须按文档顺序先执行，defer 会把执行推迟到解析后，导致 ReferenceError。
  for (const [label, html] of [['登录页', loginHtml], ['主页', indexHtml], ['管理后台', adminHtml]]) {
    assert.ok(!html.includes(' defer'), `${label} 静态脚本不应使用 defer`);
    const tags = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
    assert.ok(tags.some((s) => s.includes('/ui.js')), `${label} 应在 head 同步加载 ui.js`);
  }
  // 静态脚本出现在 </head> 之前，内联业务脚本在 <body> 末尾：文档顺序保证依赖先就绪
  for (const [label, html] of [['主页', indexHtml], ['管理后台', adminHtml]]) {
    assert.ok(html.indexOf('/ui.js') < html.indexOf('<body>'), `${label} ui.js 应在 body 之前加载`);
  }
  // ui.js 在 head 执行时 body 尚未解析：碰 DOM 的初始化必须包 ready() 等 DOMContentLoaded，
  // 否则 getElementById 拿到 null 导致主题/注销/关于弹窗绑定被跳过（线上「关于项目点不开」根因）
  const ui = fs.readFileSync(new URL('../public/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes('DOMContentLoaded'), 'ui.js 应有 DOM 就绪机制');
  for (const anchor of ['/* ---------- 主题切换', '/* ---------- 注销', '/* ---------- 「关于项目」弹窗']) {
    const i = ui.indexOf(anchor);
    assert.ok(i > -1, `ui.js 应含 ${anchor}`);
    assert.ok(ui.slice(i, i + 400).includes('ready('), `${anchor} 初始化应包在 ready() 内`);
  }
});

test('错误页：品牌化 404，含返回主页入口', () => {
  const page = errorPageHtml({ code: '404', title: '链接不存在', message: '该短链接不存在或已被删除。' });
  assert.ok(page.includes('>404<'), '应展示状态码');
  assert.ok(page.includes('返回主页'), '应提供返回主页入口');
  assert.ok(!page.includes('__ADMIN_PATH_STATUS__'), '错误页不依赖服务端注入变量');
});

test('主题：默认跟随系统（自动检测不落盘），手动切换才记忆', () => {
  const head = extractScripts(loginHtml)[0];
  assert.ok(head.includes('matchMedia'), '应检测系统主题');
  assert.ok(!head.includes('setItem'), '自动检测结果不应写入 localStorage，否则无法继续跟随系统');
  assert.ok(head.includes('theme_manual'), '应迁移清除旧版自动检测残留（无手动标记的 theme）');
  assert.ok(head.includes("addEventListener('change'"), '应监听系统主题变化实时跟随');
  // 手动切换逻辑已移入静态 public/ui.js（可被浏览器缓存，不再内联）：校验静态文件语义
  const ui = fs.readFileSync(new URL('../public/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes("localStorage.setItem('theme'"), '手动切换应记忆到 localStorage');
  assert.ok(ui.includes("setItem('theme_manual'"), '手动切换应写入标记，与旧版残留区分');
  // 页面仍需引用静态脚本
  assert.ok(loginHtml.includes('/ui.js'), '登录页应引用静态 ui.js');
});
