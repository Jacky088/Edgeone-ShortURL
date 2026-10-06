// tests/pages.test.js
// 页面模板冒烟测试：HTML 结构完整性、关键交互元素、内嵌 <script> 可编译（无语法错误）。
// 运行方式：npm test（node --test）

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loginHtml, indexHtml, adminHtml, errorPageHtml, passwordHtml } from '../functions/pages.js';

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

test('主页：自定义短链输入检测——超出四类字符弹窗警告且不能生成短链', () => {
  assert.ok(indexHtml.includes('id="slug-warn-dialog"'), '应有格式警告弹窗');
  assert.ok(indexHtml.includes('const SLUG_BAD_RE = /[^a-zA-Z0-9_-]/'), '应有四类之外字符的检测正则');
  assert.ok(indexHtml.includes('const SLUG_BAD_RE_ALL = /[^a-zA-Z0-9_-]/g;'), '提取非法字符应用全局正则（报出全部而非首个）');
  assert.ok(indexHtml.includes('if (SLUG_BAD_RE.test(this.value)) warnInvalidSlug(this);'), '单条输入应实时弹窗警告');
  assert.ok(indexHtml.includes("t.classList.contains('br-slug')"), '批量行自定义短链应事件委托实时检测');
  assert.ok(indexHtml.includes("warnInvalidSlug(row.querySelector('.br-slug'))"), '批量提交拦截时应弹窗警告');
  assert.ok(indexHtml.includes('if (slugError) { showError(slugError); warnInvalidSlug(slugInput); return; }'), '单条提交拦截时应弹窗警告且终止提交');
  assert.ok(indexHtml.includes('已阻止生成短链'), '弹窗文案应明确本次不会生成短链');
  assert.ok(indexHtml.includes('仅可使用字母、数字、短横线、下划线'), '弹窗文案应说明允许的四类字符');
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

test('管理后台：窄窗口工具栏溢出收进「更多」菜单；窄屏批量行短链/备注同行', () => {
  assert.ok(adminHtml.includes('function syncToolbarOverflow'), '应有工具栏溢出收纳逻辑');
  assert.ok(adminHtml.includes("classList.add('overflowing')") && adminHtml.includes("classList.remove('overflowing')"), '收纳时加 overflowing 类，全放回时移除');
  assert.ok(adminHtml.includes("['export-json', 'json']"), '导出按钮应最先被收纳（从右往左）');
  assert.ok(adminHtml.includes('scheduleToolbarSync()'), '视图/回收站/徽标变化应触发重新测量');
  const css = fs.readFileSync(new URL('../public/app.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.table-toolbar.overflowing .more-wrap'), 'CSS 应在 overflowing 时显示「更多」按钮');
  assert.ok(css.includes('"idx url url del" "slug slug note note"'), '窄屏批量行第二行 短链+备注 满宽同行');
  assert.ok(css.includes('.bre-del:hover') && /bre-del \{[^}]*var\(--error\)[^}]*\}/.test(css), '删除钮应保持红色实心样式');
});

test('管理后台：设置分组标题为卡内竖条组头（不再用 fieldset legend 骑线）', () => {
  assert.ok(!adminHtml.includes('<fieldset'), '不应再使用 fieldset 骑线渲染');
  assert.ok(!adminHtml.includes('<legend>'), 'legend 应全部替换');
  const titles = ['安全', '短链', '统计与二维码', 'API Token'];
  for (const t of titles) {
    assert.ok(adminHtml.includes(`aria-label="${t}"`), `分组「${t}」应保留无障碍语义`);
    assert.ok(adminHtml.includes(`class="settings-group-title">${t}</h3>`), `分组「${t}」应为竖条组头`);
  }
  const css = fs.readFileSync(new URL('../public/app.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.settings-group-title') && css.includes('.settings-group-title::before'), 'CSS 应定义竖条组头样式');
});

