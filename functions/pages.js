// functions/pages.js
// 三个页面（登录页 / 主页 / 管理后台）的 HTML 模板。
import { QR_LIB_SRC } from './qr-src.js';

// 项目版本号：唯一来源，与 package.json 的 version 保持同步；
// 页脚、「关于项目」弹窗、登录页入口均从此常量读取。
// 静态资源版本：改 public/app.css|ui.js|qr-*.js 后同步 +1，使 <link>/<script src> 引用即时更新。
const APP_VERSION = '3.6.0';
const ASSET_VERSION = '3.9.16';

// GitHub 仓库与反馈入口（页脚、「关于项目」弹窗共用）
const REPO_URL = 'https://github.com/Jacky088/EdgeOne-ShortURL';
const ISSUES_URL = REPO_URL + '/issues';
// 统一设计系统（深科技蓝 + 青绿、日间/夜间模式、桌面/移动端响应式）在此维护一份，
// 由 buildPage() 组装；页面私有内容通过参数注入。
//
// 注意：本文件只负责 UI 展示。鉴权、KV 读写等全部逻辑仍在 functions/api/* 中，本文件未做任何改动。

// ==========================================
// 图标集 (inline SVG，stroke=currentColor，可随主题变色)
// ==========================================
function icon(paths, extra = '') {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;
}
const ICON_CHAIN = icon('<path d="M9 15l6-6"/><path d="M12.9 8.1l1.5-1.5a3.2 3.2 0 0 1 4.5 4.5l-1.5 1.5"/><path d="M11.1 15.9l-1.5 1.5a3.2 3.2 0 0 1-4.5-4.5l1.5-1.5"/>');
const ICON_LIST = icon('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>');
const ICON_CHART = icon('<path d="M6 20V10M11.5 20V4M17 20v-9M21 20H3"/>');
const ICON_EYE = icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
const ICON_CLOCK = icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const ICON_COPY = icon('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>');
const ICON_CHECK = icon('<path d="M4 12l5 5L20 6"/>');
const ICON_POWER = icon('<path d="M18.4 6.8a9 9 0 1 1-12.8 0"/><path d="M12 3v9"/>');
const ICON_ARROW = icon('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>');
const ICON_PENCIL = icon('<path d="M4 20l1.2-4.2L16 5l3 3-10.8 10.8L4 20z"/><path d="M13.5 7l3 3"/>');
const ICON_SHIELD = icon('<path d="M12 3l7 2.8v5c0 4.6-3.1 7.6-7 9.2-3.9-1.6-7-4.6-7-9.2v-5z"/><path d="M9 12l2 2 4-4.5"/>');
const ICON_BOLT = icon('<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>');
const ICON_EYE_OFF = icon('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>');
const ICON_SEARCH = icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>');
const ICON_REFRESH = icon('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>');
const ICON_TRASH = icon('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>');
const ICON_INFO = icon('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11.5V16"/>');
const ICON_X = icon('<path d="M18 6L6 18M6 6l12 12"/>');
const ICON_FEEDBACK = icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>');
const ICON_DOWNLOAD = icon('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>');
const ICON_SLIDERS = icon('<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>');
const ICON_QR = icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M21 14v4"/><path d="M14 21h3"/><path d="M21 21h.01"/>');
const ICON_PLUS = icon('<path d="M12 5v14"/><path d="M5 12h14"/>');
const ICON_MORE = icon('<circle cx="12" cy="5.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18.5" r="1"/>');
const ICON_WARN = icon('<path d="M10.3 4.1 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5"/><path d="M12 17h.01"/>');

// 品牌二维码中心 Logo（data URL，供 canvas 绘制，UTF-8 编码安全注入页面脚本）
const QR_LOGO_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c6bff"/><stop offset="1" stop-color="#1246b8"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(4.6 4.6) scale(0.95)"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g></svg>');

const ICON_SUN   = '<svg id="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>';
const ICON_MOON  = '<svg id="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const ICON_GITHUB = '<svg class="icon-github" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

// 品牌 Logo：深蓝圆角方块 + 白色链条（环形相扣，类 🔗，与 favicon.svg 一致）
function logoHtml(className) {
  return `<svg class="${className}" viewBox="0 0 32 32" aria-hidden="true">
        <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c6bff"/><stop offset="1" stop-color="#1246b8"/></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#logo-grad)"/>
        <g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(4.6 4.6) scale(0.95)">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </g>
      </svg>`;
}

// ==========================================
// 页面外壳（含头部防闪烁的主题预载脚本）
// ==========================================
// 静态资源版本见顶部 ASSET_VERSION（改 public/ 文件后同步 bump）。
function staticCssLink() {
  return `    <link rel="stylesheet" href="/app.css?v=${ASSET_VERSION}">\n`;
}
// 页面脚本：公共 ui.js（主题/Toast/注销/格式化/关于） + 按需的二维码库；
// 旧版页内 `css` 参数保留兼容（错误页等仍可传额外样式），但主体样式走静态文件。
// 注意：静态脚本不用 defer——body 末尾的内联业务脚本在解析期就调用
// showToastClosable/numberFormat/getLinks 等（定义在 ui.js），必须保证按文档顺序先执行。
function buildPage({ title, extraHead = '', css = '', body, script, scripts = [] }) {
  const links = staticCssLink();
  const inlineCss = css ? `    <style>\n${css}    </style>\n` : '';
  const scriptTags = scripts.map((s) => `    <script src="${s}"></script>\n`).join('');
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#eef4fe">
    <title>${title}</title>
    <script>(function(){try{var mq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;var t=null;try{t=localStorage.getItem('theme')}catch(e){}if(t){var mm=null;try{mm=localStorage.getItem('theme_manual')}catch(e){}if(mm!=='1'){try{localStorage.removeItem('theme')}catch(e){}t=null}}if(t!=='light'&&t!=='dark'){t=(mq&&mq.matches)?'dark':'light'}document.documentElement.setAttribute('data-theme',t);var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.content=t==='dark'?'#0a1026':'#eef4fe';if(mq){var follow=function(e){var s=null;try{s=localStorage.getItem('theme')}catch(err){}if(s!=='light'&&s!=='dark'){var nt=e.matches?'dark':'light';document.documentElement.setAttribute('data-theme',nt);if(mc)mc.content=nt==='dark'?'#0a1026':'#eef4fe'}};mq.addEventListener?mq.addEventListener('change',follow):mq.addListener&&mq.addListener(follow)}}catch(e){document.documentElement.setAttribute('data-theme','light')}})();</script>
${extraHead}${links}${inlineCss}${scriptTags}</head>
<body>
${body}<script>
${script}</script>
</body>
</html>`;
}

function decoHtml() {
  return `<div class="deco" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

// ==========================================
// 公共 HTML 片段
// ==========================================
function themeToggleHtml() {
  return `<button type="button" class="icon-btn" id="theme-toggle" title="切换日间/夜间模式" aria-label="切换日间/夜间模式">${ICON_MOON}${ICON_SUN}</button>`;
}

function githubHtml() {
  return `<a class="icon-btn" href="https://github.com/Jacky088/EdgeOne-ShortURL" target="_blank" rel="noopener noreferrer" title="GitHub: Jacky088/EdgeOne-ShortURL">${ICON_GITHUB}</a>`;
}

function brandHtml() {
  return `<div class="brand">${logoHtml('brand-logo')}
      <div class="brand-text"><span class="brand-name">EdgeOne-ShortURL</span><span class="brand-sub">基于 EO 的一个短链接转换服务</span></div>
    </div>`;
}

// 统计卡片区：主页与管理后台共用同一片段，避免两份实现漂移
function statsGridHtml(visitsLabel) {
  return `<div class="stats-grid">
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_EYE}</span>${visitsLabel}</div><b class="stat-value" id="stat-visits">–</b></div>
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CHAIN}</span>短链数量</div><b class="stat-value" id="stat-links">–</b></div>
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CLOCK}</span>最近创建</div><b class="stat-value" id="stat-created">–</b></div>
                </div>`;
}

// 统一页脚（主页 / 管理后台 / 登录页共用一份文案，始终渲染在 .app 末尾吸底）
// 版权与反馈链接自适应换行：大窗口一行（nowrap），窄屏自动两行（white-space 恢复），无需 <br> 硬切
function appFooterHtml() {
  return `<footer class="app-footer"><span>运行在 EdgeOne Pages · v${APP_VERSION}</span><span class="foot-links"><a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">开源项目</a> · <a href="${ISSUES_URL}" target="_blank" rel="noopener noreferrer">问题反馈</a></span></footer>`;
}

// 前台顶栏「管理后台」入口：由服务端按 ADMIN_PATH 是否配置决定渲染（__ADMIN_TOP_BUTTON__ 占位符）
export const ADMIN_BUTTON_HTML = `<a class="text-btn btn-blue goto-admin" href="#">${ICON_SHIELD}<span>管理后台</span></a>`;

// 登录页右上角动作区（不设「管理后台」入口：登录成功即进入系统，该入口在登录页只会造成困惑）
function loginActionsHtml() {
  return `<div class="auth-top">
      ${githubHtml()}
      ${themeToggleHtml()}
    </div>`;
}

// 生成已登录状态的动作区（管理后台页使用；主页动作区因含条件渲染的管理入口而单独组装）
// 「返回前台」固定在动作区第一位；「关于」图标按钮仅在侧边栏隐藏的窄屏显示
// （宽屏由侧边栏的「关于项目」承担，窄屏底部导航已移除关于项，由它补位）
function authedActionsHtml({ admin = false, backHome = false } = {}) {
  return `<div class="top-actions">
      ${backHome ? `<a class="text-btn btn-blue" href="/">${ICON_ARROW}<span>返回前台</span></a>` : ''}
      ${admin ? `<a class="text-btn goto-admin" href="#">${ICON_SHIELD}<span>管理后台</span></a>` : ''}
      ${githubHtml()}
      <button type="button" class="icon-btn open-about about-top" aria-label="关于项目">${ICON_INFO}</button>
      ${themeToggleHtml()}
      <button type="button" class="text-btn" id="logout-btn">${ICON_POWER}<span>注销</span></button>
    </div>`;
}

// ==========================================
// 公共脚本片段
// ==========================================
// 主题切换（默认跟随系统，手动切换后记忆到 localStorage）
const themeJs = `
      (function () {
        const htmlEl = document.documentElement;
        const moon = document.getElementById('icon-moon');
        const sun = document.getElementById('icon-sun');
        function syncIcons(mode) { if (moon) moon.style.display = mode === 'dark' ? 'none' : 'block'; if (sun) sun.style.display = mode === 'dark' ? 'block' : 'none'; }
        function setTheme(mode) {
          htmlEl.setAttribute('data-theme', mode);
          try { localStorage.setItem('theme', mode); localStorage.setItem('theme_manual', '1'); } catch (e) {}
          syncIcons(mode);
          const mc = document.querySelector('meta[name="theme-color"]');
          if (mc) mc.content = mode === 'dark' ? '#0a1026' : '#eef4fe';
          // 切换瞬间开启全局过渡，让卡片/输入框随主题平滑变化（400ms 后移除，避免影响交互动画）
          htmlEl.classList.add('theme-anim');
          clearTimeout(setTheme._t);
          setTheme._t = setTimeout(function () { htmlEl.classList.remove('theme-anim'); }, 400);
        }
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.addEventListener('click', () => setTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
        syncIcons(htmlEl.getAttribute('data-theme') || 'light');
      })();
`;

// toast 提示唯一实现在 public/ui.js（showToast / showToastClosable，全部页面 head 同步加载）；
// 此处不再保留内嵌副本——旧 toastJs 副本缺 type 参数，一旦恢复使用会让错误提示退化为中性样式。

// 管理后台入口逻辑（ADMIN_PATH 由服务端通过 __ADMIN_PATH_STATUS__ 注入）
// 已登录页面的入口渲染为 <a class="goto-admin">：JS 负责补上真实路径（路径不写死在 HTML 里），
// 浏览器默认导航因此支持中键 / 新标签页打开；登录页入口保持 <button>，仅提示并聚焦口令框。
const adminLinkJs = `
      const adminPathStatus = __ADMIN_PATH_STATUS__;
      function adminUrl(view) {
        const base = '/' + String(adminPathStatus).replace(/^\\/+/, '');
        return view ? base + '?view=' + encodeURIComponent(view) : base;
      }
      function gotoAdmin() { if (!adminPathStatus) { showToast('您未设置开启管理后台'); return; } window.location.href = adminUrl(); }
      // goto-admin 链接：带视图参数的入口直达管理后台对应视图（列表 / 统计），无参数则进默认视图
      document.querySelectorAll('a.goto-admin').forEach(function (a) { a.href = adminPathStatus ? adminUrl(a.dataset.adminView) : '#'; });
      document.querySelectorAll('.goto-admin').forEach(btn => btn.addEventListener('click', function (e) {
        if (!adminPathStatus) { e.preventDefault(); showToast(btn.dataset.note || '您未设置开启管理后台'); return; }
        if (btn.dataset.note) { e.preventDefault(); showToast(btn.dataset.note); const pw = document.getElementById('password'); if (pw) pw.focus(); return; }
        if (btn.tagName !== 'A') { e.preventDefault(); gotoAdmin(); }
      }));
`;

const logoutJs = `
      (function () {
        const btn = document.getElementById('logout-btn');
        if (!btn) return;
        btn.addEventListener('click', async () => {
          const label = btn.querySelector('span');
          btn.disabled = true;
          if (label) label.textContent = '注销中…';
          try {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (!res.ok) throw new Error('注销失败');
            window.location.href = '/';
          } catch (err) {
            if (label) label.textContent = '注销';
            btn.disabled = false;
            showToast('注销失败，请稍后重试');
          }
        });
      })();
`;

// 登录成功欢迎提醒：登录页在 reload 前写入 sessionStorage 标记，
// 落地页（主页 / 管理后台）读取后展示可关闭提醒，3 秒自动消失
const loginToastJs = (text) => `
      (function () {
        try {
          if (sessionStorage.getItem('login_success') !== '1') return;
          sessionStorage.removeItem('login_success');
          // 有待恢复的未完成创建时，改由「已恢复内容」提示代替，避免两条提示重叠
          if (sessionStorage.getItem('pending_create_url')) return;
          showToastClosable('${text}', 3000);
        } catch (e) {}
      })();
`;

// 通用格式化工具
const fmtUtilJs = `
      function pad2(n) { return String(n).padStart(2, '0'); }
      function numberFormat(n) { try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return String(n || 0); } }
      function fmtDateShort(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
      function fmtDateTime(ts) { const d = new Date(ts); return fmtDateShort(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
      function fmtFullDateTime(ts) { const d = new Date(ts); return fmtDateShort(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
      function dayKey(d) { return '' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
      function fmtRelativeDay(ts) {
        const d = new Date(ts);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffDays = Math.round((today - thatDay) / 86400000);
        if (diffDays <= 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays <= 30) return diffDays + ' 天前';
        return fmtDateShort(ts);
      }
      // 「最近创建」统计值：相对日期 + 悬停显示完整时间，文本型值自动缩小字号
      function setStatDate(el, ts) {
        if (!el) return;
        if (ts) { el.textContent = fmtRelativeDay(ts); el.title = fmtFullDateTime(ts); el.classList.add('stat-value-text'); }
        else { el.textContent = '—'; el.removeAttribute('title'); el.classList.remove('stat-value-text'); }
      }
`;

// 「关于项目」弹窗：主页 / 管理后台 / 登录页三处共用，版本号取自 APP_VERSION
function aboutDialogHtml() {
  return `<dialog id="about-dialog">
    <button type="button" class="about-close" data-close-about aria-label="关闭">${ICON_X}</button>
    <div class="about-card">
        ${logoHtml('about-logo')}
        <h2>EdgeOne-ShortURL</h2>
        <p class="about-sub">基于 EO 的无服务器短链接转换服务</p>
        <span class="version-badge">v${APP_VERSION}</span>
        <p class="about-desc">基于腾讯云 EdgeOne Pages 无服务器函数与 KV 存储打造的短链接生成与跳转服务。免费开源、无需维护服务器，支持自定义短链、访问统计、日间 / 夜间主题与移动端自适应。</p>
        <div class="about-info">
            <div class="about-info-row"><span class="k">运行平台</span><span class="v">EdgeOne Pages</span></div>
            <div class="about-info-row"><span class="k">技术架构</span><span class="v">Pages Functions + KV</span></div>
            <div class="about-info-row"><span class="k">开源协议</span><span class="v">MIT License</span></div>
            <div class="about-info-row"><span class="k">当前版本</span><span class="v">v${APP_VERSION}</span></div>
        </div>
        <div class="row-btns">
            <a class="btn-ghost" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">${ICON_GITHUB}<span>GitHub 仓库</span></a>
            <a class="btn-ghost" href="${ISSUES_URL}" target="_blank" rel="noopener noreferrer">${ICON_FEEDBACK}<span>问题反馈</span></a>
        </div>
    </div>
</dialog>`;
}

// 「关于项目」打开逻辑：所有 .open-about 入口（侧边栏栏目 / 登录页入口）共用
const aboutJs = `
      (function () {
        const dlg = document.getElementById('about-dialog');
        if (!dlg) return;
        function openAbout() { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
        document.querySelectorAll('.open-about').forEach(function (el) {
          el.addEventListener('click', function (e) { e.preventDefault(); openAbout(); });
        });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        const closeBtn = dlg.querySelector('.about-close');
        if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
      })();
`;

// ==========================================
// 1. 登录页面
// ==========================================
export const loginHtml = buildPage({
  title: '访问验证',
  extraHead: `    <meta name="description" content="短链接在线生成，支持长链接缩短，免费开源，提供API接口。" />\n`,
  scripts: [`/ui.js?v=${ASSET_VERSION}`],
  body: decoHtml() + loginActionsHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <h1>EdgeOne-ShortURL</h1>
        <p class="auth-sub">基于 EO 的一个短链接转换服务</p>
        <div class="auth-divider"></div>
        <p class="auth-label">请输入访问口令</p>
        <form class="auth-form" id="login-form">
            <div class="pw-wrap">
                <input type="password" id="password" placeholder="输入口令…" autocomplete="current-password" required autofocus>
                <button type="button" class="eye-btn" id="pw-toggle" aria-label="显示口令" aria-pressed="false" title="显示/隐藏口令">${ICON_EYE}</button>
            </div>
            <button type="submit" class="btn-primary" id="btn">${ICON_SHIELD}<span>验证</span></button>
        </form>
        <div class="auth-error" id="error-msg">口令错误</div>
        <button type="button" class="auth-about open-about">${ICON_INFO}<span>关于项目 · v${APP_VERSION}</span></button>
    </div>
    ${appFooterHtml()}
</div>
` + aboutDialogHtml(),
  script: `
        // 口令可见性切换（显示/隐藏）
        (function () {
            const toggle = document.getElementById('pw-toggle');
            const input = document.getElementById('password');
            if (!toggle || !input) return;
            toggle.addEventListener('click', function () {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                toggle.innerHTML = show ? '${ICON_EYE_OFF}' : '${ICON_EYE}';
                toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
                toggle.setAttribute('aria-label', show ? '隐藏口令' : '显示口令');
                input.focus();
            });
        })();
        // 登录逻辑（与原实现一致：POST /api/auth，成功后刷新页面）
        (function () {
            const form = document.getElementById('login-form');
            const btn = document.getElementById('btn');
            const errMsg = document.getElementById('error-msg');
            const label = btn.querySelector('span');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                btn.disabled = true;
                label.textContent = '验证中…';
                const password = document.getElementById('password').value;
                try {
                    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password }) });
                    if (res.ok) { try { sessionStorage.setItem('login_success', '1'); } catch (err) {} window.location.reload(); return; }
                    let message = '口令错误';
                    try { const data = await res.json(); if (data.error) message = data.error; } catch (err) {}
                    errMsg.textContent = message;
                    errMsg.style.display = 'block';
                    btn.disabled = false;
                    label.textContent = '验证';
                } catch (err) {
                    errMsg.textContent = '网络错误';
                    errMsg.style.display = 'block';
                    btn.disabled = false;
                    label.textContent = '验证';
                }
            });
        })();
        // 会话过期后由主页跳转而来：提示重新登录（已填内容已保存，登录后自动恢复）
        try { if (sessionStorage.getItem('pending_create_url')) showToastClosable('登录已过期，请重新登录后继续创建短链', 3200); } catch (err) {}