test('管理后台：设置页含存储用量卡片（精确统计 + 缓存 + 重新统计）', () => {
  assert.ok(adminHtml.includes('aria-label="存储用量"'), '应有存储用量分组卡片');
  assert.ok(adminHtml.includes("'/api/usage'") || adminHtml.includes('"/api/usage"'), '应调用用量接口');
  assert.ok(adminHtml.includes('id="usage-scan"'), '应有重新统计按钮');
  assert.ok(adminHtml.includes('usage-grid') && adminHtml.includes('usage-note'), '应有统计值网格与说明行');
});

test('管理后台：设置保存逻辑——单保存按钮、改动统一提交、成功弹「保存已生效」', () => {
  assert.ok(!adminHtml.includes('settings-foot'), '底部保存条应已移除');
  assert.equal((adminHtml.match(/class="btn-primary settings-save-btn"/g) || []).length, 1, '应只有一个保存按钮（标题行右侧）');
  assert.ok(!adminHtml.includes('Logo 已启用，二维码即时生效'), 'Logo 上传不应再即时提交');
  assert.ok(adminHtml.includes('点击「保存设置」后生效'), 'Logo 上传/恢复应提示需保存生效');
  assert.ok(adminHtml.includes("showToastClosable('保存已生效', 3000)"), '保存成功应弹「保存已生效」（登录成功同款弹窗）');
  assert.ok(adminHtml.includes('logoDataUrl: qrLogoCustom'), '保存时应随表单提交 Logo 草稿（空串=恢复默认）');
  assert.ok(adminHtml.includes('QR_CFG.dark = payload.qr.dark'), '保存后应同步本页二维码内存配置');
});

test('管理后台：API Token 弹窗式生成——名称必填、仅显示一次、关闭即清除', () => {
  assert.ok(!adminHtml.includes('id="token-new"'), '内联明文展示应移除（改为弹窗）');
  assert.ok(!adminHtml.includes('id="token-copy"'), '旧内联复制按钮应移除');
  assert.ok(adminHtml.includes('id="token-dialog"'), '应有 Token 生成弹窗');
  assert.ok(adminHtml.includes('仅在本次弹窗中完整显示一次，关闭后无法再次查看'), '弹窗应有「仅显示一次」警示');
  assert.ok(adminHtml.includes('id="token-dialog-copy"'), '弹窗应有复制按钮');
  assert.ok(adminHtml.includes("showToast('请先输入 Token 名称（必填）', 'error')"), '留空名称应拒绝并弹窗提醒');
  assert.ok(adminHtml.includes("tokenDialog.addEventListener('close'"), '弹窗关闭应从 DOM 清除明文');
  assert.ok(adminHtml.includes('名称必填；Token 仅在生成弹窗中完整显示一次'), '卡片提示应说明新逻辑');
});

test('管理后台：审计修复项——时区偏移设置、加载失败禁保存、密码门限流配套', () => {
  assert.ok(adminHtml.includes('id="set-tz"'), '应有统计日界时区偏移设置项');
  assert.ok(adminHtml.includes('tzOffsetMin: Number(document.getElementById(\'set-tz\').value)'), '保存应提交时区偏移');
  assert.ok(adminHtml.includes('settingsReady'), '应有「未加载成功禁止保存」守卫');
  const css = fs.readFileSync(new URL('../public/app.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.settings-save-btn'), '保存按钮类应有 CSS 定义（A7）');
});