`
});

// ==========================================
// 2. 主生成器页面（仪表盘：创建短链 / 短链列表 / 访问统计）
// ==========================================
export const indexHtml = buildPage({
  title: '短链接生成服务',
  extraHead: `    <meta name="description" content="短链接在线生成，支持长链接缩短，免费开源，提供API接口。" />\n`,
  scripts: [`/qr-lib.js?v=${ASSET_VERSION}`, `/qr-draw.js?v=${ASSET_VERSION}`, `/ui.js?v=${ASSET_VERSION}`],
  body: decoHtml() + `
<div class="app">
    <header class="app-header">
        ${brandHtml()}
        <div class="top-actions">
            __ADMIN_TOP_BUTTON__
            ${githubHtml()}
            ${themeToggleHtml()}
            <button type="button" class="text-btn" id="logout-btn">${ICON_POWER}<span>注销</span></button>
        </div>
    </header>
    <main class="content">
            <section class="card">
                <div class="card-title-row">
                    <h2 class="card-title">${ICON_CHAIN}<span>创建短链</span></h2>
                    <!-- 单条 / 批量互斥模式切换：真实滑块元素随选中项移动 -->
                    <div class="mode-switch" id="mode-switch" role="tablist" aria-label="创建方式">
                        <span class="mode-thumb" aria-hidden="true"></span>
                        <button type="button" class="mode-btn" id="mode-single" role="tab" aria-selected="true" aria-controls="pane-single">单条</button>
                        <button type="button" class="mode-btn" id="mode-batch" role="tab" aria-selected="false" aria-controls="pane-batch" tabindex="-1">${ICON_LIST}<span>批量</span></button>
                    </div>
                </div>
                <form id="link-form" novalidate>
                    <!-- 单条模式面板：桌面 链接行→自定义+按钮行 两行；窄屏 stack 类切为
                         目标链接→自定义短链→生成按钮 三行（与自定义布局同构） -->
                    <div class="mode-pane pane-single-stack" id="pane-single" role="tabpanel" aria-label="单条创建">
                        <div class="url-row">
                            <label class="slug-label" for="url-input">目标链接</label>
                            <input type="url" id="url-input" placeholder="https://www.example.com/very-long-url" autocomplete="url" enterkeyhint="go" required>
                        </div>
                        <div class="slug-row">
                            <label class="slug-label" for="slug-input">自定义短链</label>
                            <input type="text" id="slug-input" maxlength="64" placeholder="留空则随机生成" autocomplete="off" spellcheck="false">
                            <span class="slug-count" id="slug-count"></span>
                            <button type="submit" class="btn-primary" id="submit-btn">${ICON_CHAIN}<span>生成短链</span></button>
                        </div>
                        <p class="hint-line">仅支持 http/https 开头的完整链接；自定义短链可使用字母、数字、短横线、下划线，最长 64 位。</p>
                    </div>
                    <!-- 批量模式面板：同一时间只显示一个，切换不丢已填内容 -->
                    <div class="mode-pane" id="pane-batch" role="tabpanel" aria-label="批量创建" hidden>
                        <div class="batch-rows" id="batch-rows"></div>
                        <div class="batch-ops">
                            <button type="button" class="btn-ghost batch-op" id="batch-add">${ICON_PLUS}<span>添加一行</span></button>
                            <button type="button" class="btn-ghost batch-op" id="batch-import-toggle" aria-expanded="false" aria-controls="batch-import">${ICON_PENCIL}<span>从文本导入</span></button>
                            <button type="button" class="btn-ghost batch-op" id="batch-clear">${ICON_TRASH}<span>清空</span></button>
                        </div>
                        <div class="batch-import-wrap" id="batch-import-wrap" hidden>
                            <p class="settings-hint">支持两种方式导入：① 将文本内容粘贴到下方输入框，每行一条；② 直接选择 .txt / .csv 文件导入，每行一条，一次最多 20 条。格式：链接 [自定义短链] [备注]（空格分隔）</p>
                            <textarea id="batch-import" rows="3" placeholder="https://example.com/a my-link&#10;https://example.com/b"></textarea>
                            <div class="batch-import-ops">
                                <label class="btn-ghost batch-op">选择 .txt / .csv 文件<input type="file" id="batch-import-file" accept=".txt,.csv,text/plain,text/csv" hidden></label>
                                <button type="button" class="btn-ghost batch-op" id="batch-import-go">确认导入</button>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary batch-submit">${ICON_CHAIN}<span>生成短链</span></button>
                        <p class="hint-line">每行生成一条短链，「自定义短链 / 备注」可逐行填写（留空则随机生成）；「更多选项」将应用到全部，一次最多 20 条。</p>
                    </div>
                    <!-- 更多选项：两种模式共享（单条作用于本条，批量应用到全部），
                         置于两个面板之外，切换模式时保持展开状态与已填值 -->
                    <div class="form-toggles opts-shared">
                        <button type="button" class="slug-toggle" id="opts-toggle" aria-expanded="false" aria-controls="opts-panel">${ICON_SLIDERS}<span>更多选项</span></button>
                    </div>
                    <div class="opts-panel" id="opts-panel" hidden>
                        <div class="opts-grid">
                            <label for="opt-ttl">有效期
                                <select id="opt-ttl">
                                    <option value="0">永久有效</option>
                                    <option value="1">1 天</option>
                                    <option value="7">7 天</option>
                                    <option value="30">30 天</option>
                                    <option value="90">90 天</option>
                                </select>
                            </label>
                            <label for="opt-max">次数上限
                                <input type="number" id="opt-max" min="1" step="1" placeholder="不限">
                            </label>
                            <label for="opt-pwd">访问密码
                                <input type="password" id="opt-pwd" maxlength="64" placeholder="无（公开访问）" autocomplete="new-password">
                            </label>
                            <label for="opt-note">备注
                                <input type="text" id="opt-note" maxlength="100" placeholder="选填，仅管理后台可见">
                            </label>
                        </div>
                    </div>
                    <div class="message error" id="error-message"></div>
                </form>
            </section>

            <section class="card" id="result-card" hidden>
                <h2 class="card-title">${ICON_CHECK}<span>生成结果</span></h2>
                <!-- 单条结果：与批量结果同款行样式（行内二维码缩略图 + 短链 + 复制），由 JS 填充 -->
                <div id="result-single" hidden></div>
                <!-- 批量结果：每行 短链 + 行内二维码 + 复制；仅批量模式创建后显示 -->
                <div id="result-list" hidden></div>
                <p class="hint-line" id="result-hint">短链已创建成功，点击链接可跳转原文并累计访问次数；也可扫码在手机上打开。</p>
            </section>

        </main>
        ${appFooterHtml()}
</div>
<dialog id="slug-warn-dialog">
    <h2 class="danger-title">${ICON_WARN}<span>自定义短链格式有误</span></h2>
    <p class="dialog-text" id="slug-warn-text"></p>
    <div class="row-btns single">
        <button type="button" class="btn-primary" id="slug-warn-ok">好的，我来修改</button>
    </div>
</dialog>
<dialog id="conflict-dialog">
    <h2 class="danger-title">${ICON_WARN}<span>链接已存在，请修改后重试</span></h2>
    <p class="dialog-text" id="conflict-text"></p>
    <div class="conflict-list" id="conflict-list"></div>
    <div class="row-btns single">
        <button type="button" class="btn-primary" id="conflict-ok">好的，我来修改</button>
    </div>
</dialog>
<dialog id="qr-zoom-dialog">
    <button type="button" class="dialog-x" id="qr-zoom-close" aria-label="关闭">${ICON_X}</button>
    <h2>${ICON_QR}<span>短链二维码</span></h2>
    <p class="dialog-text" id="qr-zoom-label"></p>
    <div class="qr-view"><canvas id="qr-zoom-canvas" aria-label="短链二维码"></canvas></div>
    <div class="row-btns">
        <button type="button" class="btn-primary" id="qr-zoom-download">${ICON_DOWNLOAD}<span>下载 PNG</span></button>
        <button type="button" class="btn-ghost" id="qr-zoom-copy">复制链接</button>
    </div>
</dialog>
`,
  script: adminLinkJs + `
        // 二维码运行时配置：由服务端注入（__QR_SETTINGS__），挂到 window 供 qr-draw.js 读取；
        // 登录欢迎语：ui.js 通过 body[data-login-toast] 读取展示。
        window.__QR_CFG__ = __QR_SETTINGS__;
        window.__QR_LOGO_SRC__ = '${QR_LOGO_DATA_URL}';
        try { if (document.body) document.body.setAttribute('data-login-toast', '登录成功，现在可以创建短链接了。'); } catch (e) {}
        // 创建短链逻辑（与原实现一致：POST /api/create）
        (function () {
            const form = document.getElementById('link-form');
            const urlInput = document.getElementById('url-input');
            const slugInput = document.getElementById('slug-input');
            const slugCount = document.getElementById('slug-count');
            const submitBtn = document.getElementById('submit-btn');
            const errorMessage = document.getElementById('error-message');
            const resultCard = document.getElementById('result-card');
            const urlRow = document.querySelector('.url-row');
            const slugRowEl = document.querySelector('.slug-row');
            const optsToggle = document.getElementById('opts-toggle');
            const optsPanel = document.getElementById('opts-panel');
            // 单条/批量互斥模式：两个 tab 按钮 + 两个面板，mode 为唯一状态源
            const modeSwitch = document.getElementById('mode-switch');
            const modeSingleBtn = document.getElementById('mode-single');
            const modeBatchBtn = document.getElementById('mode-batch');
            const paneSingle = document.getElementById('pane-single');
            const paneBatch = document.getElementById('pane-batch');
            const batchRowsEl = document.getElementById('batch-rows');
            const batchImportWrap = document.getElementById('batch-import-wrap');
            const batchImportEl = document.getElementById('batch-import');
            const ICON_COPY_SVG = '${ICON_COPY}';
            const ICON_X_SVG = '${ICON_X}';
            const optTtl = document.getElementById('opt-ttl');
            const optMax = document.getElementById('opt-max');
            const optPwd = document.getElementById('opt-pwd');
            const optNote = document.getElementById('opt-note');
            const resultList = document.getElementById('result-list');
            const resultSingle = document.getElementById('result-single');
            const slugWarnDialog = document.getElementById('slug-warn-dialog');
            const slugWarnText = document.getElementById('slug-warn-text');
            const slugWarnOk = document.getElementById('slug-warn-ok');
            // 二维码样式来自运行时设置（服务端注入到 window.__QR_CFG__，见本脚本头部）
            const submitLabel = submitBtn.querySelector('span');

            // ---------- 单条 / 批量模式切换 ----------
            // 显式 mode 状态：'single' | 'batch'。两个面板各含完整表单体与提交按钮，
            // 切换只改显隐，不清值——两模式输入互不覆盖，来回切换不丢已填内容。
            // 批量行编辑器首次进入时初始化 3 行（惰性，避免载入即建 DOM）。
            // 注意：setCreateMode 必须先于 restorePending 定义——批量草稿恢复依赖它。
            let createMode = 'single';
            // 滑块：移动 .mode-thumb 到当前模式按钮下方（像素取自按钮几何，
            // 两按钮不等宽/手机全宽等分都能对齐）；resize 时重算
            const modeThumb = modeSwitch.querySelector('.mode-thumb');
            function syncModeThumb() {
                const btn = createMode === 'batch' ? modeBatchBtn : modeSingleBtn;
                modeThumb.style.width = btn.offsetWidth + 'px';
                modeThumb.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
            }
            window.addEventListener('resize', syncModeThumb);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncModeThumb).catch(function () {});
            function setCreateMode(mode) {
                if (mode === createMode) return;
                createMode = mode;
                const batch = mode === 'batch';
                paneSingle.hidden = batch;
                paneBatch.hidden = !batch;
                // 滑块胶囊位移到当前按钮下方
                syncModeThumb();
                modeSingleBtn.setAttribute('aria-selected', batch ? 'false' : 'true');
                modeSingleBtn.tabIndex = batch ? -1 : 0;
                modeBatchBtn.setAttribute('aria-selected', batch ? 'true' : 'false');
                modeBatchBtn.tabIndex = batch ? 0 : -1;
                errorMessage.style.display = 'none';
                if (batch) {
                    if (!batchRowsEl.children.length) { batchAddRow(); batchAddRow(); batchAddRow(); }
                    const first = batchRowsEl.querySelector('.br-url');
                    if (first) first.focus();
                } else {
                    urlInput.focus();
                }
            }
            syncModeThumb();

            // 恢复会话过期前未提交的内容（登录成功回到本页时触发）
            (function restorePending() {
                let savedUrl = '', savedSlug = '';
                try {
                    savedUrl = sessionStorage.getItem('pending_create_url') || '';
                    savedSlug = sessionStorage.getItem('pending_create_slug') || '';
                } catch (err) { return; }
                if (!savedUrl) return;
                try { sessionStorage.removeItem('pending_create_url'); sessionStorage.removeItem('pending_create_slug'); } catch (err) {}
                if (savedUrl.includes('\\n')) {
                    // 批量草稿：切到批量模式，按行回填（每行「链接 [短链]」）。
                    // 批量模式惰性建行：setCreateMode 已建 3 行空行，草稿行追加在其后，
                    // 提交时空行会被跳过，不影响结果
                    setCreateMode('batch');
                    savedUrl.split('\\n').forEach(function (line) {
                        const tokens = line.trim().split(/\\s+/).filter(Boolean);
                        if (tokens.length) batchAddRow(tokens[0], tokens[1] || '');
                    });
                    // 聚焦第一个「非空」草稿行（querySelector 会命中惰性空行，需过滤）
                    const firstDraft = [...batchRowsEl.querySelectorAll('.br-url')].find(function (i) { return i.value; });
                    if (firstDraft) firstDraft.focus();
                } else {
                    urlInput.value = savedUrl;
                    if (savedSlug) {
                        slugInput.value = savedSlug;
                        slugCount.textContent = savedSlug.length + '/64';
                    }
                }
                showToastClosable('已恢复上次填写的内容，点击「生成短链」继续。', 3600);
                if (!savedUrl.includes('\\n')) urlInput.focus();
            })();

            // 「更多选项」共享面板切换：对两种模式生效（单条作用于本条，批量应用到全部）；
            // 面板在两个模式面板之外，切换模式时保持展开状态与已填值
            optsToggle.addEventListener('click', () => {
                const opening = optsPanel.hidden;
                optsPanel.hidden = !opening;
                optsToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
            });

            // ---------- 单条 / 批量模式切换 ----------
            // tab 键盘导航：左右方向键在两个模式间移动（role=tablist 惯例）
            modeSingleBtn.addEventListener('click', function () { setCreateMode('single'); });
            modeBatchBtn.addEventListener('click', function () { setCreateMode('batch'); });
            document.querySelector('.mode-switch').addEventListener('keydown', function (e) {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                const next = createMode === 'single' ? 'batch' : 'single';
                setCreateMode(next);
                (next === 'single' ? modeSingleBtn : modeBatchBtn).focus();
            });

            // ---------- 批量逐行编辑器 ----------
            // 批量行结构：序号 + 目标链接 + 自定义短链 + 备注 + 删除（宽屏一行排开，窄屏自动换行）
            function batchAddRow(url = '', slug = '', note = '') {
                const row = document.createElement('div');
                row.className = 'batch-row-edit';
                const idx = document.createElement('span');
                idx.className = 'bre-idx';
                const urlIn = document.createElement('input');
                urlIn.type = 'url';
                urlIn.className = 'br-url';
                urlIn.placeholder = 'https:// 目标链接（必填）';
                urlIn.value = url;
                urlIn.autocomplete = 'off';
                urlIn.spellcheck = false;
                const slugIn = document.createElement('input');
                slugIn.type = 'text';
                slugIn.className = 'br-slug';
                slugIn.maxLength = 64;
                slugIn.placeholder = '自定义短链（可选，留空随机）';
                slugIn.value = slug;
                slugIn.autocomplete = 'off';
                slugIn.spellcheck = false;
                const noteIn = document.createElement('input');
                noteIn.type = 'text';
                noteIn.className = 'br-note';
                noteIn.maxLength = 100;
                noteIn.placeholder = '备注（可选）';
                noteIn.value = note;
                noteIn.autocomplete = 'off';
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'bre-del';
                del.innerHTML = ICON_X_SVG;
                del.title = '删除此行';
                del.setAttribute('aria-label', '删除此行');
                del.addEventListener('click', function () { row.remove(); renumberBatchRows(); });
                row.append(idx, urlIn, slugIn, noteIn, del);
                batchRowsEl.appendChild(row);
                renumberBatchRows();
                return row;
            }
            function renumberBatchRows() {
                [...batchRowsEl.querySelectorAll('.batch-row-edit')].forEach(function (row, i) {
                    row.querySelector('.bre-idx').textContent = String(i + 1);
                });
                // 满员状态同步：20 行上限在「添加一行」按钮上即时呈现（禁用 + 提示），
                // 而不是等提交才报错；删行 / 清空 / 导入后自动恢复
                const addBtn = document.getElementById('batch-add');
                if (addBtn) {
                    const full = batchRowsEl.querySelectorAll('.batch-row-edit').length >= 20;
                    addBtn.disabled = full;
                    addBtn.title = full ? '一次最多 20 条，请先删除部分行' : '';
                }
            }
            function clearBatchRows() {
                batchRowsEl.textContent = '';
                batchAddRow(); batchAddRow(); batchAddRow();
            }
            document.getElementById('batch-add').addEventListener('click', function () {
                if (batchRowsEl.querySelectorAll('.batch-row-edit').length >= 20) { showToast('一次最多 20 条'); return; }
                batchAddRow();
                const rows = batchRowsEl.querySelectorAll('.batch-row-edit');
                rows[rows.length - 1].querySelector('.br-url').focus();
            });
            document.getElementById('batch-clear').addEventListener('click', function () {
                clearBatchRows();
                showToast('已清空，可重新填写');
            });
            document.getElementById('batch-import-toggle').addEventListener('click', function () {
                const opening = batchImportWrap.hidden;
                batchImportWrap.hidden = !opening;
                this.setAttribute('aria-expanded', opening ? 'true' : 'false');
                if (opening) batchImportEl.focus();
            });
            // 从文本导入：每行「链接 [自定义短链] [备注…]」，空格分隔
            // 从文本导入（粘贴 / 文件共用）：每行「链接 [自定义短链] [备注…]」；
            // 总行数不超过 20 条，超出部分截断并提示
            function importLinesToRows(lines) {
                const existing = batchRowsEl.querySelectorAll('.batch-row-edit').length;
                const room = Math.max(0, 20 - existing);
                let imported = 0;
                lines.forEach(function (line, li) {
                    if (li >= room) return;
                    const tokens = String(line).trim().split(/\\s+/).filter(Boolean);
                    if (!tokens.length) return;
                    batchAddRow(tokens[0], tokens[1] || '', tokens.slice(2).join(' '));
                    imported++;
                });
                if (imported) {
                    showToast(room < lines.length
                        ? '已导入前 ' + imported + ' 行（超出 20 条上限，其余未导入）'
                        : '已导入 ' + imported + ' 行');
                } else {
                    showToast(room === 0 ? '已达 20 条上限，无法继续导入' : '没有可导入的内容');
                }
            }
            document.getElementById('batch-import-go').addEventListener('click', function () {
                const lines = batchImportEl.value.split('\\n').map(s => s.trim()).filter(Boolean);
                importLinesToRows(lines);
                batchImportEl.value = '';
                batchImportWrap.hidden = true;
                document.getElementById('batch-import-toggle').setAttribute('aria-expanded', 'false');
            });
            // 从 .txt / .csv 文件导入（按行解析，格式与文本粘贴一致）
            document.getElementById('batch-import-file').addEventListener('change', function () {
                const file = this.files && this.files[0];
                this.value = '';
                if (!file) return;
                if (file.size > 1024 * 1024) { showToast('文件过大，请控制在 1MB 以内'); return; }
                const reader = new FileReader();
                reader.onload = function () {
                    importLinesToRows(String(reader.result || '').split(/\\r?\\n/).map(s => s.trim()).filter(Boolean));
                };
                reader.onerror = function () { showToast('文件读取失败'); };
                reader.readAsText(file);
            });

            // 收集「更多选项」：有效期 / 次数上限 / 访问密码 / 备注
            function collectOptions() {
                const payload = {};
                if (Number(optTtl.value) > 0) payload.ttlDays = Number(optTtl.value);
                if (optMax.value) {
                    const n = Number(optMax.value);
                    if (!Number.isInteger(n) || n < 1) return { error: '次数上限需为正整数' };
                    payload.maxVisits = n;
                }
                if (optPwd.value) {
                    if (optPwd.value.length < 4 || optPwd.value.length > 64) return { error: '访问密码长度需在 4-64 位之间' };
                    payload.password = optPwd.value;
                }
                if (optNote.value.trim()) payload.note = optNote.value.trim().slice(0, 100);
                return { payload };
            }

            // 自定义校验（novalidate 替代浏览器原生气泡，规则与后端 utils.js 保持一致）
            function validateUrl(v) {
                if (!v) return '请输入长链接';
                let parsed;
                try { parsed = new URL(v); } catch (err) { return '链接格式不正确，请以 http:// 或 https:// 开头'; }
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '仅支持 http/https 开头的完整链接';
                return '';
            }
            function validateSlug(v) {
                if (!v) return '';
                return /^[a-zA-Z0-9_-]{1,64}$/.test(v) ? '' : '自定义短链仅可使用字母、数字、短横线、下划线，最长 64 位';
            }

            // 自定义短链实时检测：输入超出「字母 / 数字 / 短横线 / 下划线」四类的字符时
            // 弹窗警告并标记非法；单条与批量提交路径另有最终校验兜底，确保不能生成短链。
            const SLUG_BAD_RE = /[^a-zA-Z0-9_-]/;
            const SLUG_BAD_RE_ALL = /[^a-zA-Z0-9_-]/g; // g 版本用于 match 提取全部非法字符（test 用无 g 版本避免 lastIndex 状态）
            let slugWarnSource = null; // 触发警告的输入框，弹窗关闭后把焦点还给它
            function badCharLabel(ch) {
                if (ch === ' ') return '「空格」';
                if (ch === '\\t') return '「制表符」';
                return '「' + ch + '」';
            }
            function warnInvalidSlug(input) {
                const badChars = [...new Set(input.value.match(SLUG_BAD_RE_ALL) || [])];
                const prefix = badChars.length ? '检测到不支持的字符：' + badChars.map(badCharLabel).join('') + '。' : '';
                slugWarnText.textContent = prefix + '自定义短链仅可使用字母、数字、短横线、下划线（最长 64 位），已阻止生成短链，请修改后重试。';
                slugWarnSource = input;
                input.classList.add('invalid');
                if (typeof slugWarnDialog.showModal === 'function') {
                    if (!slugWarnDialog.open) slugWarnDialog.showModal();
                } else {
                    window.alert(slugWarnText.textContent);
                    input.focus();
                }
            }
            slugWarnOk.addEventListener('click', function () { slugWarnDialog.close(); });
            // 批量二维码放大弹窗：关闭按钮 + 点击遮罩关闭
            const qrZoomDialog = document.getElementById('qr-zoom-dialog');
            document.getElementById('qr-zoom-close').addEventListener('click', function () { qrZoomDialog.close(); });
            qrZoomDialog.addEventListener('click', function (e) { if (e.target === qrZoomDialog) qrZoomDialog.close(); });
            slugWarnDialog.addEventListener('click', function (e) { if (e.target === slugWarnDialog) slugWarnDialog.close(); });
            slugWarnDialog.addEventListener('close', function () {
                if (slugWarnSource) { slugWarnSource.focus(); slugWarnSource = null; }
            });

            // 长链重复提醒弹窗：后端 409 conflicts 渲染成列表（含已存在的短链），
            // 点「好的，我来修改」关闭并聚焦第一个冲突行——不修改重新提交仍会被拒绝
            const conflictDialog = document.getElementById('conflict-dialog');
            function showConflictDialog(conflicts, mode, rowEls) {
                const list = document.getElementById('conflict-list');
                list.textContent = '';
                conflicts.forEach(function (c) {
                    const item = document.createElement('div');
                    item.className = 'conflict-item';
                    const urlDiv = document.createElement('div');
                    urlDiv.className = 'conflict-url';
                    urlDiv.textContent = c.url;
                    const reason = document.createElement('div');
                    reason.className = 'conflict-reason';
                    if (c.type === 'url' && c.existingSlug) {
                        reason.textContent = '已存在相同长链，指向短链 /' + c.existingSlug;
                    } else if (c.type === 'url') {
                        reason.textContent = c.firstIndex !== undefined && c.firstIndex !== c.index
                            ? '与本次填写第 ' + (c.firstIndex + 1) + ' 行的长链重复'
                            : '本次填写中长链重复';
                    } else {
                        reason.textContent = '该自定义短链已被占用';
                    }
                    item.append(urlDiv, reason);
                    list.appendChild(item);
                });
                document.getElementById('conflict-text').textContent = conflicts.length > 1
                    ? '检测到 ' + conflicts.length + ' 条重复的长链接，未创建任何短链。请修改后重新提交。'
                    : '该长链接已存在，未创建短链。请修改后重新提交。';
                if (typeof conflictDialog.showModal === 'function') {
                    if (!conflictDialog.open) conflictDialog.showModal();
                } else {
                    window.alert(document.getElementById('conflict-text').textContent + '\\n' + conflicts.map(c => c.url).join('\\n'));
                }
                // 关闭后把焦点带回第一个冲突位置（批量=冲突行，单条=URL 框）
                conflictDialog.dataset.conflictMode = mode;
            }
            document.getElementById('conflict-ok').addEventListener('click', function () {
                conflictDialog.close();
            });
            conflictDialog.addEventListener('click', function (e) { if (e.target === conflictDialog) conflictDialog.close(); });
            conflictDialog.addEventListener('close', function () {
                if (conflictDialog.dataset.conflictMode === 'single') {
                    urlInput.classList.add('invalid');
                    urlInput.focus();
                }
            });

            urlInput.addEventListener('input', () => urlInput.classList.remove('invalid'));
            slugInput.addEventListener('input', function () {
                slugInput.classList.remove('invalid');
                slugCount.textContent = this.value.length ? this.value.length + '/64' : '';
                if (SLUG_BAD_RE.test(this.value)) warnInvalidSlug(this);
            });
            // 批量行的自定义短链同样实时检测（事件委托，覆盖动态添加的行）
            batchRowsEl.addEventListener('input', function (e) {
                const t = e.target;
                if (!t.classList || !t.classList.contains('br-slug')) return;
                if (SLUG_BAD_RE.test(t.value)) warnInvalidSlug(t);
                else t.classList.remove('invalid');
            });

            function setLoading(isLoading) {
                submitBtn.disabled = isLoading;
                submitLabel.textContent = isLoading ? '生成中…' : '生成短链';
            }

            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.style.display = 'block';
            }

            // 通用：把二维码画到任意 canvas（单条/批量行内缩略图用），返回是否成功
            function drawQrInto(canvas, text) {
                try {
                    if (typeof window.drawQrResult !== 'function') return false;
                    return window.drawQrResult(canvas, text);
                } catch (err) { return false; }
            }

            function showSuccess(newLink) {
                // 单条结果：与批量同款行样式（buildBatchRow 复用），只显示单条块并清掉批量块
                resultList.hidden = true;
                resultList.textContent = '';
                resultSingle.textContent = '';
                resultSingle.appendChild(buildBatchRow(window.location.origin + '/' + newLink.slug, ''));
                resultSingle.hidden = false;
                document.getElementById('result-hint').textContent = '短链已创建成功，点击链接可跳转原文并累计访问次数；二维码可点击放大后右键/长按保存。';
                resultCard.hidden = false;
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // 批量结果行：短链 + 行内二维码（点击放大）+ 复制；失败行显示原因
            function buildBatchRow(shortUrl, original) {
                const row = document.createElement('div');
                row.className = 'batch-result-row';
                const qrBtn = document.createElement('button');
                qrBtn.type = 'button';
                qrBtn.className = 'batch-qr';
                const qrCanvas = document.createElement('canvas');
                qrCanvas.setAttribute('aria-label', shortUrl + ' 的二维码');
                const drawn = drawQrInto(qrCanvas, shortUrl);
                qrBtn.appendChild(qrCanvas);
                qrBtn.hidden = !drawn;
                qrBtn.title = '查看大二维码';
                qrBtn.setAttribute('aria-label', '查看 ' + shortUrl + ' 的大二维码');
                qrBtn.addEventListener('click', function () { openQrZoom(shortUrl, original); });
                const main = document.createElement('div');
                main.className = 'batch-result-main';
                const a = document.createElement('a');
                a.className = 'result-url';
                a.href = shortUrl;
                a.target = '_blank'; a.rel = 'noopener noreferrer';
                a.textContent = shortUrl.replace(/^https?:\\/\\//, '');
                if (original) a.title = original;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'copy-btn';
                btn.dataset.url = shortUrl;
                btn.innerHTML = ICON_COPY_SVG + '<span>复制</span>';
                btn.setAttribute('aria-label', '复制 ' + shortUrl);
                main.append(a, btn);
                row.append(qrBtn, main);
                return row;
            }

            // 批量创建结果：成功行（二维码 + 短链 + 复制）与失败行（原因）分区展示，支持一键全部复制
            function showBatchSuccess(results, errors) {
                // 批量结果：只显示批量块，清掉单条块（两模式结果互斥，跟随当前模式）
                resultSingle.hidden = true;
                resultSingle.textContent = '';
                resultList.hidden = false;
                resultList.textContent = '';
                results.forEach(function (r) {
                    resultList.appendChild(buildBatchRow(window.location.origin + '/' + r.slug, r.original || ''));
                });
                (errors || []).forEach(function (err) {
                    const row = document.createElement('div');
                    row.className = 'batch-result-row batch-err-row';
                    const msg = document.createElement('div');
                    msg.className = 'batch-err';
                    msg.textContent = '✕ ' + err.url + '：' + err.error;
                    row.appendChild(msg);
                    resultList.appendChild(row);
                });
                if (results.length > 1) {
                    const allRow = document.createElement('div');
                    allRow.className = 'batch-result-row batch-all-row';
                    const allBtn = document.createElement('button');
                    allBtn.type = 'button';
                    allBtn.className = 'copy-btn';
                    allBtn.innerHTML = ICON_COPY_SVG + '<span>全部复制</span>';
                    allBtn.addEventListener('click', async function () {
                        try {
                            await navigator.clipboard.writeText(results.map(function (r) { return window.location.origin + '/' + r.slug; }).join('\\n'));
                            allBtn.classList.add('copied');
                            allBtn.querySelector('span').textContent = '已全部复制';
                            setTimeout(function () { allBtn.classList.remove('copied'); allBtn.querySelector('span').textContent = '全部复制'; }, 1800);
                        } catch (e) { showToast('复制失败，请手动复制', 'error'); }
                    });
                    allRow.appendChild(allBtn);
                    resultList.appendChild(allRow);
                }
                document.getElementById('result-hint').textContent = results.length + ' 条短链已创建成功，逐行扫码或复制使用；失败行已标红给出原因。';
                resultCard.hidden = false;
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // 批量行内二维码放大弹窗：大图 + 下载 PNG + 复制链接（主页版二维码弹窗）
            function openQrZoom(shortUrl, original) {
                const dlg = document.getElementById('qr-zoom-dialog');
                const canvas = document.getElementById('qr-zoom-canvas');
                const okDrawn = window.drawQrDialog ? window.drawQrDialog(canvas, shortUrl) : drawQrInto(canvas, shortUrl);
                canvas.hidden = !okDrawn;
                document.getElementById('qr-zoom-label').textContent = '扫码访问：' + shortUrl.replace(/^https?:\\/\\//, '') + (original ? '（' + original + '）' : '');
                document.getElementById('qr-zoom-download').onclick = function () {
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'qrcode' + shortUrl.replace(/^https?:\\/\\//, '').replace(/[\\/]/g, '-') + '.png';
                    a.click();
                };
                document.getElementById('qr-zoom-copy').onclick = async function () {
                    try { await navigator.clipboard.writeText(shortUrl); showToast('已复制'); }
                    catch (e) { showToast('复制失败，请手动复制', 'error'); }
                };
                if (typeof dlg.showModal === 'function') dlg.showModal();
            }

            // 会话过期时保存草稿（单条保存 URL/slug；批量保存整个文本框）
            function savePendingDraft(url, slug) {
                try {
                    sessionStorage.setItem('pending_create_url', url);
                    if (slug) sessionStorage.setItem('pending_create_slug', slug);
                    else sessionStorage.removeItem('pending_create_slug');
                } catch (err) {}
            }

            async function createLink(e) {
                e.preventDefault();
                const opts = collectOptions();
                if (opts.error) { showError(opts.error); return; }

                // 批量模式：逐行收集 → 校验 → 一次性提交（最多 20 条）
                if (createMode === 'batch') {
                    const rowEls = [...batchRowsEl.querySelectorAll('.batch-row-edit')];
                    rowEls.forEach(function (r) { r.classList.remove('invalid'); });
                    const items = [];
                    for (let i = 0; i < rowEls.length; i++) {
                        const row = rowEls[i];
                        const url = row.querySelector('.br-url').value.trim();
                        const slug = row.querySelector('.br-slug').value.trim();
                        const note = row.querySelector('.br-note').value.trim();
                        if (!url && !slug && !note) continue; // 全空行跳过
                        if (!url) { showError('第 ' + (i + 1) + ' 行缺少目标链接'); row.classList.add('invalid'); row.querySelector('.br-url').focus(); return; }
                        const slugErr = validateSlug(slug);
                        if (slugErr) { showError('第 ' + (i + 1) + ' 行：' + slugErr); row.classList.add('invalid'); warnInvalidSlug(row.querySelector('.br-slug')); return; }
                        const item = { url: url };
                        if (slug) item.slug = slug;
                        if (note) item.note = note;
                        items.push(item);
                    }
                    if (!items.length) { showError('请先填写至少一个目标链接'); return; }
                    if (items.length > 20) { showError('批量创建一次最多 20 条'); return; }
                    setLoading(true);
                    errorMessage.style.display = 'none';
                    try {
                        const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ items: items }, opts.payload)) });
                        if (res.status === 401) {
                            // 会话过期：整表保存为多行草稿（每行「链接 [短链]」），登录后自动恢复
                            savePendingDraft(rowEls.map(function (row) {
                                const u = row.querySelector('.br-url').value.trim();
                                const s = row.querySelector('.br-slug').value.trim();
                                return s ? u + ' ' + s : u;
                            }).filter(Boolean).join('\\n'), '');
                            window.location.reload();
                            return;
                        }
                        if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            // 长链重复：整单 409，弹窗列出冲突行，不修改不得创建
                            if (res.status === 409 && data.conflict && Array.isArray(data.conflicts)) {
                                showConflictDialog(data.conflicts, 'batch', rowEls);
                                return;
                            }
                            throw new Error(data.error || '创建链接失败。');
                        }
                        const data = await res.json();
                        // 失败行就地标红，结果卡内给出原因
                        (data.errors || []).forEach(function (err) {
                            const row = rowEls[err.index];
                            if (row) row.classList.add('invalid');
                        });
                        showBatchSuccess(data.results || [], data.errors || []);
                    } catch (err) { showError(err.message); } finally { setLoading(false); }
                    return;
                }

                // 单条模式
                const originalUrl = urlInput.value.trim();
                const customSlug = slugInput.value.trim();
                const urlError = validateUrl(originalUrl);
                const slugError = validateSlug(customSlug);
                urlInput.classList.toggle('invalid', !!urlError);
                slugInput.classList.toggle('invalid', !!slugError);
                if (urlError) { showError(urlError); urlInput.focus(); return; }
                if (slugError) { showError(slugError); warnInvalidSlug(slugInput); return; }
                setLoading(true);
                errorMessage.style.display = 'none';
                try {
                    const payload = Object.assign({ url: originalUrl }, opts.payload);
                    if (customSlug) payload.slug = customSlug;
                    const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (res.status === 401) {
                        // 会话过期：先保存已填内容再刷新，登录后自动恢复，避免用户重新输入
                        savePendingDraft(originalUrl, customSlug);
                        window.location.reload();
                        return;
                    }
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        // 长链重复：409 弹窗提醒，不修改不得创建
                        if (res.status === 409 && data.conflict && Array.isArray(data.conflicts)) {
                            showConflictDialog(data.conflicts, 'single');
                            return;
                        }
                        throw new Error(data.error || '创建链接失败。');
                    }
                    const newLink = await res.json();
                    urlInput.value = '';
                    slugInput.value = '';
                    slugCount.textContent = '';
                    showSuccess(newLink);
                } catch (err) { showError(err.message); } finally { setLoading(false); }
            }

            form.addEventListener('submit', createLink);

            // 结果行复制按钮（单条与批量共用 buildBatchRow，事件委托覆盖两块）
            function bindResultCopy(container) {
                container.addEventListener('click', async (e) => {
                    const btn = e.target.closest('.copy-btn');
                    if (!btn || !btn.dataset.url) return;
                    try {
                        await navigator.clipboard.writeText(btn.dataset.url);
                        btn.classList.add('copied');
                        const label = btn.querySelector('span');
                        if (label) {
                            label.textContent = '已复制';
                            setTimeout(() => { btn.classList.remove('copied'); label.textContent = '复制'; }, 1500);
                        } else {
                            setTimeout(() => btn.classList.remove('copied'), 1500);
                        }
                    } catch (err) { showToast('复制失败，请手动复制'); }
                });
            }
            bindResultCopy(resultSingle);
            bindResultCopy(resultList);
        })();
`
});

// ==========================================
// 3. 管理后台页面（短链列表 + 访问统计）
// ==========================================
export const adminHtml = buildPage({
  title: '短链接生成服务 - 管理后台',
  scripts: [`/qr-lib.js?v=${ASSET_VERSION}`, `/qr-draw.js?v=${ASSET_VERSION}`, `/ui.js?v=${ASSET_VERSION}`],
  body: decoHtml() + `