test('toast 提示唯一实现：全部页面由 ui.js 提供，内联脚本不含副本', () => {
  const ui = fs.readFileSync(new URL('../public/ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes('function showToast(text, type)'), 'ui.js 的 showToast 应支持 type 参数（error 红色样式）');
  assert.ok(ui.includes('function showToastClosable(text, duration)'), 'ui.js 应提供可关闭 toast');
  assert.ok(ui.includes('document.documentElement.appendChild'), 'toast 应挂在 html 上（视口锚定）');
  assert.ok((ui.match(/后来者替换/g) || []).length === 2, '两种 toast 应互斥替换（同时触发不叠放）');
  for (const [label, html] of [['登录页', loginHtml], ['主页', indexHtml], ['管理后台', adminHtml]]) {
    assert.ok(html.includes('/ui.js'), `${label} 应加载 ui.js`);
    assert.ok(!html.includes('function showToast'), `${label} 内联脚本不得定义 toast 副本（唯一实现在 ui.js）`);
  }
});

test('UI 走查优化落地：弹窗图标语义化、内联样式清理、批量上限、命中区', () => {
  const css = fs.readFileSync(new URL('../public/app.css', import.meta.url), 'utf8');
  // 弹窗标题图标：默认主色，危险弹窗用 .danger-title 转红（替代 4 处内联覆盖）
  assert.ok(css.includes('dialog h2 svg { width: 18px; height: 18px; color: var(--primary); }'), '弹窗标题图标应默认主色');
  assert.ok(css.includes('.danger-title svg { color: var(--error); }'), '危险弹窗应有 danger-title 修饰');
  assert.ok(!adminHtml.includes('style="color: var(--primary)"'), '管理弹窗不应再有内联主色覆盖');
  assert.ok((adminHtml.match(/class="danger-title"/g) || []).length === 1, '删除确认弹窗应加 danger-title（后台）');
  assert.ok((indexHtml.match(/class="danger-title"/g) || []).length === 1, 'slug 警告弹窗应加 danger-title（主页）');
  // 单按钮弹窗行：.row-btns.single 替代内联 grid-template-columns
  assert.ok(css.includes('.row-btns.single { grid-template-columns: 1fr; }'), '应有单按钮行修饰类');
  assert.ok(!adminHtml.includes('style="grid-template-columns: 1fr;"'), '弹窗底部不应再有内联单列样式');
  assert.ok((adminHtml.match(/class="row-btns single"/g) || []).length === 1, 'Token 弹窗应为 single 行（后台）');
  assert.ok((indexHtml.match(/class="row-btns single"/g) || []).length === 1, 'slug 警告弹窗应为 single 行（主页）');
  // 页脚链接 hover 反馈
  assert.ok(css.includes('.app-footer a:hover'), '页脚链接应有 hover 反馈');
  // 登录页眼睛按钮命中区 ≥44px
  assert.ok(/\.eye-btn \{[^}]*width: 44px/.test(css), '眼睛按钮命中区应为 44px');
  // 主页 slug 输入与批量行字号统一 .9rem
  assert.ok(css.includes('font-size: .9rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }\n#slug-input:focus'), 'slug 输入应归并到 .9rem');
  // 批量 20 行上限：添加按钮满员禁用 + 守卫提示（批量面板在主页）
  assert.ok(indexHtml.includes("querySelectorAll('.batch-row-edit').length >= 20"), '应有 20 行满员守卫');
  assert.ok(indexHtml.includes('一次最多 20 条，请先删除部分行'), '满员应在按钮 title 提示');
  // Token 空态统一 .empty 语义（紧凑档）
  assert.ok(adminHtml.includes("'empty empty-compact'"), 'Token 空态应统一 empty 语义');
  assert.ok(css.includes('.empty.empty-compact'), '应有紧凑空态样式');
  // 密码保护页：表单走 .auth-form + 错误块 .on 类（无内联样式按钮）
  assert.ok(passwordHtml({ slug: 'abc' }).includes('class="auth-form"'), '密码页表单应复用 auth-form 布局');
  assert.ok(passwordHtml({ slug: 'abc', error: 'x' }).includes('class="auth-error on"'), '密码页错误应走 .on 类');
  assert.ok(!passwordHtml({ slug: 'abc' }).includes('style='), '密码页不应残留内联样式');
  assert.ok(css.includes('.auth-error.on { display: block; }'), '服务端渲染错误应有 .on 显示规则');
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