<div class="app has-footer-nav">
    <header class="app-header">
        ${brandHtml()}
        ${authedActionsHtml({ backHome: true })}
    </header>
    <div class="app-body">
        <!-- 桌面侧边栏菜单（>860px 显示；小窗口/移动端由页尾 .footer-nav 接管） -->
        <nav class="sidebar" aria-label="主导航">
            <button type="button" class="nav-item active" aria-current="page" data-view="list">${ICON_LIST}<span>短链列表</span><span class="badge nav-list-count" hidden>0</span></button>
            <button type="button" class="nav-item" data-view="trash">${ICON_TRASH}<span>回收站</span><span class="badge nav-trash-count" hidden>0</span></button>
            <button type="button" class="nav-item" data-view="stats">${ICON_CHART}<span>访问统计</span></button>
            <button type="button" class="nav-item" data-view="settings">${ICON_SLIDERS}<span>系统设置</span></button>
            <div class="nav-sep" aria-hidden="true"></div>
            <button type="button" class="nav-item open-about">${ICON_INFO}<span>关于项目</span></button>
        </nav>
        <main class="content">
            <section class="view" id="view-list">
                <div class="card">
                    <div class="card-title-row">
                        <h2 class="card-title">${ICON_LIST}<span>短链列表</span></h2>
                        <span class="badge" id="link-count">…</span>
                    </div>
                    <div class="table-toolbar">
                        <div class="search-wrap">${ICON_SEARCH}<input type="search" id="link-search" placeholder="搜索短链、原始链接或备注…" autocomplete="off" aria-label="搜索短链、原始链接或备注" title="快捷键 / 聚焦搜索"></div>
                        <select class="tb-select" id="status-filter" aria-label="按状态筛选">
                            <option value="all">全部状态</option>
                            <option value="ok">正常</option>
                            <option value="expired">已过期</option>
                            <option value="maxed">已达上限</option>
                            <option value="pwd">密码保护</option>
                        </select>
                        <button type="button" class="btn-ghost tb-btn tb-flat" id="refresh-btn" title="快捷键 R">${ICON_REFRESH}<span>刷新</span></button>
                        <button type="button" class="btn-ghost tb-btn trash-toggle" id="trash-toggle" aria-pressed="false">${ICON_TRASH}<span>回收站</span><span class="badge" id="trash-count" hidden>0</span></button>
                        <button type="button" class="btn-ghost tb-btn tb-flat trash-only" id="restore-all-btn" hidden>恢复全部</button>
                        <button type="button" class="btn-ghost tb-btn tb-flat trash-only" id="purge-all-btn" hidden>清空回收站</button>
                        <button type="button" class="btn-ghost tb-btn tb-flat" id="export-csv">${ICON_DOWNLOAD}<span>CSV</span></button>
                        <button type="button" class="btn-ghost tb-btn tb-flat" id="export-json">${ICON_DOWNLOAD}<span>JSON</span></button>
                        <!-- 移动端「更多」收纳：低频操作（刷新/导出/回收站批量）收进下拉，工具栏一行放完 -->
                        <div class="more-wrap">
                            <button type="button" class="btn-ghost tb-btn more-btn" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="更多操作">${ICON_MORE}</button>
                            <div class="more-menu" id="more-menu" role="menu" hidden>
                                <button type="button" role="menuitem" data-act="refresh">${ICON_REFRESH}<span>刷新</span></button>
                                <button type="button" role="menuitem" data-act="csv">${ICON_DOWNLOAD}<span>导出 CSV</span></button>
                                <button type="button" role="menuitem" data-act="json">${ICON_DOWNLOAD}<span>导出 JSON</span></button>
                                <button type="button" role="menuitem" class="trash-only" data-act="restore-all" hidden>${ICON_CHECK}<span>恢复全部</span></button>
                                <button type="button" role="menuitem" class="trash-only danger" data-act="purge-all" hidden>${ICON_TRASH}<span>清空回收站</span></button>
                            </div>
                        </div>
                    </div>
                    <div class="batch-bar" id="batch-bar" hidden>
                        <span class="batch-count" id="batch-count"></span>
                        <button type="button" class="btn-ghost tb-btn" id="batch-delete">批量删除</button>
                        <button type="button" class="btn-ghost tb-btn" id="batch-restore" hidden>批量恢复</button>
                        <button type="button" class="btn-ghost tb-btn" id="batch-purge" hidden>彻底删除</button>
                        <button type="button" class="btn-ghost tb-btn" id="batch-clear">取消选择</button>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr>
                                <th class="col-check"><input type="checkbox" id="check-all" aria-label="全选筛选结果"></th><th>短链接</th><th class="col-orig">原始链接</th><th class="th-sort col-visits" data-key="visits" title="点击排序">访问次数<span class="arrow" data-arrow="visits"></span></th><th class="th-sort col-created" data-key="createdAt" title="点击排序">创建时间<span class="arrow" data-arrow="createdAt"></span></th><th>操作</th>
                            </tr></thead>
                            <tbody id="links-table-body"></tbody>
                        </table>
                    </div>
                    <div class="load-more" id="load-more-wrap" hidden><button type="button" class="btn-ghost" id="load-more-btn">加载更多</button></div>
                    <p class="hint-line" id="admin-note"></p>
                </div>
            </section>
            <section class="view" id="view-stats" hidden>
                <div class="card">
                    <h2 class="card-title">${ICON_CHART}<span>访问统计</span></h2>
                    ${statsGridHtml('总访问次数')}
                    <p class="hint-line" id="stats-note" hidden></p>
                </div>
                <div class="card">
                    <div class="card-title-row">
                        <h2 class="card-title">${ICON_CHART}<span>全站访问趋势</span></h2>
                        <span class="badge" id="trend-window">近 14 天</span>
                    </div>
                    <div class="bar-chart" id="visits-chart"></div>
                    <p class="hint-line" id="trend-note" hidden></p>
                </div>
                <div class="chart-grid">
                    <div class="chart-card"><h3>近 7 天新增短链</h3><div class="bar-chart" id="created-chart"></div></div>
                    <div class="chart-card"><h3>访问量 TOP 短链</h3><div class="top-links" id="top-links"></div></div>
                </div>
            </section>
            <section class="view" id="view-settings" hidden>
                <div class="card">
                    <div class="card-title-row">
                        <h2 class="card-title">${ICON_SLIDERS}<span>系统设置</span></h2>
                        <button type="button" class="btn-primary settings-save-btn" id="settings-save">保存设置</button>
                    </div>
                    <p class="card-desc">设置保存在 KV 中，保存后即时生效，无需重新部署。留空或关闭的项使用默认值。</p>
                    <div class="settings-grid">
                        <section class="settings-card" role="group" aria-label="安全">
                            <h3 class="settings-group-title">安全</h3>
                            <label for="set-password">自定义访问口令
                                <input type="password" id="set-password" placeholder="留空保持不变" autocomplete="new-password">
                            </label>
                            <p class="settings-hint" id="set-pwd-hint">加载中…</p>
                            <label class="chk"><input type="checkbox" id="set-clearpwd"> 恢复为环境变量口令（清除自定义口令）</label>
                            <label for="set-session">会话有效期（小时，1-720）
                                <input type="number" id="set-session" min="1" max="720">
                            </label>
                            <div class="opt-pair">
                                <label for="set-rl-max">限流次数
                                    <input type="number" id="set-rl-max" min="1" max="100">
                                </label>
                                <label for="set-rl-win">限流窗口（分钟）
                                    <input type="number" id="set-rl-win" min="1" max="1440">
                                </label>
                            </div>
                        </section>
                        <section class="settings-card" role="group" aria-label="短链">
                            <h3 class="settings-group-title">短链</h3>
                            <div class="opt-pair">
                                <label for="set-slug-len">随机短链长度（4-16）
                                    <input type="number" id="set-slug-len" min="4" max="16">
                                </label>
                                <label for="set-slug-charset">字符集
                                    <select id="set-slug-charset">
                                        <option value="safe">易读（去 0O1lI）</option>
                                        <option value="full">完整（a-z0-9）</option>
                                    </select>
                                </label>
                            </div>
                            <label class="chk"><input type="checkbox" id="set-dedup"> 相同长链接复用同一短链（去重）</label>
                            <label for="set-redirect">默认跳转方式
                                <select id="set-redirect">
                                    <option value="302">302 临时（推荐）</option>
                                    <option value="301">301 永久（浏览器会缓存，影响统计）</option>
                                </select>
                            </label>
                            <label for="set-daily-limit">每 IP 每日创建上限（0 = 不限）
                                <input type="number" id="set-daily-limit" min="0" max="10000">
                            </label>
                            <label for="set-whitelist">目标域名白名单（每行一个，空 = 不限制）
                                <textarea id="set-whitelist" rows="3" placeholder="example.com&#10;sub.example.org"></textarea>
                            </label>
                            <label for="set-reserved">自定义保留字（每行一个）
                                <textarea id="set-reserved" rows="2" placeholder="admin&#10;login"></textarea>
                            </label>
                        </section>
                        <section class="settings-card" role="group" aria-label="统计与二维码">
                            <h3 class="settings-group-title">统计与二维码</h3>
                            <label for="set-dedup-min">访问去重窗口（同一访客短时间内不重复计数）
                                <select id="set-dedup-min">
                                    <option value="0">关闭（每次跳转都计数）</option>
                                    <option value="5">5 分钟</option>
                                    <option value="30">30 分钟</option>
                                    <option value="60">1 小时</option>
                                    <option value="240">4 小时</option>
                                </select>
                            </label>
                            <label for="set-tz">统计日界时区偏移（分钟，0 = UTC；UTC+8 填 480）
                                <input type="number" id="set-tz" min="-720" max="840" step="1" value="0">
                            </label>
                            <label class="chk"><input type="checkbox" id="set-qr-logo"> 二维码中心放置 Logo（自动提升纠错等级）</label>
                            <div class="qr-logo-row">
                                <img id="set-qr-logo-preview" class="qr-logo-preview" alt="当前 Logo 预览">
                                <div class="qr-logo-ops">
                                    <label class="btn-ghost qr-upload-btn">上传自定义 Logo<input type="file" id="set-qr-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
                                    <button type="button" class="btn-ghost" id="set-qr-logo-reset">恢复默认 Logo</button>
                                </div>
                            </div>
                            <p class="settings-hint">默认 Logo 为网站图标；自定义图片建议正方形 PNG / JPG，不超过 110KB。上传与恢复仅作预览，点击「保存设置」后生效，主页与后台的二维码同步更新。</p>
                            <label for="set-qr-dark">二维码前景色
                                <input type="color" id="set-qr-dark" value="#16181d">
                            </label>
                        </section>
                        <section class="settings-card" role="group" aria-label="存储用量">
                            <h3 class="settings-group-title">存储用量</h3>
                            <p class="settings-hint">精确统计本服务写入 KV 的数据；数据变更（创建 / 删除 / 恢复 / 编辑）后缓存自动失效，打开本页时自动重新统计，也可手动触发。控制台口径含平台开销，以 EdgeOne 控制台为准。</p>
                            <div class="usage-grid">
                                <div class="usage-item"><span class="usage-value" id="usage-active">—</span><span class="usage-label">活跃短链</span></div>
                                <div class="usage-item"><span class="usage-value" id="usage-trash">—</span><span class="usage-label">回收站</span></div>
                                <div class="usage-item"><span class="usage-value" id="usage-bytes">—</span><span class="usage-label">短链数据占用</span></div>
                                <div class="usage-item"><span class="usage-value" id="usage-system">—</span><span class="usage-label">系统内部键</span></div>
                                <div class="usage-item"><span class="usage-value" id="usage-total">—</span><span class="usage-label">总键数</span></div>
                            </div>
                            <div class="usage-foot">
                                <span class="settings-hint" id="usage-note">尚未统计</span>
                                <button type="button" class="btn-ghost" id="usage-scan">重新统计</button>
                            </div>
                        </section>
                        <section class="settings-card settings-card-wide" role="group" aria-label="API Token">
                            <h3 class="settings-group-title">API Token</h3>
                            <p class="settings-hint">用于脚本 / 第三方调用管理接口：请求头携带 <b>X-API-Token</b>，可访问创建 / 列表 / 编辑 / 删除 / 设置等全部管理接口。Token 名称必填；Token 仅在生成弹窗中完整显示一次，关闭后无法再次查看。</p>
                            <div class="token-create">
                                <input type="text" id="token-name" placeholder="Token 名称（必填，如：自动化脚本）" maxlength="30">
                                <button type="button" class="btn-ghost" id="token-create">生成 Token</button>
                            </div>
                            <div class="token-list" id="token-list"></div>
                        </section>
                    </div>
                </div>
            </section>
        </main>
    </div>
    ${appFooterHtml()}
    <!-- 底部导航（≤860px）：不含关于项——右上角 GitHub 后的「关于」图标按钮补位 -->
    <nav class="footer-nav" aria-label="底部导航">
        <button type="button" class="nav-item active" aria-current="page" data-view="list">${ICON_LIST}<span>短链列表</span></button>
        <button type="button" class="nav-item" data-view="trash">${ICON_TRASH}<span>回收站</span></button>
        <button type="button" class="nav-item" data-view="stats">${ICON_CHART}<span>访问统计</span></button>
        <button type="button" class="nav-item" data-view="settings">${ICON_SLIDERS}<span>系统设置</span></button>
    </nav>
</div>
<dialog id="confirm-dialog">
    <h2 class="danger-title">${ICON_TRASH}<span id="confirm-title">删除短链</span></h2>
    <p class="dialog-text" id="confirm-text"></p>
    <div class="row-btns">
        <button type="button" class="btn-danger" id="confirm-ok">删除</button>
        <button type="button" class="btn-ghost" id="confirm-cancel">取消</button>
    </div>
</dialog>
<dialog id="edit-dialog">
    <h2>${ICON_PENCIL}<span>编辑短链</span></h2>
    <p class="dialog-text" id="edit-slug-label"></p>
    <div class="edit-form">
        <label for="edit-original">目标链接
            <input type="url" id="edit-original" placeholder="https://…">
        </label>
        <label for="edit-note">备注
            <input type="text" id="edit-note" maxlength="100" placeholder="仅管理后台可见">
        </label>
        <div class="opt-pair">
            <div class="exp-wrap">
                <label for="edit-exp">有效期（留空 = 永久）
                    <input type="datetime-local" id="edit-exp">
                </label>
                <div class="exp-presets">
                    <button type="button" class="chip" data-days="7">7 天</button>
                    <button type="button" class="chip" data-days="30">30 天</button>
                    <button type="button" class="chip" data-days="90">90 天</button>
                    <button type="button" class="chip" data-days="0">永久</button>
                </div>
            </div>
            <label for="edit-max">次数上限（留空 = 不限）
                <input type="number" id="edit-max" min="1" step="1">
            </label>
        </div>
        <label for="edit-pwd">新访问密码（留空保持不变）
            <input type="password" id="edit-pwd" maxlength="64" autocomplete="new-password">
        </label>
        <label class="chk"><input type="checkbox" id="edit-clearpwd"> 清除访问密码</label>
    </div>
    <div class="row-btns">
        <button type="button" class="btn-primary" id="edit-save">保存</button>
        <button type="button" class="btn-ghost" id="edit-cancel">取消</button>
    </div>
</dialog>
<dialog id="detail-dialog">
    <h2>${ICON_CHART}<span>访问详情</span></h2>
    <p class="dialog-text" id="detail-slug"></p>
    <div id="detail-body"></div>
    <div class="row-btns detail-actions">
        <button type="button" class="btn-ghost" id="detail-copy">复制短链</button>
        <button type="button" class="btn-ghost" id="detail-qr">二维码</button>
        <button type="button" class="btn-ghost" id="detail-close">关闭</button>
    </div>
</dialog>
<dialog id="qr-dialog">
    <h2>${ICON_QR}<span>短链二维码</span></h2>
    <p class="dialog-text" id="qr-slug-label"></p>
    <div class="qr-view"><canvas id="qr-dialog-canvas" aria-label="短链二维码"></canvas></div>
    <div class="row-btns">
        <button type="button" class="btn-primary" id="qr-dlg-download">${ICON_DOWNLOAD}<span>下载 PNG</span></button>
        <button type="button" class="btn-ghost" id="qr-dlg-copy">复制链接</button>
        <button type="button" class="btn-ghost" id="qr-dlg-hd">高清下载</button>
        <button type="button" class="btn-ghost" id="qr-dlg-close">关闭</button>
    </div>
</dialog>
<dialog id="token-dialog">
    <h2>${ICON_SHIELD}<span>API Token 已生成</span></h2>
    <p class="dialog-text token-warn">请立即复制并妥善保存：<b>API Token 仅在本次弹窗中完整显示一次，关闭后无法再次查看！</b></p>
    <div class="token-reveal">
        <code id="token-dialog-value"></code>
        <button type="button" class="btn-primary" id="token-dialog-copy">${ICON_COPY}<span>复制</span></button>
    </div>
    <p class="settings-hint" id="token-dialog-name"></p>
    <div class="row-btns single">
        <button type="button" class="btn-ghost" id="token-dialog-close">我已保存，关闭</button>
    </div>
</dialog>
` + aboutDialogHtml(),
  script: `
        // 二维码运行时配置：由服务端注入（__QR_SETTINGS__），挂到 window 供 qr-draw.js 读取；
        // 登录欢迎语：ui.js 通过 body[data-login-toast] 读取展示。
        window.__QR_CFG__ = __QR_SETTINGS__;
        window.__QR_LOGO_SRC__ = '${QR_LOGO_DATA_URL}';
        try { if (document.body) document.body.setAttribute('data-login-toast', '登录成功。'); } catch (e) {}
        // 管理后台逻辑（GET /api/links + POST /api/delete 等；二维码绘制与主页同源）
        (function () {
            // 二维码运行时配置（服务端注入到 window，上传/恢复 Logo 时同步更新，无需刷新）
            const QR_CFG = window.__QR_CFG__ = window.__QR_CFG__ || {};
            const QR_LOGO_SRC = window.__QR_LOGO_SRC__;
            const viewList = document.getElementById('view-list');
            const viewStats = document.getElementById('view-stats');
            const tbody = document.getElementById('links-table-body');
            const linkCount = document.getElementById('link-count');
            const adminNote = document.getElementById('admin-note');
            const searchInput = document.getElementById('link-search');
            const refreshBtn = document.getElementById('refresh-btn');
            const loadMoreWrap = document.getElementById('load-more-wrap');
            const loadMoreBtn = document.getElementById('load-more-btn');
            const dialog = document.getElementById('confirm-dialog');
            const confirmText = document.getElementById('confirm-text');
            const confirmTitle = document.getElementById('confirm-title');
            const confirmOk = document.getElementById('confirm-ok');
            const confirmCancel = document.getElementById('confirm-cancel');
            const adminSlug = window.location.pathname.split('/').pop();
            const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Slug': adminSlug };
            // 统一请求封装：会话过期（401）时所有操作都有明确反馈并自动回到登录页，
            // 而不是各自弹一句「删除失败」；一次性触发，避免并发请求重复提示。
            let authRedirecting = false;
            function authedFetch(url, opts) {
                return fetch(url, opts).then(function (res) {
                    if (res.status === 401 && !authRedirecting) {
                        authRedirecting = true;
                        showToastClosable('登录已过期，请重新登录', 2600);
                        setTimeout(function () { window.location.reload(); }, 1400);
                    }
                    return res;
                });
            }
            const ICON_COPY_SVG = '${ICON_COPY}';
            const ICON_CHECK_SVG = '${ICON_CHECK}';
            const ICON_PENCIL_SVG = '${ICON_PENCIL}';
            const ICON_CHART_SVG = '${ICON_CHART}';
            const ICON_TRASH_SVG = '${ICON_TRASH}';
            const ICON_QR_SVG = '${ICON_QR}';
            const trashToggle = document.getElementById('trash-toggle');
            const trashCount = document.getElementById('trash-count');
            const statusFilterEl = document.getElementById('status-filter');
            const batchBar = document.getElementById('batch-bar');
            const batchCount = document.getElementById('batch-count');
            const batchDeleteBtn = document.getElementById('batch-delete');
            const batchRestoreBtn = document.getElementById('batch-restore');
            const batchPurgeBtn = document.getElementById('batch-purge');
            const batchClearBtn = document.getElementById('batch-clear');
            const checkAll = document.getElementById('check-all');
            const exportCsvBtn = document.getElementById('export-csv');
            const exportJsonBtn = document.getElementById('export-json');
            const editDialog = document.getElementById('edit-dialog');
            const detailDialog = document.getElementById('detail-dialog');
            const qrDialog = document.getElementById('qr-dialog');

            // 列表状态：全量数据 + 搜索过滤 + 状态筛选 + 排序（默认与原版一致：按访问次数降序）
            let allLinks = [];
            let filterText = '';
            let filterStatus = 'all';
            let sortKey = 'visits';
            let sortDir = 'desc';
            // 视图状态：list（有效短链）| trash（回收站）；lastActive 供统计视图聚合使用
            let viewMode = 'list';
            let lastActive = [];
            let trashTotal = null;
            // 活跃短链总数：回收站模式下 allLinks 承载的是回收站数据，列表徽标用它兜底，
            // 避免工具栏「返回列表」按钮误用回收站条数
            let listTotal = 0;
            let settingsLoaded = false;
            // 客户端分页：一次渲染前 PAGE_SIZE 条，「加载更多」追加，避免大列表全量渲染卡顿
            const PAGE_SIZE = 50;
            let shownCount = PAGE_SIZE;
            // 服务端截断标记：列表超过 2000 条时接口返回 { links, truncated }，据此提示用户
            let listTruncated = false;
            // 多选状态：勾选的 slug 集合（跨过滤/排序保持，切换视图/刷新数据时清空）
            const selectedSlugs = new Set();
            // 全站趋势懒加载时间戳：60 秒内重复切到统计视图不重新扫描
            let siteStatsLoadedAt = 0;

            function linkStatus(l) {
                const nowTs = Date.now();
                if (l.expiresAt && nowTs > l.expiresAt) return 'expired';
                if (l.maxVisits && (l.visits || 0) >= l.maxVisits) return 'maxed';
                if (l.hasPassword) return 'pwd';
                return 'ok';
            }

            function visibleLinks() {
                let list = allLinks;
                if (filterText) {
                    // 搜索覆盖短链 / 原始链接 / 备注（备注在列表中展示，理应可搜）
                    list = list.filter(function (l) {
                        return ('/' + String(l.slug || '')).toLowerCase().indexOf(filterText) > -1 ||
                               String(l.original || '').toLowerCase().indexOf(filterText) > -1 ||
                               String(l.note || '').toLowerCase().indexOf(filterText) > -1;
                    });
                }
                if (filterStatus !== 'all') {
                    list = list.filter(function (l) { return linkStatus(l) === filterStatus; });
                }
                return list.slice().sort(function (a, b) {
                    const va = a[sortKey] || 0, vb = b[sortKey] || 0;
                    return sortDir === 'asc' ? va - vb : vb - va;
                });
            }

            function updateSortArrows() {
                document.querySelectorAll('.arrow[data-arrow]').forEach(function (s) {
                    s.textContent = s.dataset.arrow === sortKey ? (sortDir === 'asc' ? '↑' : '↓') : '';
                });
                document.querySelectorAll('th.th-sort').forEach(function (th) {
                    if (th.dataset.key === sortKey) th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
                    else th.removeAttribute('aria-sort');
                });
            }

            function updateNote() {
                if (!allLinks.length) { adminNote.textContent = ''; return; }
                const filtered = visibleLinks();
                const shown = Math.min(filtered.length, shownCount);
                if (viewMode === 'trash') {
                    adminNote.textContent = '回收站共 ' + allLinks.length + ' 条，可恢复或彻底删除。';
                    return;
                }
                const sortLabel = (sortKey === 'visits' ? '访问次数' : '创建时间') + (sortDir === 'asc' ? '升序' : '降序');
                const statusLabels = { ok: '正常', expired: '已过期', maxed: '已达上限', pwd: '密码保护' };
                adminNote.textContent = '共 ' + allLinks.length + ' 条记录' + (filterText ? '，筛选出 ' + filtered.length + ' 条' : '') + (filterStatus !== 'all' ? '，状态「' + (statusLabels[filterStatus] || filterStatus) + '」' : '') + '，按' + sortLabel + '排列' + (filtered.length > shown ? '，当前显示前 ' + shown + ' 条' : '') + '。' + (listTruncated ? '（数据较多，仅显示前 2000 条）' : '');
            }

            function renderSkeleton() {
                tbody.textContent = '';
                for (let i = 0; i < 5; i++) {
                    const tr = document.createElement('tr');
                    for (let c = 0; c < 6; c++) {
                        const td = document.createElement('td');
                        const bar = document.createElement('div');
                        bar.className = 'skel';
                        td.appendChild(bar);
                        tr.appendChild(td);
                    }
                    tbody.appendChild(tr);
                }
            }

            // 行内状态徽标
            function addCellBadge(cell, text, cls) {
                const badge = document.createElement('span');
                badge.className = 'cell-badge' + (cls ? ' ' + cls : '');
                badge.textContent = text;
                cell.appendChild(badge);
            }

            function renderList() {
                tbody.textContent = '';
                updateBatchBar();
                const filtered = visibleLinks();
                const links = filtered.slice(0, shownCount);
                const remaining = filtered.length - links.length;
                if (loadMoreWrap && loadMoreBtn) {
                    if (remaining > 0) { loadMoreBtn.textContent = '加载更多（还有 ' + remaining + ' 条）'; loadMoreWrap.hidden = false; }
                    else { loadMoreWrap.hidden = true; }
                }
                if (!allLinks.length) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 6; td.className = 'empty';
                    if (viewMode === 'trash') {
                        td.textContent = '回收站是空的。';
                    } else {
                        // 空态给一条直达前台的链接，方便首次使用
                        td.append('暂无短链接，');
                        const goCreate = document.createElement('a');
                        goCreate.href = '/';
                        goCreate.textContent = '去前台创建一个';
                        td.append(goCreate, '吧。');
                    }
                    tr.appendChild(td); tbody.appendChild(tr);
                    linkCount.textContent = '0';
                    return;
                }
                if (!filtered.length) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 6; td.className = 'empty';
                    td.textContent = '没有匹配「' + filterText + '」的短链接。';
                    tr.appendChild(td); tbody.appendChild(tr);
                    linkCount.textContent = '0';
                    return;
                }
                links.forEach(function (link) {
                    const shortUrl = window.location.origin + '/' + link.slug;
                    const row = document.createElement('tr');
                    row.dataset.slug = link.slug;

                    // 多选复选框：勾选状态跨重渲染保持（selectedSlugs 集合）
                    const checkCell = document.createElement('td');
                    checkCell.className = 'col-check';
                    const rowCheck = document.createElement('input');
                    rowCheck.type = 'checkbox';
                    rowCheck.className = 'row-check';
                    rowCheck.dataset.slug = link.slug;
                    rowCheck.checked = selectedSlugs.has(link.slug);
                    rowCheck.setAttribute('aria-label', '选择 /' + link.slug);
                    checkCell.appendChild(rowCheck);

                    const shortCell = document.createElement('td');
                    shortCell.className = 'slug-cell';
                    const shortAnchor = document.createElement('a');
                    shortAnchor.className = 'slug-link';
                    shortAnchor.href = shortUrl; shortAnchor.target = '_blank'; shortAnchor.rel = 'noopener noreferrer';
                    // 只显示 /slug：域名所有行相同且较长，完整地址悬停可见（复制按钮复制的仍是完整链接）
                    shortAnchor.title = shortUrl;
                    shortAnchor.textContent = '/' + link.slug;
                    shortCell.appendChild(shortAnchor);

                    // 行内复制：不打开短链即可取用，避免跳转计数污染访问统计
                    const rowCopy = document.createElement('button');
                    rowCopy.type = 'button';
                    rowCopy.className = 'row-copy';
                    rowCopy.dataset.url = shortUrl;
                    rowCopy.title = '复制短链';
                    rowCopy.setAttribute('aria-label', '复制 ' + link.slug);
                    rowCopy.innerHTML = ICON_COPY_SVG;
                    shortCell.appendChild(rowCopy);

                    // 状态徽标：过期 / 达上限 / 密码保护 / 回收站
                    const nowTs = Date.now();
                    if (viewMode === 'trash') {
                        addCellBadge(shortCell, '回收站', '');
                    } else if (link.expiresAt && nowTs > link.expiresAt) {
                        addCellBadge(shortCell, '已过期', 'warn');
                    } else if (link.maxVisits && (link.visits || 0) >= link.maxVisits) {
                        addCellBadge(shortCell, '已达上限', 'warn');
                    }
                    if (link.hasPassword) addCellBadge(shortCell, '密码', '');

                    // 备注：短链下方小字展示
                    if (link.note) {
                        const noteDiv = document.createElement('div');
                        noteDiv.className = 'cell-note';
                        noteDiv.textContent = link.note;
                        noteDiv.title = link.note;
                        shortCell.appendChild(noteDiv);
                    }
                    // 回收站：显示删除时间（软删除在 KV 中永久保留，时间能帮助判断清理）
                    if (viewMode === 'trash' && link.deletedAt) {
                        const delDiv = document.createElement('div');
                        delDiv.className = 'cell-note';
                        delDiv.textContent = '删除于 ' + fmtDateTime(link.deletedAt);
                        delDiv.title = fmtFullDateTime(link.deletedAt);
                        shortCell.appendChild(delDiv);
                    }

                    const originalCell = document.createElement('td');
                    originalCell.className = 'td-orig col-orig';
                    const originalAnchor = document.createElement('a');
                    originalAnchor.href = link.original; originalAnchor.target = '_blank'; originalAnchor.rel = 'noopener noreferrer';
                    originalAnchor.title = link.original;
                    originalAnchor.textContent = link.original.length > 60 ? link.original.substring(0, 60) + '…' : link.original;
                    originalCell.appendChild(originalAnchor);

                    const visitsCell = document.createElement('td');
                    visitsCell.className = 'col-visits';
                    visitsCell.textContent = numberFormat(link.visits);

                    const createdCell = document.createElement('td');
                    createdCell.className = 'td-nowrap col-created';
                    createdCell.textContent = link.createdAt ? fmtDateTime(link.createdAt) : '—';
                    if (link.createdAt) createdCell.title = fmtFullDateTime(link.createdAt);

                    const actionCell = document.createElement('td');
                    actionCell.className = 'td-actions';
                    if (viewMode === 'trash') {
                        const restoreButton = document.createElement('button');
                        restoreButton.type = 'button';
                        restoreButton.className = 'row-edit row-restore';
                        restoreButton.dataset.slug = link.slug;
                        restoreButton.textContent = '恢复';
                        restoreButton.setAttribute('aria-label', '恢复 ' + link.slug);
                        const purgeButton = document.createElement('button');
                        purgeButton.className = 'delete-btn';
                        purgeButton.dataset.slug = link.slug;
                        purgeButton.dataset.purge = '1';
                        purgeButton.textContent = '彻底删除';
                        purgeButton.setAttribute('aria-label', '彻底删除 ' + link.slug);
                        actionCell.append(restoreButton, purgeButton);
                    } else {
                        const qrButton = document.createElement('button');
                        qrButton.type = 'button';
                        qrButton.className = 'row-edit';
                        qrButton.dataset.slug = link.slug;
                        qrButton.dataset.act = 'qr';
                        qrButton.title = '二维码';
                        qrButton.innerHTML = ICON_QR_SVG;
                        qrButton.setAttribute('aria-label', '查看 ' + link.slug + ' 的二维码');
                        const detailButton = document.createElement('button');
                        detailButton.type = 'button';
                        detailButton.className = 'row-edit';
                        detailButton.dataset.slug = link.slug;
                        detailButton.dataset.act = 'detail';
                        detailButton.title = '访问详情';
                        detailButton.innerHTML = ICON_CHART_SVG;
                        detailButton.setAttribute('aria-label', '查看 ' + link.slug + ' 的访问详情');
                        const editButton = document.createElement('button');
                        editButton.type = 'button';
                        editButton.className = 'row-edit';
                        editButton.dataset.slug = link.slug;
                        editButton.dataset.act = 'edit';
                        editButton.title = '编辑';
                        editButton.innerHTML = ICON_PENCIL_SVG;
                        editButton.setAttribute('aria-label', '编辑 ' + link.slug);
                        const deleteButton = document.createElement('button');
                        deleteButton.className = 'delete-btn';
                        deleteButton.dataset.slug = link.slug;
                        deleteButton.innerHTML = ICON_TRASH_SVG;
                        deleteButton.title = '删除';
                        deleteButton.setAttribute('aria-label', '删除 ' + link.slug);
                        actionCell.append(qrButton, detailButton, editButton, deleteButton);
                    }

                    row.append(checkCell, shortCell, originalCell, visitsCell, createdCell, actionCell);
                    tbody.appendChild(row);
                });
                linkCount.textContent = String(filtered.length);
                // 侧边栏「短链列表」徽标：始终用活跃短链总数（回收站模式下 allLinks
                // 是回收站数据，改用 listTotal 兜底，工具栏「返回列表」徽标同源）
                if (viewMode === 'list') listTotal = allLinks.length;
                syncListBadges();
            }

            // 列表徽标统一刷新入口：侧边栏 + 底部导航的「短链列表」徽标都取 listTotal；
            // 回收站视图下工具栏按钮是「返回列表」，其徽标也取列表条数（与「回收站」
            // 按钮徽标取回收站条数对称——徽标始终表示切换目标视图的条数）
            function syncListBadges() {
                document.querySelectorAll('.nav-list-count').forEach(function (b) {
                    b.hidden = listTotal === 0;
                    b.textContent = String(listTotal);
                });
                if (viewMode === 'trash' && trashCount) {
                    trashCount.hidden = listTotal === 0;
                    trashCount.textContent = String(listTotal);
                    scheduleToolbarSync();
                }
            }

            // ---------- 多选与批量操作条 ----------
            function updateBatchBar() {
                const n = selectedSlugs.size;
                batchBar.hidden = n === 0;
                if (batchCount) batchCount.textContent = n ? '已选 ' + n + ' 条' : '';
                // 按视图显示对应动作：列表=批量删除（进回收站）；回收站=批量恢复/彻底删除
                if (batchDeleteBtn) batchDeleteBtn.hidden = viewMode !== 'list';
                if (batchRestoreBtn) batchRestoreBtn.hidden = viewMode !== 'trash';
                if (batchPurgeBtn) batchPurgeBtn.hidden = viewMode !== 'trash';
                // 全选框三态：全选 / 部分选中 / 未选
                if (checkAll) {
                    const list = visibleLinks();
                    const sel = list.filter(function (l) { return selectedSlugs.has(l.slug); }).length;
                    checkAll.checked = list.length > 0 && sel === list.length;
                    checkAll.indeterminate = sel > 0 && sel < list.length;
                }
            }

            function clearSelection() {
                selectedSlugs.clear();
                updateBatchBar();
            }

            async function runBatchSlugs(endpoint, purge) {
                const slugs = [...selectedSlugs];
                if (!slugs.length) return;
                const btns = [batchDeleteBtn, batchRestoreBtn, batchPurgeBtn, batchClearBtn];
                btns.forEach(function (b) { if (b) b.disabled = true; });
                try {
                    const res = await authedFetch(endpoint, { method: 'POST', headers: authHeaders, body: JSON.stringify({ slugs: slugs, purge: purge === true }) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '批量操作失败');
                    const okCount = typeof data.ok === 'number' ? data.ok : (data.results || []).filter(function (r) { return r.success; }).length;
                    selectedSlugs.clear();
                    if (okCount === slugs.length) showToast('已处理 ' + okCount + ' 条');
                    else showToast('完成 ' + okCount + '/' + slugs.length + ' 条，其余失败，可重试', 'error');
                    // 批量删除进回收站时同步徽标：列表视图刷新不会重取回收站数据，
                    // 按成功条数本地累加；徽标尚未初始化时回退为拉取一次回收站数量
                    if (endpoint === '/api/delete' && !purge) {
                        if (trashTotal == null) syncTrashCount();
                        else { trashTotal += okCount; updateTrashBadge(); }
                    }
                    await getLinks();
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    btns.forEach(function (b) { if (b) b.disabled = false; });
                    updateBatchBar();
                }
            }

            function requestBatch(kind) {
                const total = selectedSlugs.size;
                if (!total) return;
                const plans = {
                    delete: { endpoint: '/api/delete', purge: false, title: '批量删除', okLabel: '删除', danger: true, prefix: '将选中的 ', suffix: ' 条短链移入回收站，可随时恢复。' },
                    restore: { endpoint: '/api/restore', purge: false, title: '批量恢复', okLabel: '恢复', danger: false, prefix: '将从回收站恢复选中的 ', suffix: ' 条短链。' },
                    purge: { endpoint: '/api/delete', purge: true, title: '批量彻底删除', okLabel: '彻底删除', danger: true, prefix: '将彻底删除选中的 ', suffix: ' 条短链，该操作不可恢复。' }
                };
                const plan = plans[kind];
                const message = plan.prefix + total + plan.suffix;
                const run = function () { runBatchSlugs(plan.endpoint, plan.purge); };
                if (typeof dialog.showModal !== 'function') {
                    nativeConfirmFallback(message, run);
                    return;
                }
                requestConfirm({
                    title: plan.title,
                    buildText: function (el) {
                        el.textContent = plan.prefix;
                        const b = document.createElement('b');
                        b.textContent = String(total);
                        el.append(b, document.createTextNode(plan.suffix));
                    },
                    okLabel: plan.okLabel,
                    danger: plan.danger,
                    onOk: run
                });
            }
            if (batchDeleteBtn) batchDeleteBtn.addEventListener('click', function () { requestBatch('delete'); });
            if (batchRestoreBtn) batchRestoreBtn.addEventListener('click', function () { requestBatch('restore'); });
            if (batchPurgeBtn) batchPurgeBtn.addEventListener('click', function () { requestBatch('purge'); });
            if (batchClearBtn) batchClearBtn.addEventListener('click', clearSelection);
            // 行内复选框（事件委托到 tbody）
            tbody.addEventListener('change', function (e) {
                const box = e.target.closest('.row-check');
                if (!box) return;
                if (box.checked) selectedSlugs.add(box.dataset.slug);
                else selectedSlugs.delete(box.dataset.slug);
                updateBatchBar();
            });
            // 表头全选：作用于当前筛选结果（含未渲染的分页部分）
            if (checkAll) checkAll.addEventListener('change', function () {
                const list = visibleLinks();
                list.forEach(function (l) {
                    if (checkAll.checked) selectedSlugs.add(l.slug);
                    else selectedSlugs.delete(l.slug);
                });
                renderList();
            });

            function renderStats(links) {
                let visits = 0, latest = 0;
                links.forEach(function (l) { visits += (l.visits || 0); if (l.createdAt && l.createdAt > latest) latest = l.createdAt; });
                if (typeof animateNumber === 'function') {
                    animateNumber(document.getElementById('stat-visits'), visits);
                    animateNumber(document.getElementById('stat-links'), links.length);
                } else {
                    document.getElementById('stat-visits').textContent = numberFormat(visits);
                    document.getElementById('stat-links').textContent = numberFormat(links.length);
                }
                setStatDate(document.getElementById('stat-created'), latest);

                // 近 7 天新增短链（按本地时区聚合 createdAt）
                const days = [];
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                    days.push({ key: dayKey(d), label: pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), count: 0, today: i === 0 });
                }
                const keyIndex = {};
                days.forEach(function (d) { keyIndex[d.key] = d; });
                links.forEach(function (l) { if (l.createdAt) { const k = dayKey(new Date(l.createdAt)); if (keyIndex[k]) keyIndex[k].count++; } });
                let max = 1; days.forEach(function (d) { if (d.count > max) max = d.count; });

                const chart = document.getElementById('created-chart');
                chart.textContent = '';
                days.forEach(function (d) {
                    const col = document.createElement('div'); col.className = 'bar-col';
                    const track = document.createElement('div'); track.className = 'bar-track';
                    const fill = document.createElement('div'); fill.className = 'bar-fill' + (d.today ? ' today' : '');
                    fill.style.height = d.count ? Math.max(5, Math.round(d.count / max * 100)) + '%' : '0%';
                    track.appendChild(fill);
                    if (d.count) {
                        const val = document.createElement('div'); val.className = 'bar-val'; val.textContent = String(d.count);
                        track.insertBefore(val, fill);
                    }
                    const lbl = document.createElement('div'); lbl.className = 'bar-label'; lbl.textContent = d.label;
                    col.append(track, lbl); chart.appendChild(col);
                });

                // 访问量 TOP 短链
                const box = document.getElementById('top-links');
                box.textContent = '';
                const top = links.slice().sort(function (a, b) { return (b.visits || 0) - (a.visits || 0); }).slice(0, 8);
                if (!top.length) {
                    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = '暂无访问数据';
                    box.appendChild(empty); return;
                }
                let maxVisits = 1; top.forEach(function (l) { if ((l.visits || 0) > maxVisits) maxVisits = l.visits; });
                top.forEach(function (l) {
                    const row = document.createElement('div'); row.className = 'top-link';
                    const head = document.createElement('div'); head.className = 'top-link-head';
                    const slug = document.createElement('a');
                    slug.className = 'top-link-slug';
                    slug.href = window.location.origin + '/' + l.slug;
                    slug.target = '_blank'; slug.rel = 'noopener noreferrer';
                    slug.textContent = '/' + l.slug;
                    const cnt = document.createElement('span'); cnt.className = 'top-link-count'; cnt.textContent = numberFormat(l.visits);
                    head.append(slug, cnt);
                    const prog = document.createElement('div'); prog.className = 'progress';
                    const bar = document.createElement('i'); bar.style.width = Math.max(2, Math.round((l.visits || 0) / maxVisits * 100)) + '%';
                    prog.appendChild(bar);
                    row.append(head, prog); box.appendChild(row);
                });
            }

            async function getLinks() {
                renderSkeleton();
                adminNote.textContent = '加载中…';
                // 兼容两种响应形态：旧数组 / 新 { links, truncated } 对象（超 2000 条截断时）
                function adoptList(payload) {
                    if (Array.isArray(payload)) { listTruncated = false; return payload; }
                    listTruncated = !!(payload && payload.truncated);
                    return (payload && payload.links) || [];
                }
                try {
                    const res = await authedFetch(viewMode === 'trash' ? '/api/links?trash=1' : '/api/links', { headers: authHeaders });
                    if (res.status === 401) {
                        adminNote.textContent = '';
                        const card = document.querySelector('#view-list .card');
                        const toolbar = card.querySelector('.table-toolbar'); if (toolbar) toolbar.style.display = 'none';
                        const wrap = card.querySelector('.table-wrap'); if (wrap) wrap.style.display = 'none';
                        const msg = document.createElement('div');
                        msg.className = 'message error';
                        msg.style.display = 'block';
                        msg.textContent = '未授权访问。请返回首页重新登录后再进入管理后台。';
                        card.appendChild(msg);
                        throw new Error('auth');
                    }
                    if (!res.ok) throw new Error('获取链接列表失败。');
                    const payload = await res.json();
                    // 截断形态 { links, truncated } 同样是有效数据：照常渲染并提示，而非报错
                    if (payload && !Array.isArray(payload) && Array.isArray(payload.links)) {
                        listTruncated = !!payload.truncated;
                        allLinks = payload.links;
                    } else {
                        allLinks = adoptList(payload);
                    }
                    shownCount = PAGE_SIZE;
                    // 数据已刷新，旧选择可能失效，清空多选
                    selectedSlugs.clear();
                    if (viewMode === 'list') {
                        lastActive = allLinks;
                        // 统计视图基于列表数据聚合：接口截断时给出近似口径提示
                        const statsNote = document.getElementById('stats-note');
                        if (statsNote) {
                            statsNote.hidden = !listTruncated;
                            if (listTruncated) statsNote.textContent = '短链超过 2000 条，以上统计为前 2000 条的汇总近似。';
                        }
                        // 异步校准回收站真实数量：列表接口不含回收站数据，本地 trashTotal
                        // 可能因多标签页等外部操作漂移，静默拉取一次校正，保证
                        // 工具栏「回收站 / 返回列表」角标与侧边栏菜单徽标始终一致
                        syncTrashCount();
                    } else {
                        trashTotal = allLinks.length;
                        updateTrashBadge();
                        // 异步校准列表真实数量：回收站视图不加载列表数据，
                        // 本地 listTotal 可能因他处新建/删除短链漂移
                        syncListCount();
                    }
                    renderList();
                    renderStats(lastActive);
                    updateNote();
                    updateSortArrows();
                } catch (err) { if (err.message !== 'auth') { adminNote.textContent = err.message; console.error(err); } }
            }

            // 通用确认弹窗：删除 / 彻底删除 / 清空回收站 / 恢复全部共用一份样式；
            // 危险操作红色确认键，安全操作蓝色；无 <dialog> 支持时回退原生 confirm。
            let confirmAction = null;
            function requestConfirm(opts) {
                confirmTitle.textContent = opts.title;
                confirmText.textContent = '';
                opts.buildText(confirmText);
                confirmOk.textContent = opts.okLabel;
                confirmOk.className = opts.danger ? 'btn-danger' : 'btn-primary';
                confirmAction = opts.onOk || null;
                dialog.showModal();
            }
            function nativeConfirmFallback(message, onOk) {
                if (window.confirm(message)) onOk();
            }

            // 删除确认：自定义弹窗替代原生 confirm()，风格与整体一致
            function requestDelete(slug, purge) {
                const run = function () { doDelete(slug, purge === true); };
                if (typeof dialog.showModal !== 'function') {
                    nativeConfirmFallback('您确定要删除短链接 "' + slug + '" 吗？', run);
                    return;
                }
                requestConfirm({
                    title: purge ? '彻底删除' : '删除短链',
                    buildText: function (el) {
                        el.textContent = purge ? '彻底删除 ' : '确定要删除短链接 ';
                        const b = document.createElement('b');
                        b.textContent = '/' + slug;
                        el.append(b, document.createTextNode(purge ? ' 吗？该操作不可恢复。' : ' 吗？删除后将进入回收站，可随时恢复。'));
                    },
                    okLabel: purge ? '彻底删除' : '删除',
                    danger: true,
                    onOk: run
                });
            }

            async function doDelete(slug, purge) {
                try {
                    const res = await authedFetch('/api/delete', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: slug, purge: purge === true }) });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || '删除失败。');
                    }
                    const wasPurge = purge === true;
                    // 从内存数据移除后整表重渲染，列表 / 徽标 / 统计视图保持同步
                    allLinks = allLinks.filter(function (l) { return l.slug !== slug; });
                    if (viewMode === 'list') {
                        lastActive = allLinks;
                        if (trashTotal != null) { trashTotal += 1; updateTrashBadge(); }
                    } else {
                        trashTotal = Math.max(0, trashTotal - 1);
                        updateTrashBadge();
                    }
                    // 彻底删除（任意视图）都会让活跃列表 -1；本地先行校准，
                    // 随后 getLinks 的 syncListCount 会用服务端数据兜底
                    if (wasPurge && listTotal > 0) { listTotal -= 1; syncListBadges(); }
                    renderList();
                    renderStats(lastActive);
                    updateNote();
                    showToast(wasPurge ? '已彻底删除 ' + slug : '已移入回收站：/' + slug);
                } catch (err) { showToast(err.message, 'error'); }
            }

            // 从回收站恢复短链
            async function doRestore(slug) {
                try {
                    const res = await authedFetch('/api/restore', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: slug }) });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || '恢复失败。');
                    }
                    allLinks = allLinks.filter(function (l) { return l.slug !== slug; });
                    trashTotal = Math.max(0, trashTotal - 1);
                    if (listTotal != null) { listTotal += 1; }
                    updateTrashBadge();
                    syncListBadges();
                    renderList();
                    updateNote();
                    showToast('已恢复 /' + slug);
                } catch (err) { showToast(err.message, 'error'); }
            }

            function updateTrashBadge() {
                // 侧边栏「回收站」菜单项同步计数徽标（trashTotal 未知时隐藏）
                document.querySelectorAll('.nav-trash-count').forEach(function (b) {
                    b.hidden = !(trashTotal > 0);
                    b.textContent = String(trashTotal || 0);
                });
                if (!trashCount) return;
                if (trashTotal == null) { trashCount.hidden = true; return; }
                // 列表视图：徽标 = 回收站条数；回收站视图（按钮变「返回列表」）：
                // 徽标由 syncListBadges 按 listTotal 刷新，这里不覆盖
                if (viewMode !== 'trash') {
                    trashCount.hidden = trashTotal === 0;
                    trashCount.textContent = String(trashTotal);
                }
                scheduleToolbarSync(); // 徽标显隐会改变按钮宽度，可能触发工具栏溢出
            }

            // ---------- 回收站批量操作（恢复全部 / 清空回收站） ----------
            // 管理接口无批量端点，逐条调用；回收站量级一般很小，顺序执行可控。
            const restoreAllBtn = document.getElementById('restore-all-btn');
            const purgeAllBtn = document.getElementById('purge-all-btn');
            async function runBatchTrash(purge) {
                const items = allLinks.slice();
                if (!items.length) return;
                restoreAllBtn.disabled = true;
                purgeAllBtn.disabled = true;
                let done = 0;
                for (let i = 0; i < items.length; i++) {
                    try {
                        const body = purge ? { slug: items[i].slug, purge: true } : { slug: items[i].slug };
                        const res = await authedFetch(purge ? '/api/delete' : '/api/restore', { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
                        if (res.ok) done++;
                    } catch (e) {}
                }
                restoreAllBtn.disabled = false;
                purgeAllBtn.disabled = false;
                if (done === items.length) showToast(purge ? '已彻底删除 ' + done + ' 条' : '已恢复 ' + done + ' 条');
                else showToast('完成 ' + done + '/' + items.length + ' 条，其余失败，可重试', 'error');
                await getLinks();
            }
            function requestBatchTrash(purge) {
                const total = allLinks.length;
                if (!total) return;
                const run = function () { runBatchTrash(purge); };
                if (typeof dialog.showModal !== 'function') {
                    nativeConfirmFallback(purge ? '将彻底删除回收站中的 ' + total + ' 条短链，不可恢复。确定吗？' : '将恢复回收站中的 ' + total + ' 条短链。确定吗？', run);
                    return;
                }
                requestConfirm({
                    title: purge ? '清空回收站' : '全部恢复',
                    buildText: function (el) {
                        el.textContent = purge ? '将彻底删除回收站中的 ' : '将恢复回收站中的 ';
                        const b = document.createElement('b');
                        b.textContent = String(total);
                        el.append(b, document.createTextNode(purge ? ' 条短链，该操作不可恢复。' : ' 条短链。'));
                    },
                    okLabel: purge ? '全部删除' : '全部恢复',
                    danger: purge,
                    onOk: run
                });
            }
            restoreAllBtn.addEventListener('click', function () { requestBatchTrash(false); });
            purgeAllBtn.addEventListener('click', function () { requestBatchTrash(true); });

            tbody.addEventListener('click', function (e) {
                const copyBtnEl = e.target.closest('.row-copy');
                if (copyBtnEl) {
                    const url = copyBtnEl.dataset.url;
                    navigator.clipboard.writeText(url).then(function () {
                        copyBtnEl.classList.add('copied');
                        copyBtnEl.innerHTML = ICON_CHECK_SVG;
                        setTimeout(function () { copyBtnEl.classList.remove('copied'); copyBtnEl.innerHTML = ICON_COPY_SVG; }, 1500);
                    }).catch(function () { showToast('复制失败，请手动复制', 'error'); });
                    return;
                }
                // 恢复按钮带 row-edit 类（复用样式），必须先于 .row-edit 详情分支判断，
                // 否则回收站点「恢复」会被详情分支拦截（点击无响应、误开详情弹窗）
                const restoreBtn = e.target.closest('.row-restore');
                if (restoreBtn) { doRestore(restoreBtn.dataset.slug); return; }
                const actBtn = e.target.closest('.row-edit');
                if (actBtn) {
                    const link = allLinks.find(function (l) { return l.slug === actBtn.dataset.slug; });
                    if (link) {
                        if (actBtn.dataset.act === 'edit') openEdit(link);
                        else if (actBtn.dataset.act === 'qr') openQr(link);
                        else {
                            // 访问详情走按需精确查询（含 daily/ref/dev），失败时回退内存数据
                            fetchDetail(link.slug).then(openDetail).catch(function (err) {
                                if (err && err.message === 'auth') { showToast('会话已过期，请重新登录', 'error'); return; }
                                openDetail(link);
                            });
                        }
                    }
                    return;
                }
                const btn = e.target.closest('.delete-btn');
                if (btn) requestDelete(btn.dataset.slug, btn.dataset.purge === '1');
            });

            confirmOk.addEventListener('click', function () { const fn = confirmAction; confirmAction = null; dialog.close(); if (fn) fn(); });
            confirmCancel.addEventListener('click', function () { confirmAction = null; dialog.close(); });
            dialog.addEventListener('click', function (e) { if (e.target === dialog) { confirmAction = null; dialog.close(); } });
            dialog.addEventListener('close', function () { confirmAction = null; });

            // 搜索：按短链 / 原始链接实时过滤（纯客户端，输入防抖 180ms，避免大列表每次按键全量重排）
            let searchTimer = null;
            searchInput.addEventListener('input', function () {
                clearTimeout(searchTimer);
                const el = this;
                searchTimer = setTimeout(function () {
                    filterText = el.value.trim().toLowerCase();
                    shownCount = PAGE_SIZE;
                    renderList();
                    updateNote();
                }, 180);
            });

            // 排序：点击「访问次数 / 创建时间」表头切换升/降序；表头可 Tab 聚焦、回车/空格触发
            document.querySelectorAll('th.th-sort').forEach(function (th) {
                th.tabIndex = 0;
                th.addEventListener('click', function () {
                    const key = th.dataset.key;
                    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
                    else { sortKey = key; sortDir = 'desc'; }
                    shownCount = PAGE_SIZE;
                    updateSortArrows();
                    renderList();
                    updateNote();
                });
                th.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); }
                });
            });

            // 快捷键：/ 聚焦搜索，R 刷新列表（输入框聚焦或弹窗打开时不触发）
            document.addEventListener('keydown', function (e) {
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                const tag = ((e.target && e.target.tagName) || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
                if (document.querySelector('dialog[open]')) return;
                if (e.key === '/') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
                else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); refreshBtn.click(); }
            });

            // 刷新：重新拉取列表（加载期间按钮转圈）
            refreshBtn.addEventListener('click', async function () {
                refreshBtn.disabled = true;
                refreshBtn.classList.add('spinning');
                const label = refreshBtn.querySelector('span');
                if (label) label.textContent = '刷新中…';
                await getLinks();
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('spinning');
                if (label) label.textContent = '刷新';
            });

            // ---------- 状态筛选（正常 / 已过期 / 达上限 / 密码保护） ----------
            statusFilterEl.addEventListener('change', function () {
                filterStatus = statusFilterEl.value;
                shownCount = PAGE_SIZE;
                renderList();
                updateNote();
            });

            // ---------- 移动端「更多」菜单：收纳低频操作（刷新/导出/恢复全部/清空） ----------
            // 菜单项点击转发到对应平铺按钮（复用其全部逻辑：确认弹窗/旋转动画/导出）；
            // 点外部或 Esc 关闭。桌面端菜单随 .more-wrap 一起隐藏，行为不变。
            const moreBtn = document.getElementById('more-btn');
            const moreMenu = document.getElementById('more-menu');
            function closeMoreMenu() {
                if (moreMenu && !moreMenu.hidden) {
                    moreMenu.hidden = true;
                    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
                }
            }
            if (moreBtn && moreMenu) {
                moreBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const open = moreMenu.hidden;
                    moreMenu.hidden = !open;
                    moreBtn.setAttribute('aria-expanded', String(open));
                });
                document.addEventListener('click', function (e) {
                    if (!moreMenu.hidden && !moreMenu.contains(e.target)) closeMoreMenu();
                });
                document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMoreMenu(); });
                moreMenu.addEventListener('click', function (e) {
                    const item = e.target.closest('[data-act]');
                    if (!item || item.hidden) return;
                    closeMoreMenu();
                    const targets = { refresh: 'refresh-btn', csv: 'export-csv', json: 'export-json', 'restore-all': 'restore-all-btn', 'purge-all': 'purge-all-btn' };
                    const target = document.getElementById(targets[item.dataset.act]);
                    if (target && !target.hidden) target.click();
                });
            }

            // ---------- 窄窗口工具栏溢出收纳（>620px 桌面档） ----------
            // 平铺按钮放不下换行时，从右往左把低频按钮（导出/回收站批量/刷新）收进
            // 「更多」菜单，保证工具栏始终单行；空间恢复时按后收先放顺序还原。
            // ≤620px 由 CSS 直接收纳（.tb-flat 隐藏、菜单常显），测量逻辑两端通用。
            const TB_COLLAPSE_ORDER = [
                ['export-json', 'json'],
                ['export-csv', 'csv'],
                ['purge-all-btn', 'purge-all'],
                ['restore-all-btn', 'restore-all'],
                ['refresh-btn', 'refresh']
            ];
            const tbCollapsed = new Set();
            function syncToolbarOverflow() {
                const toolbar = moreBtn ? moreBtn.closest('.table-toolbar') : null;
                if (!toolbar) return;
                if (!toolbar.offsetParent) return; // 视图隐藏（统计/设置/未授权）时不测量
                // 离开回收站等场景被 hidden 的按钮不在屏上：清掉本地 display 覆盖并移出收纳集
                tbCollapsed.forEach(function (id) {
                    const el = document.getElementById(id);
                    if (el && el.hidden) { el.style.display = ''; tbCollapsed.delete(id); }
                });
                // 测量期间先显示「更多」按钮，把它自身占的宽度一并算入，避免临界宽度反复横跳
                toolbar.classList.add('overflowing');
                // 收纳：从右往左，直到回到单行（单行高 42px，两行约 94px，阈值取 58）
                let guard = 0;
                while (toolbar.offsetHeight > 58 && guard++ < TB_COLLAPSE_ORDER.length) {
                    const next = TB_COLLAPSE_ORDER.map(function (p) { return document.getElementById(p[0]); })
                        .find(function (el) { return el && !el.hidden && !tbCollapsed.has(el.id); });
                    if (!next) break;
                    next.style.display = 'none';
                    tbCollapsed.add(next.id);
                }
                // 放回：后收的先还原；放回会再次换行则立即收回并停止
                let restoreGuard = 0;
                while (tbCollapsed.size && restoreGuard++ < TB_COLLAPSE_ORDER.length) {
                    const candidates = TB_COLLAPSE_ORDER.map(function (p) { return document.getElementById(p[0]); })
                        .filter(function (el) { return el && tbCollapsed.has(el.id) && !el.hidden; });
                    if (!candidates.length) break;
                    const last = candidates[candidates.length - 1];
                    last.style.display = '';
                    if (toolbar.offsetHeight > 58) { last.style.display = 'none'; break; }
                    tbCollapsed.delete(last.id);
                }
                // 一条都没收（宽屏放得下）时隐藏「更多」按钮，回到纯平铺
                if (!tbCollapsed.size) {
                    toolbar.classList.remove('overflowing');
                    closeMoreMenu();
                }
                // 菜单项可见性 = 对应平铺按钮已被收纳（且不在回收站隐藏态）
                TB_COLLAPSE_ORDER.forEach(function (pair) {
                    const flat = document.getElementById(pair[0]);
                    const item = moreMenu.querySelector('[data-act="' + pair[1] + '"]');
                    if (flat && item) item.hidden = flat.hidden || !tbCollapsed.has(pair[0]);
                });
            }
            let tbSyncQueued = 0;
            function scheduleToolbarSync() {
                // setTimeout 而非 requestAnimationFrame：后台标签页 rAF 会被冻结，
                // 收纳状态就会停留在过期布局；宏任务在后台也会执行
                if (tbSyncQueued) return;
                tbSyncQueued = setTimeout(function () { tbSyncQueued = 0; syncToolbarOverflow(); }, 0);
            }
            window.addEventListener('resize', scheduleToolbarSync);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleToolbarSync).catch(function () {});
            scheduleToolbarSync();

            // ---------- 回收站切换 ----------
            // 工具栏「回收站」按钮与侧边栏/底部导航的「回收站」菜单项共用同一模式切换；
            // applyTrashMode 由两处共同调用，切换后 syncTrashNav 保证菜单激活态一致
            async function applyTrashMode(on) {
                viewMode = on ? 'trash' : 'list';
                currentView = viewMode; // 同步视图状态：工具栏切换后 syncTrashNav 不会用旧 currentView 把高亮滞留在回收站
                const label = trashToggle.querySelector('span');
                if (label) label.textContent = on ? '返回列表' : '回收站';
                trashToggle.classList.toggle('on', on);
                trashToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
                searchInput.value = '';
                filterText = '';
                filterStatus = 'all';
                statusFilterEl.value = 'all';
                // 切换视图：清空多选并同步批量条按钮显隐
                clearSelection();
                // 批量按钮仅回收站视图有意义
                document.querySelectorAll('.trash-only').forEach(function (b) { b.hidden = !on; });
                // 两个视图的工具栏徽标数据源不同（回收站条数 / 列表条数），切换后立即刷新
                updateTrashBadge();
                syncListBadges();
                scheduleToolbarSync();
                await getLinks();
                syncTrashNav();
            }
            // 菜单激活态与回收站模式同步：trash 模式下「回收站」菜单点亮、「短链列表」熄灭
            function syncTrashNav() {
                const current = viewMode === 'trash' ? 'trash' : currentView;
                document.querySelectorAll('.nav-item[data-view]').forEach(function (x) {
                    const active = x.dataset.view === current;
                    x.classList.toggle('active', active);
                    if (active) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
                });
            }
            trashToggle.addEventListener('click', async function () {
                await applyTrashMode(viewMode !== 'trash');
            });

            // 拉取回收站数量并刷新徽标（数组/截断对象两种形态兼容）；
            // getLinks 列表分支会调用它校准（含启动首载），此处不再独立触发避免重复请求
            async function syncTrashCount() {
                try {
                    const res = await authedFetch('/api/links?trash=1', { headers: authHeaders });
                    if (res.ok) {
                        const payload = await res.json();
                        trashTotal = Array.isArray(payload) ? payload.length : ((payload && payload.links) || []).length;
                        updateTrashBadge();
                    }
                } catch (e) {}
            }

            // 拉取活跃短链数量并刷新列表徽标：回收站视图下工具栏按钮显示「返回列表」，
            // 其徽标必须反映列表真实条数（本地 listTotal 会因他处操作漂移），与
            // syncTrashCount 对称
            async function syncListCount() {
                try {
                    const res = await authedFetch('/api/links', { headers: authHeaders });
                    if (res.ok) {
                        const payload = await res.json();
                        listTotal = Array.isArray(payload) ? payload.length : ((payload && payload.links) || []).length;
                        syncListBadges();
                    }
                } catch (e) {}
            }

            // ---------- 数据导出（CSV / JSON，来自当前内存数据） ----------
            function downloadFile(name, content, mime) {
                const blob = new Blob([content], { type: mime });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            }
            function csvCell(v) {
                const s = String(v == null ? '' : v);
                return /[",\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            }
            exportCsvBtn.addEventListener('click', async function () {
                if (!allLinks.length) { showToast('暂无数据可导出'); return; }
                const btn = this;
                btn.disabled = true;
                try {
                    // 导出前带 detail=1 重新拉取，补齐聚合统计（列表默认不再携带 daily/ref/dev）
                    const res = await authedFetch(viewMode === 'trash' ? '/api/links?trash=1&detail=1' : '/api/links?detail=1', { headers: authHeaders });
                    if (res.ok) {
                        const payload = await res.json();
                        const rows = Array.isArray(payload) ? payload : (payload.links || []);
                        if (rows.length) allLinks = rows;
                    }
                } catch (e) {}
                finally { btn.disabled = false; }
                const header = ['slug', 'original', 'visits', 'createdAt', 'note', 'expiresAt', 'maxVisits', 'hasPassword'];
                const lines = [header.join(',')];
                allLinks.forEach(function (l) {
                    lines.push([l.slug, l.original, l.visits, new Date(l.createdAt).toISOString(), l.note, l.expiresAt || '', l.maxVisits || '', l.hasPassword ? 'yes' : 'no'].map(csvCell).join(','));
                });
                const d = new Date();
                const stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
                const kind = viewMode === 'trash' ? '-trash' : '';
                downloadFile('shorturl-export' + kind + '-' + stamp + '.csv', '\\ufeff' + lines.join('\\n'), 'text/csv;charset=utf-8');
                showToast(viewMode === 'trash' ? '已导出回收站 ' + allLinks.length + ' 条记录（CSV）' : '已导出 ' + allLinks.length + ' 条记录（CSV）');
            });
            exportJsonBtn.addEventListener('click', async function () {
                if (!allLinks.length) { showToast('暂无数据可导出'); return; }
                const btn = this;
                btn.disabled = true;
                try {
                    const res = await authedFetch(viewMode === 'trash' ? '/api/links?trash=1&detail=1' : '/api/links?detail=1', { headers: authHeaders });
                    if (res.ok) {
                        const payload = await res.json();
                        const rows = Array.isArray(payload) ? payload : (payload.links || []);
                        if (rows.length) allLinks = rows;
                    }
                } catch (e) {}
                finally { btn.disabled = false; }
                const d = new Date();
                const stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
                const kind = viewMode === 'trash' ? '-trash' : '';
                downloadFile('shorturl-export' + kind + '-' + stamp + '.json', JSON.stringify(allLinks, null, 2), 'application/json');
                showToast(viewMode === 'trash' ? '已导出回收站 ' + allLinks.length + ' 条记录（JSON）' : '已导出 ' + allLinks.length + ' 条记录（JSON）');
            });

            // ---------- 二维码查看（qr-draw.js 的 drawQrDialog，大尺寸，与主页同源） ----------
            function drawQrCanvas(canvas, text) {
                try {
                    if (typeof window.drawQrDialog !== 'function') return false;
                    return window.drawQrDialog(canvas, text);
                } catch (err) { return false; }
            }

            function openQr(link) {
                const shortUrl = window.location.origin + '/' + link.slug;
                document.getElementById('qr-slug-label').textContent = shortUrl.replace(/^https?:\\/\\//, '');
                const okDrawn = drawQrCanvas(document.getElementById('qr-dialog-canvas'), shortUrl);
                document.getElementById('qr-dialog-canvas').hidden = !okDrawn;
                qrDialog.dataset.url = shortUrl;
                qrDialog.showModal();
            }
            document.getElementById('qr-dlg-close').addEventListener('click', function () { qrDialog.close(); });
            qrDialog.addEventListener('click', function (e) { if (e.target === qrDialog) qrDialog.close(); });
            document.getElementById('qr-dlg-download').addEventListener('click', function () {
                const canvas = document.getElementById('qr-dialog-canvas');
                if (!canvas || !canvas.width) { showToast('二维码不可用'); return; }
                try {
                    const slugPart = (qrDialog.dataset.url || '').split('/').pop() || 'code';
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'shorturl-qr-' + slugPart + '.png';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch (err) { showToast('二维码下载失败，请截图保存', 'error'); }
            });
            document.getElementById('qr-dlg-copy').addEventListener('click', async function () {
                const btn = this;
                try {
                    await navigator.clipboard.writeText(qrDialog.dataset.url || '');
                    btn.textContent = '已复制';
                    setTimeout(function () { btn.textContent = '复制链接'; }, 1500);
                } catch (e) { showToast('复制失败，请手动复制', 'error'); }
            });
            // 高清下载：按 ≥1024px 重绘离屏画布再导出（打印 / 海报场景）
            document.getElementById('qr-dlg-hd').addEventListener('click', function () {
                const url = qrDialog.dataset.url || '';
                if (!url || typeof window.drawQrSized !== 'function') { showToast('高清二维码不可用', 'error'); return; }
                const canvas = document.createElement('canvas');
                let drawn = false;
                try { drawn = window.drawQrSized(canvas, url, 1024); } catch (err) { drawn = false; }
                if (!drawn || !canvas.width) { showToast('高清二维码生成失败', 'error'); return; }
                try {
                    const slugPart = url.split('/').pop() || 'code';
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'shorturl-qr-' + slugPart + '-hd.png';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch (err) { showToast('二维码下载失败，请截图保存', 'error'); }
            });

            // ---------- 编辑短链 ----------
            function toLocalInputValue(ts) {
                const d = new Date(ts);
                return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
            }
            function openEdit(link) {
                document.getElementById('edit-slug-label').textContent = '编辑 /' + link.slug;
                document.getElementById('edit-original').value = link.original;
                document.getElementById('edit-note').value = link.note || '';
                document.getElementById('edit-exp').value = link.expiresAt ? toLocalInputValue(link.expiresAt) : '';
                document.getElementById('edit-max').value = link.maxVisits || '';
                document.getElementById('edit-pwd').value = '';
                document.getElementById('edit-clearpwd').checked = false;
                editDialog.dataset.slug = link.slug;
                editDialog.showModal();
            }
            document.getElementById('edit-cancel').addEventListener('click', function () { editDialog.close(); });
            editDialog.addEventListener('click', function (e) { if (e.target === editDialog) editDialog.close(); });
            // 有效期快捷预设：一键填 7/30/90 天，「永久」清空输入框
            document.querySelectorAll('.exp-presets .chip').forEach(function (chip) {
                chip.addEventListener('click', function () {
                    const days = Number(chip.dataset.days) || 0;
                    document.getElementById('edit-exp').value = days ? toLocalInputValue(Date.now() + days * 86400000) : '';
                });
            });
            document.getElementById('edit-save').addEventListener('click', async function () {
                const slug = editDialog.dataset.slug;
                const payload = {
                    slug: slug,
                    original: document.getElementById('edit-original').value.trim(),
                    note: document.getElementById('edit-note').value.trim()
                };
                const expVal = document.getElementById('edit-exp').value;
                payload.expiresAt = expVal ? new Date(expVal).getTime() : null;
                payload.maxVisits = document.getElementById('edit-max').value ? Number(document.getElementById('edit-max').value) : null;
                if (document.getElementById('edit-pwd').value) payload.password = document.getElementById('edit-pwd').value;
                payload.clearPassword = document.getElementById('edit-clearpwd').checked;
                // 与服务端 400 行为对齐：两者互斥，提交前先拦下
                if (payload.password && payload.clearPassword) {
                    showToast('新密码与「清除访问密码」不能同时设置', 'error');
                    return;
                }
                if (payload.original && !/^https?:\\/\\//.test(payload.original)) {
                    showToast('目标链接需以 http/https 开头', 'error');
                    return;
                }
                const btn = this;
                btn.disabled = true;
                try {
                    const res = await authedFetch('/api/update', { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '保存失败');
                    // 就地更新内存数据，保持列表与详情一致
                    const idx = allLinks.findIndex(function (l) { return l.slug === slug; });
                    if (idx > -1) allLinks[idx] = Object.assign({}, allLinks[idx], {
                        original: data.original, note: data.note || '', expiresAt: data.expiresAt || 0,
                        maxVisits: data.maxVisits || 0, hasPassword: !!data.hasPassword
                    });
                    renderList();
                    updateNote();
                    editDialog.close();
                    showToast('已保存 /' + slug);
                } catch (err) { showToast(err.message, 'error'); }
                finally { btn.disabled = false; }
            });

            // ---------- 访问详情弹窗（横版：概览一行 + 趋势通栏 + 设备/来源双列） ----------
            // 详情数据按需拉取：列表接口默认不再携带 daily/ref/dev，打开弹窗时精确查询单条
            async function fetchDetail(slug) {
                const res = await authedFetch('/api/links?slug=' + encodeURIComponent(slug), { headers: authHeaders });
                if (res.status === 401) throw new Error('auth');
                if (!res.ok) throw new Error('详情加载失败');
                return res.json();
            }
            function openDetail(link) {
                document.getElementById('detail-slug').textContent = '访问详情 /' + link.slug + (link.note ? ' · ' + link.note : '');
                detailDialog.dataset.slug = link.slug;
                const body = document.getElementById('detail-body');
                body.textContent = '';

                // 概览：三卡一行
                const overview = document.createElement('div');
                overview.className = 'stats-grid';
                const nowTs = Date.now();
                const status = link.expiresAt && nowTs > link.expiresAt ? '已过期'
                    : (link.maxVisits && (link.visits || 0) >= link.maxVisits ? '已达上限' : '正常');
                [[numberFormat(link.visits), '总访问'], [fmtDateTime(link.createdAt), '创建时间'], [status, '状态']].forEach(function (pair) {
                    const card = document.createElement('div');
                    card.className = 'stat-card';
                    const head = document.createElement('div');
                    head.className = 'stat-head';
                    head.textContent = pair[1];
                    const value = document.createElement('b');
                    value.className = 'stat-value stat-value-text';
                    value.textContent = pair[0];
                    card.append(head, value);
                    overview.appendChild(card);
                });
                body.appendChild(overview);

                const grid = document.createElement('div');
                grid.className = 'detail-grid';

                // 近 14 天访问柱状图（通栏）；窄屏时隔天显示标签避免挤压换行
                const chartCard = document.createElement('div');
                chartCard.className = 'chart-card span-2';
                const chartTitle = document.createElement('h3');
                chartTitle.textContent = '近 14 天访问';
                const chart = document.createElement('div');
                chart.className = 'bar-chart';
                const days = [];
                const nowD = new Date();
                for (let i = 13; i >= 0; i--) {
                    const d = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() - i);
                    const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
                    days.push({ key: key, label: pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), count: (link.daily && link.daily[key]) || 0, today: i === 0 });
                }
                let maxDay = 1;
                days.forEach(function (d) { if (d.count > maxDay) maxDay = d.count; });
                const thinLabels = window.innerWidth < 640;
                days.forEach(function (d, idx) {
                    const col = document.createElement('div'); col.className = 'bar-col';
                    const track = document.createElement('div'); track.className = 'bar-track';
                    const fill = document.createElement('div'); fill.className = 'bar-fill' + (d.today ? ' today' : '');
                    fill.style.height = d.count ? Math.max(5, Math.round(d.count / maxDay * 100)) + '%' : '0%';
                    track.appendChild(fill);
                    if (d.count) {
                        const val = document.createElement('div'); val.className = 'bar-val'; val.textContent = String(d.count);
                        track.insertBefore(val, fill);
                    }
                    const lbl = document.createElement('div'); lbl.className = 'bar-label';
                    lbl.textContent = (thinLabels && idx % 2 === 1) ? '' : d.label;
                    col.append(track, lbl); chart.appendChild(col);
                });
                chartCard.append(chartTitle, chart);
                grid.appendChild(chartCard);

                // 设备占比
                const dev = link.dev || { m: 0, d: 0 };
                const devTotal = dev.m + dev.d;
                const devCard = document.createElement('div');
                devCard.className = 'chart-card';
                const devTitle = document.createElement('h3'); devTitle.textContent = '设备占比';
                const devBox = document.createElement('div'); devBox.className = 'top-links';
                [['移动端', dev.m], ['桌面端', dev.d]].forEach(function (pair) {
                    const row = document.createElement('div'); row.className = 'top-link';
                    const head = document.createElement('div'); head.className = 'top-link-head';
                    const name = document.createElement('span'); name.className = 'top-link-slug'; name.textContent = pair[0];
                    const cnt = document.createElement('span'); cnt.className = 'top-link-count';
                    cnt.textContent = devTotal ? Math.round(pair[1] / devTotal * 100) + '%' : '—';
                    head.append(name, cnt);
                    const prog = document.createElement('div'); prog.className = 'progress';
                    const bar = document.createElement('i');
                    bar.style.width = devTotal ? Math.max(2, Math.round(pair[1] / devTotal * 100)) + '%' : '0%';
                    prog.appendChild(bar);
                    row.append(head, prog); devBox.appendChild(row);
                });
                if (!devTotal) {
                    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = '暂无访问数据';
                    devBox.appendChild(empty);
                }
                devCard.append(devTitle, devBox);
                grid.appendChild(devCard);

                // 来源 TOP5
                const refCard = document.createElement('div');
                refCard.className = 'chart-card';
                const refTitle = document.createElement('h3'); refTitle.textContent = '来源 TOP5';
                const refBox = document.createElement('div'); refBox.className = 'top-links';
                const refs = Object.entries(link.ref || {}).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
                if (!refs.length) {
                    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = '暂无来源数据';
                    refBox.appendChild(empty);
                } else {
                    let maxRef = 1;
                    refs.forEach(function (r) { if (r[1] > maxRef) maxRef = r[1]; });
                    refs.forEach(function (r) {
                        const row = document.createElement('div'); row.className = 'top-link';
                        const head = document.createElement('div'); head.className = 'top-link-head';
                        const slug = document.createElement('span'); slug.className = 'top-link-slug'; slug.textContent = r[0];
                        const cnt = document.createElement('span'); cnt.className = 'top-link-count'; cnt.textContent = numberFormat(r[1]);
                        head.append(slug, cnt);
                        const prog = document.createElement('div'); prog.className = 'progress';
                        const bar = document.createElement('i');
                        bar.style.width = Math.max(2, Math.round(r[1] / maxRef * 100)) + '%';
                        prog.appendChild(bar);
                        row.append(head, prog); refBox.appendChild(row);
                    });
                }
                refCard.append(refTitle, refBox);
                grid.appendChild(refCard);

                body.appendChild(grid);

                detailDialog.showModal();
            }
            document.getElementById('detail-close').addEventListener('click', function () { detailDialog.close(); });
            detailDialog.addEventListener('click', function (e) { if (e.target === detailDialog) detailDialog.close(); });
            // 详情弹窗直达复制 / 二维码，不用关掉弹窗再找行内按钮
            document.getElementById('detail-copy').addEventListener('click', async function () {
                const btn = this;
                try {
                    await navigator.clipboard.writeText(window.location.origin + '/' + (detailDialog.dataset.slug || ''));
                    btn.textContent = '已复制';
                    setTimeout(function () { btn.textContent = '复制短链'; }, 1500);
                } catch (e) { showToast('复制失败，请手动复制', 'error'); }
            });
            document.getElementById('detail-qr').addEventListener('click', function () {
                // <dialog> 支持叠层：二维码弹窗盖在详情弹窗之上，关闭后详情保留
                openQr({ slug: detailDialog.dataset.slug });
            });

            // 加载更多：追加下一页数据（纯客户端分页）
            if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () {
                shownCount += PAGE_SIZE;
                renderList();
                updateNote();
            });

            // ---------- 全站访问趋势（/api/stats 懒加载；60 秒内重复进入复用缓存） ----------
            // 列表接口默认不带逐日数据，趋势由该端点全量扫描聚合；同时用准确值修正统计卡
            async function loadSiteStats() {
                const chart = document.getElementById('visits-chart');
                const note = document.getElementById('trend-note');
                const badge = document.getElementById('trend-window');
                if (!chart) return;
                if (note) { note.hidden = false; note.textContent = '趋势加载中…'; }
                try {
                    const res = await authedFetch('/api/stats?days=14', { headers: authHeaders });
                    if (!res.ok) throw new Error('x');
                    const s = await res.json();
                    siteStatsLoadedAt = Date.now();
                    if (typeof animateNumber === 'function') {
                        animateNumber(document.getElementById('stat-visits'), s.totalVisits);
                        animateNumber(document.getElementById('stat-links'), s.linkCount);
                    } else {
                        document.getElementById('stat-visits').textContent = numberFormat(s.totalVisits);
                        document.getElementById('stat-links').textContent = numberFormat(s.linkCount);
                    }
                    setStatDate(document.getElementById('stat-created'), s.latestCreatedAt);
                    const statsNote = document.getElementById('stats-note');
                    if (statsNote) statsNote.hidden = !s.truncated;
                    if (badge) badge.textContent = '近 ' + (s.windowDays || 14) + ' 天';
                    // 柱状图与「近 7 天新增」同款样式；日期键为 UTC（与计数落库口径一致）
                    chart.textContent = '';
                    const keys = Object.keys(s.daily || {}).sort();
                    let max = 1;
                    keys.forEach(function (k) { if ((s.daily[k] || 0) > max) max = s.daily[k]; });
                    const thinLabels = window.innerWidth < 640;
                    keys.forEach(function (k, idx) {
                        const count = s.daily[k] || 0;
                        const col = document.createElement('div'); col.className = 'bar-col';
                        const track = document.createElement('div'); track.className = 'bar-track';
                        const fill = document.createElement('div'); fill.className = 'bar-fill' + (idx === keys.length - 1 ? ' today' : '');
                        fill.style.height = count ? Math.max(5, Math.round(count / max * 100)) + '%' : '0%';
                        track.appendChild(fill);
                        if (count) {
                            const val = document.createElement('div'); val.className = 'bar-val'; val.textContent = String(count);
                            track.insertBefore(val, fill);
                        }
                        const lbl = document.createElement('div'); lbl.className = 'bar-label';
                        lbl.textContent = (thinLabels && idx % 2 === 1) ? '' : k.slice(5);
                        col.append(track, lbl); chart.appendChild(col);
                    });
                    if (note) note.hidden = true;
                } catch (e) {
                    if (note) { note.hidden = false; note.textContent = '全站趋势加载失败，可稍后重试。'; }
                }
            }

            // 底部导航切换「短链列表 / 回收站 / 访问统计 / 系统设置」，支持 ?view= 深链直达。
            // 回收站与列表共用视图容器：v='trash' 时显示列表视图并切到回收站模式，
            // v='list' 时切回列表模式；菜单激活态由 syncTrashNav 在模式切换后校正
            let currentView = 'list';
            function setView(v) {
                currentView = v;
                const showList = v === 'list' || v === 'trash';
                viewList.hidden = !showList;
                viewStats.hidden = v !== 'stats';
                document.getElementById('view-settings').hidden = v !== 'settings';
                document.querySelectorAll('.nav-item[data-view]').forEach(function (x) {
                    const active = x.dataset.view === v;
                    x.classList.toggle('active', active);
                    if (active) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
                });
                // 回收站模式与菜单不一致时统一（菜单点「短链列表」退出回收站、点「回收站」进入）
                if ((v === 'trash') !== (viewMode === 'trash')) {
                    applyTrashMode(v === 'trash');
                }
                if (v === 'stats' && Date.now() - siteStatsLoadedAt > 60000) {
                    loadSiteStats();
                }
                if (v === 'settings' && !settingsLoaded) {
                    settingsLoaded = true;
                    loadSettings();
                    loadTokens();
                    loadUsage();
                }
                scheduleToolbarSync();
            }
            document.querySelectorAll('.nav-item[data-view]').forEach(function (b) {
                b.addEventListener('click', function () { setView(b.dataset.view); });
            });

            // ---------- 存储用量统计（设置页卡片：GET 读缓存 / POST 全量扫描） ----------
            const usageBtn = document.getElementById('usage-scan');
            function fmtBytes(n) {
                n = Number(n) || 0;
                if (n < 1024) return n + ' B';
                if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
                if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
                return (n / 1073741824).toFixed(2) + ' GB';
            }
            function renderUsage(u) {
                if (!u || !u.scannedAt) {
                    document.getElementById('usage-note').textContent = '尚未统计，点击「重新统计」开始全量扫描';
                    return;
                }
                document.getElementById('usage-active').textContent = numberFormat(u.activeLinks);
                document.getElementById('usage-trash').textContent = numberFormat(u.trashLinks);
                document.getElementById('usage-bytes').textContent = fmtBytes(u.linkBytes);
                document.getElementById('usage-system').textContent = numberFormat(u.systemKeys);
                document.getElementById('usage-total').textContent = numberFormat(u.totalKeys);
                let note = '上次统计：' + fmtDateTime(u.scannedAt) + ' · 耗时 ' + ((u.durationMs || 0) / 1000).toFixed(1) + ' 秒';
                if (u.partial) note += ' · 键数超上限，仅部分统计';
                if (u.badKeys > 0) note += ' · ' + u.badKeys + ' 个异常键';
                document.getElementById('usage-note').textContent = note;
            }
            async function loadUsage() {
                try {
                    const res = await authedFetch('/api/usage', { headers: authHeaders });
                    if (!res.ok) throw new Error('x');
                    const data = await res.json();
                    renderUsage(data);
                    // 缓存已被写操作失效（scannedAt=0）：自动补扫一次，让卡片贴近实时
                    if (!data.scannedAt) scanUsage(true);
                } catch (e) {
                    document.getElementById('usage-note').textContent = '用量数据加载失败，可尝试重新统计';
                }
            }
            async function scanUsage(auto) {
                usageBtn.disabled = true;
                const label = usageBtn.textContent;
                usageBtn.textContent = '统计中…';
                document.getElementById('usage-note').textContent = auto
                    ? '数据在最近操作后有变化，正在重新统计…'
                    : '正在全量扫描 KV 键与短链值，数据量大时需要几秒…';
                try {
                    const res = await authedFetch('/api/usage', { method: 'POST', headers: authHeaders });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '统计失败');
                    renderUsage(data);
                } catch (e) {
                    document.getElementById('usage-note').textContent = e.message;
                }
                usageBtn.disabled = false;
                usageBtn.textContent = label;
            }
            usageBtn.addEventListener('click', function () { scanUsage(false); });
            let initialView = 'list';
            try {
                const requested = new URLSearchParams(window.location.search).get('view');
                if (requested === 'stats' || requested === 'settings' || requested === 'trash') initialView = requested;
            } catch (err) {}
            setView(initialView);

            // ---------- 系统设置 ----------
            let qrLogoCustom = '';
            let settingsReady = false; // 加载成功才允许保存：避免「加载失败→保存」把默认值覆写回服务端
            function updateQrLogoPreview() {
                const img = document.getElementById('set-qr-logo-preview');
                if (img) img.src = qrLogoCustom || QR_LOGO_SRC;
            }
            async function loadSettings() {
                try {
                    const res = await authedFetch('/api/settings', { headers: authHeaders });
                    if (!res.ok) throw new Error('x');
                    const s = await res.json();
                    document.getElementById('set-session').value = s.sessionHours || 24;
                    document.getElementById('set-rl-max').value = s.rateLimit ? s.rateLimit.max : 5;
                    document.getElementById('set-rl-win').value = s.rateLimit ? s.rateLimit.windowMin : 10;
                    document.getElementById('set-slug-len').value = s.slug ? s.slug.length : 8;
                    document.getElementById('set-slug-charset').value = s.slug ? s.slug.charset : 'safe';
                    document.getElementById('set-dedup').checked = s.dedupHash !== false;
                    document.getElementById('set-redirect').value = s.redirectCode === 301 ? '301' : '302';
                    document.getElementById('set-daily-limit').value = s.dailyCreateLimit || 0;
                    document.getElementById('set-whitelist').value = (s.domainWhitelist || []).join('\\n');
                    document.getElementById('set-reserved').value = (s.extraReserved || []).join('\\n');
                    document.getElementById('set-dedup-min').value = String(s.dedupMin || 0);
                    document.getElementById('set-tz').value = String(Number(s.tzOffsetMin) || 0);
                    document.getElementById('set-qr-logo').checked = !!(s.qr && s.qr.centerLogo);
                    document.getElementById('set-qr-dark').value = (s.qr && s.qr.dark) || '#16181d';
                    qrLogoCustom = (s.qr && s.qr.logoDataUrl) || '';
                    updateQrLogoPreview();
                    document.getElementById('set-pwd-hint').textContent = s.hasCustomPassword
                        ? '当前使用自定义口令（保存在 KV，修改后所有旧会话立即失效）'
                        : '当前使用环境变量口令（未配置则无需登录）';
                    settingsReady = true;
                    const saveBtn = document.getElementById('settings-save');
                    if (saveBtn) saveBtn.disabled = false;
                } catch (e) {
                    settingsReady = false;
                    const saveBtn = document.getElementById('settings-save');
                    if (saveBtn) saveBtn.disabled = true;
                    showToast('设置加载失败，为防覆写已禁用保存，请刷新页面重试', 'error');
                }
            }

            // 上传自定义 Logo：仅本地预览（草稿态），点击「保存设置」后随表单一并提交；
            // 自动勾选「中心放置 Logo」，用户可在保存前取消
            document.getElementById('set-qr-logo-file').addEventListener('change', async function () {
                const file = this.files && this.files[0];
                this.value = '';
                if (!file) return;
                if (file.size > 110 * 1024) { showToast('图片过大，请控制在 110KB 以内'); return; }
                const dataUrl = await new Promise(function (resolve) {
                    const reader = new FileReader();
                    reader.onload = function () { resolve(String(reader.result || '')); };
                    reader.onerror = function () { resolve(''); };
                    reader.readAsDataURL(file);
                });
                if (!/^data:image\\/(png|jpe?g|webp|svg\\+xml);base64,/.test(dataUrl)) { showToast('仅支持 PNG / JPG / WebP / SVG 图片'); return; }
                qrLogoCustom = dataUrl;
                document.getElementById('set-qr-logo').checked = true;
                updateQrLogoPreview();
                showToastClosable('Logo 已就绪（预览），点击「保存设置」后生效', 3200);
            });

            // 恢复默认 Logo（网站图标）：同样仅本地预览，保存后服务端清空自定义 Logo
            document.getElementById('set-qr-logo-reset').addEventListener('click', function () {
                qrLogoCustom = '';
                updateQrLogoPreview();
                showToastClosable('已切换为默认 Logo 预览，点击「保存设置」后生效', 3200);
            });

                    // 顶部「保存设置」：全部改动统一在此提交（含 Logo 草稿），成功前不落库
                    document.querySelectorAll('.settings-save-btn').forEach(function (b) {
                        b.addEventListener('click', async function () {
                            // 加载失败时禁止保存：表单里是默认值，保存会把服务端配置覆写掉
                            if (!settingsReady) {
                                showToast('设置尚未加载成功，请刷新页面后再保存', 'error');
                                return;
                            }
                            const pwdVal = document.getElementById('set-password').value;
                            // 与服务端 400 行为对齐：新口令与恢复环境变量口令互斥，提交前先拦下
                            if (pwdVal && document.getElementById('set-clearpwd').checked) {
                                showToast('新口令与「恢复为环境变量口令」不能同时设置', 'error');
                                return;
                            }
                            document.querySelectorAll('.settings-save-btn').forEach(function (x) { x.disabled = true; });
                            const payload = {
                                sessionHours: Number(document.getElementById('set-session').value) || 24,
                                rateLimit: {
                                    max: Number(document.getElementById('set-rl-max').value) || 5,
                                    windowMin: Number(document.getElementById('set-rl-win').value) || 10
                                },
                                slug: {
                                    length: Number(document.getElementById('set-slug-len').value) || 8,
                                    charset: document.getElementById('set-slug-charset').value
                                },
                                dedupHash: document.getElementById('set-dedup').checked,
                                redirectCode: document.getElementById('set-redirect').value === '301' ? 301 : 302,
                                dailyCreateLimit: Number(document.getElementById('set-daily-limit').value) || 0,
                                domainWhitelist: document.getElementById('set-whitelist').value.split('\\n').map(s => s.trim()).filter(Boolean),
                                extraReserved: document.getElementById('set-reserved').value.split('\\n').map(s => s.trim()).filter(Boolean),
                        dedupMin: Number(document.getElementById('set-dedup-min').value) || 0,
                        tzOffsetMin: Number(document.getElementById('set-tz').value) || 0,
                        qr: {
                                    centerLogo: document.getElementById('set-qr-logo').checked,
                                    dark: document.getElementById('set-qr-dark').value,
                                    logoDataUrl: qrLogoCustom || ''   // 空串 = 恢复默认 Logo（服务端清空）
                                }
                            };
                            if (pwdVal) payload.password = pwdVal;
                            if (document.getElementById('set-clearpwd').checked) payload.clearPassword = true;
                            try {
                                const res = await authedFetch('/api/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(data.error || '保存失败');
                                document.getElementById('set-password').value = '';
                                document.getElementById('set-clearpwd').checked = false;
                                // 同步本页二维码内存配置：弹窗无需刷新即用新设置
                                QR_CFG.centerLogo = payload.qr.centerLogo;
                                QR_CFG.dark = payload.qr.dark;
                                QR_CFG.logoDataUrl = payload.qr.logoDataUrl;
                                loadSettings();
                                if (data.sessionInvalidated) {
                                    showToastClosable('口令已更新，所有旧会话已失效，即将重新登录…', 2600);
                                    setTimeout(function () { window.location.href = '/'; }, 1600);
                                } else {
                                    showToastClosable('保存已生效', 3000);
                                }
                            } catch (err) { showToast(err.message || '保存失败', 'error'); }
                            finally { document.querySelectorAll('.settings-save-btn').forEach(function (x) { x.disabled = false; }); }
                        });
                    });

            // ---------- API Token ----------
            async function loadTokens() {
                const list = document.getElementById('token-list');
                try {
                    const res = await authedFetch('/api/token', { headers: authHeaders });
                    if (!res.ok) throw new Error('x');
                    const tokens = await res.json();
                    list.textContent = '';
                    if (!tokens.length) {
                        const empty = document.createElement('div');
                        empty.className = 'empty empty-compact';
                        empty.textContent = '暂无 Token';
                        list.appendChild(empty);
                        return;
                    }
                    tokens.forEach(function (t) {
                        const item = document.createElement('div');
                        item.className = 'token-item';
                        const name = document.createElement('span');
                        name.className = 't-name';
                        name.textContent = t.name;
                        const time = document.createElement('span');
                        time.className = 't-time';
                        time.textContent = '创建于 ' + fmtDateShort(t.createdAt);
                        const revoke = document.createElement('button');
                        revoke.type = 'button';
                        revoke.className = 'delete-btn';
                        revoke.textContent = '吊销';
                        revoke.setAttribute('aria-label', '吊销 ' + t.name);
                        revoke.addEventListener('click', async function () {
                            revoke.disabled = true;
                            try {
                                const res2 = await authedFetch('/api/token', { method: 'DELETE', headers: authHeaders, body: JSON.stringify({ id: t.id }) });
                                if (!res2.ok) throw new Error();
                                showToast('已吊销 ' + t.name);
                                loadTokens();
                            } catch (e) { showToast('吊销失败', 'error'); revoke.disabled = false; }
                        });
                        item.append(name, time, revoke);
                        list.appendChild(item);
                    });
                } catch (e) {
                    list.textContent = '';
                    const empty = document.createElement('div');
                    empty.className = 'settings-hint';
                    empty.textContent = 'Token 列表加载失败';
                    list.appendChild(empty);
                }
            }

            // ---------- API Token 生成：名称必填，明文仅在弹窗中显示一次 ----------
            const tokenDialog = document.getElementById('token-dialog');
            const tokenDialogValue = document.getElementById('token-dialog-value');
            function closeTokenDialog() { if (tokenDialog.open) tokenDialog.close(); }
            // 关闭即从 DOM 清除明文（关闭后无法再次查看的安全口径）
            tokenDialog.addEventListener('close', function () { tokenDialogValue.textContent = ''; });
            tokenDialog.addEventListener('click', function (e) { if (e.target === tokenDialog) closeTokenDialog(); });
            document.getElementById('token-dialog-close').addEventListener('click', closeTokenDialog);
            document.getElementById('token-dialog-copy').addEventListener('click', async function () {
                const btn = this;
                try {
                    await navigator.clipboard.writeText(tokenDialogValue.textContent);
                    const label = btn.querySelector('span');
                    if (label) label.textContent = '已复制';
                    showToast('Token 已复制到剪贴板');
                    setTimeout(function () { if (label) label.textContent = '复制'; }, 1500);
                } catch (e) { showToast('复制失败，请手动选中复制', 'error'); }
            });

            document.getElementById('token-create').addEventListener('click', async function () {
                const btn = this;
                const nameInput = document.getElementById('token-name');
                const name = nameInput.value.trim();
                // 名称必填：留空直接拒绝并提醒，不发请求
                if (!name) {
                    showToast('请先输入 Token 名称（必填）', 'error');
                    nameInput.focus();
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await authedFetch('/api/token', { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: name }) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '创建失败');
                    // 明文仅进弹窗；关闭后从 DOM 清除，且不再有任何入口查看
                    tokenDialogValue.textContent = data.token;
                    document.getElementById('token-dialog-name').textContent = '名称：' + (data.name || name) + ' · 创建于 ' + fmtDateTime(data.createdAt || Date.now());
                    if (typeof tokenDialog.showModal === 'function') tokenDialog.showModal();
                    else window.alert('API Token（仅显示一次，请立即复制）：\\n' + data.token);
                    nameInput.value = '';
                    loadTokens();
                } catch (err) { showToast(err.message || '创建失败', 'error'); }
                finally { btn.disabled = false; }
            });

            // 深链 ?view=trash 时首载即回收站视图：列表徽标先置 0，待 syncListCount 校准
            getLinks();
        })();
`
});

// ==========================================
// 4. 密码保护页（单条短链设置访问密码后的中转验证页）
// ==========================================
export function passwordHtml({ slug, error = '' } = {}) {
  return buildPage({
    title: '访问验证 · EdgeOne-ShortURL',
    scripts: [`/ui.js?v=${ASSET_VERSION}`],
    body: decoHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <h1>密码保护链接</h1>
        <p class="auth-sub">该短链接设置了访问密码，验证通过后即可继续访问（24 小时内免重复输入）。</p>
        <div class="auth-divider"></div>
        <form method="POST" action="/${slug}" class="auth-form">
            <div class="pw-wrap">
                <input type="password" name="pw" placeholder="输入访问密码…" autocomplete="current-password" required autofocus>
            </div>
            ${error ? `<div class="auth-error on">${error}</div>` : ''}
            <button type="submit" class="btn-primary">${ICON_SHIELD}<span>继续访问</span></button>
        </form>
    </div>
</div>
`,
    script: ''
  });
}

// ==========================================
// 5. 错误页（404 / 无效短链：面向外部访客的品牌化页面）
// ==========================================
export function errorPageHtml({ code = '404', title = '链接不存在', message = '该短链接不存在或已被删除。' } = {}) {
  return buildPage({
    title: `${title} · EdgeOne-ShortURL`,
    scripts: [`/ui.js?v=${ASSET_VERSION}`],
    css: `
      a.btn-primary { text-decoration: none; }
      .nf-code { margin: 0 0 10px; font-size: 3rem; font-weight: 800; line-height: 1; letter-spacing: .06em; background: linear-gradient(135deg, var(--primary-2), var(--teal)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: var(--primary); }
    `,
    body: decoHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <div class="nf-code">${code}</div>
        <h1>${title}</h1>
        <p class="auth-sub">${message}</p>
        <div class="auth-divider"></div>
        <a class="btn-primary" href="/">${ICON_ARROW}<span>返回主页</span></a>
    </div>
</div>
`,
    script: ''
  });
}