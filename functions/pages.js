// functions/pages.js
// 三个页面（登录页 / 主页 / 管理后台）的 HTML 模板。
import { QR_LIB_SRC } from './qr-src.js';

// 项目版本号：唯一来源，与 package.json 的 version 保持同步；
// 页脚、「关于项目」弹窗、登录页入口均从此常量读取。
const APP_VERSION = '3.3.8';

// GitHub 仓库与反馈入口（页脚、「关于项目」弹窗共用）
const REPO_URL = 'https://github.com/Jacky088/Edgeone-ShortURL';
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
// 设计系统 CSS（主题变量）
// ==========================================
const themeVarsCss = `
      :root {
        /* 色板：沿用设计稿 —— 深科技蓝 #1A5DE0 + 青绿 #26C4A0 */
        --primary: #1a5de0; --primary-2: #2c6bff; --primary-deep: #1246b8; --primary-soft: #e8f2fc;
        --teal: #26c4a0; --teal-soft: #e0f7f1;
        --bg-1: #eef4fe; --bg-2: #e2ecfb; --bg-blob-1: rgba(26, 93, 224, .16); --bg-blob-2: rgba(38, 196, 160, .16); --bg-blob-3: rgba(124, 92, 246, .12);
        --surface: #ffffff; --surface-2: #f5f9ff; --surface-3: #eaf1fc;
        --border: #dfe7f4; --border-strong: #c7d5ec;
        --text: #16233f; --muted: #5d6d92; --faint: #61708f;
        --input-bg: #f6f9ff;
        --nav-bg: #fbfdff;
        --nav-active-bg: #e8f2fc; --nav-active-text: #1a5de0;
        --link: #1a5de0;
        --shadow: 0 20px 45px -18px rgba(30, 70, 180, .28);
        --shadow-sm: 0 10px 24px -12px rgba(30, 70, 180, .18);
        --ring: rgba(26, 93, 224, .22);
        --error: #e5484d; --error-bg: rgba(229, 72, 77, .08); --error-border: rgba(229, 72, 77, .4);
        --success: #11906a; --success-bg: rgba(38, 196, 160, .14);
        --scrim: rgba(18, 40, 90, .35);
        --mono: ui-monospace, "SF Mono", "Cascadia Code", Consolas, "Roboto Mono", monospace;
      }
      [data-theme="dark"] {
        --primary: #4f8bff; --primary-2: #6ea3ff; --primary-deep: #5c93f8; --primary-soft: rgba(79, 139, 255, .16);
        --teal: #34d9b4; --teal-soft: rgba(52, 217, 180, .14);
        --bg-1: #0a1026; --bg-2: #0e1733; --bg-blob-1: rgba(53, 103, 255, .26); --bg-blob-2: rgba(52, 217, 180, .15); --bg-blob-3: rgba(124, 120, 255, .18);
        --surface: #121b38; --surface-2: #0d1530; --surface-3: #1a2547;
        --border: #253154; --border-strong: #35436e;
        --text: #e7edfb; --muted: #96a6cc; --faint: #7c8cb8;
        --input-bg: #0d1530;
        --nav-bg: #101830;
        --nav-active-bg: rgba(79, 139, 255, .18); --nav-active-text: #8db4ff;
        --link: #8db4ff;
        --shadow: 0 22px 50px -18px rgba(0, 0, 0, .55);
        --shadow-sm: 0 12px 26px -14px rgba(0, 0, 0, .45);
        --ring: rgba(79, 139, 255, .35);
        --error: #ff6b70; --error-bg: rgba(255, 107, 112, .1); --error-border: rgba(255, 107, 112, .4);
        --success: #3ddcb6; --success-bg: rgba(52, 217, 180, .14);
        --scrim: rgba(0, 0, 0, .5);
      }
`;

// ==========================================
// 基础布局 + 装饰背景
// ==========================================
function baseCss() {
  return `
      * { box-sizing: border-box; }
      html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      body {
        margin: 0; min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "HarmonyOS Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
        color: var(--text);
        background: linear-gradient(160deg, var(--bg-1), var(--bg-2) 55%, var(--bg-1));
        transition: background-color .35s, color .35s;
        overflow-x: hidden;
      }
      [hidden] { display: none !important; }
      :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
      button, a, input, .nav-item { touch-action: manipulation; }
      .brand-logo, .auth-logo { display: block; }

      /* 悬浮装饰光斑（纯 CSS，移动端更省性能） */
      .deco { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
      .deco i { position: absolute; border-radius: 50%; filter: blur(56px); opacity: .9; }
      .deco i:nth-child(1) { width: 340px; height: 340px; left: -80px; top: -60px; background: var(--bg-blob-1); animation: drift 26s ease-in-out infinite alternate; }
      .deco i:nth-child(2) { width: 300px; height: 300px; right: -70px; top: 20%; background: var(--bg-blob-2); animation: drift 32s ease-in-out infinite alternate-reverse; }
      .deco i:nth-child(3) { width: 260px; height: 260px; left: 30%; bottom: -90px; background: var(--bg-blob-3); animation: drift 38s ease-in-out infinite alternate; }
      @keyframes drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(40px, -30px, 0) scale(1.08); } }
      @media (prefers-reduced-motion: reduce) { .deco i { animation: none; } }
`;
}

// ==========================================
// 应用外壳 CSS（顶栏 / 侧边栏 / 卡片 / 表单 / 统计 / 表格）
// ==========================================
function appShellCss() {
  return `
      /* ---------- 顶栏 ---------- */
      .app { position: relative; z-index: 1; width: min(1160px, 100%); margin: 0 auto; padding: calc(20px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px)); min-height: 100vh; display: flex; flex-direction: column; }
      /* 大屏宽版：桌面大显示器下显示更多内容（列表 / 统计 / 设置同步加宽） */
      @media (min-width: 1440px) {
        .app { width: min(1560px, 100% - 48px); }
      }
      @media (min-width: 1800px) {
        .app { width: min(1760px, 100% - 48px); }
      }
      .app-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
      .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .brand-logo { width: 42px; height: 42px; flex: none; border-radius: 10px; box-shadow: 0 8px 18px -8px rgba(26, 93, 224, .55); }
      .brand-text { min-width: 0; line-height: 1.2; }
      .brand-name { display: block; font-size: 1.16rem; font-weight: 800; letter-spacing: .01em; }
      .brand-sub { display: block; font-size: .78rem; color: var(--muted); margin-top: 2px; }
      .top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .icon-btn { width: 42px; height: 42px; min-width: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; transition: background-color .18s, border-color .18s, transform .12s; padding: 0; text-decoration: none; -webkit-tap-highlight-color: transparent; }
      .icon-btn:hover { background: var(--surface-2); border-color: var(--border-strong); }
      .icon-btn:active { transform: scale(.94); }
      .icon-btn svg { width: 20px; height: 20px; }
      .icon-btn .icon-github { width: 19px; height: 19px; fill: currentColor; }
      .text-btn { height: 42px; padding: 0 15px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: .875rem; font-weight: 600; font-family: inherit; cursor: pointer; transition: background-color .18s, border-color .18s; text-decoration: none; -webkit-tap-highlight-color: transparent; }
      .text-btn:hover { background: var(--surface-2); border-color: var(--border-strong); }
      .text-btn svg { width: 16px; height: 16px; }
      .text-btn:disabled { opacity: .6; cursor: not-allowed; }

      /* 主题图标初始显隐（避免闪烁） */
      html[data-theme="light"] #icon-sun { display: none; }
      html[data-theme="dark"] #icon-moon { display: none; }

      /* ---------- 布局：侧边栏 + 内容 ---------- */
      .app-body { display: grid; grid-template-columns: 216px 1fr; gap: 20px; align-items: start; }
      .sidebar { position: sticky; top: calc(20px + env(safe-area-inset-top, 0px)); display: flex; flex-direction: column; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 10px; box-shadow: var(--shadow-sm); }
      .nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; border: 0; border-radius: 11px; background: transparent; color: var(--muted); font-size: .92rem; font-weight: 600; font-family: inherit; cursor: pointer; text-align: left; position: relative; transition: background-color .16s, color .16s; -webkit-tap-highlight-color: transparent; text-decoration: none; }
      .nav-item svg { width: 19px; height: 19px; flex: none; }
      .nav-item:hover { background: var(--surface-2); color: var(--text); }
      .nav-item.active { background: var(--nav-active-bg); color: var(--nav-active-text); }
      .nav-item.active::before { content: ""; position: absolute; left: 0; top: 20%; bottom: 20%; width: 3px; border-radius: 3px; background: var(--primary); }
      .nav-sep { height: 1px; margin: 6px 10px; background: var(--border); flex: none; }

      .content { min-width: 0; display: flex; flex-direction: column; gap: 20px; }
      /* 视图容器：内部卡片与图表区保持统一间距，避免贴边重叠 */
      .view { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
      .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: clamp(18px, 3vw, 26px); box-shadow: var(--shadow); }
      .card-title { margin: 0 0 14px; font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; gap: 8px; }
      .card-title svg { width: 18px; height: 18px; color: var(--primary); }
      .card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
      .card-title-row .card-title { margin: 0; }
      .card-desc { margin: -6px 0 16px; font-size: .85rem; color: var(--muted); }

      /* ---------- 按钮 ---------- */
      .btn-primary { height: 48px; padding: 0 22px; border: 0; border-radius: 12px; background: linear-gradient(135deg, var(--primary-2), var(--primary)); color: #fff; font-size: .95rem; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 10px 22px -10px rgba(26, 93, 224, .65), inset 0 1px 0 rgba(255, 255, 255, .18); transition: transform .12s, box-shadow .18s, filter .18s; -webkit-tap-highlight-color: transparent; }
      .btn-primary svg { width: 18px; height: 18px; }
      .btn-primary:hover { filter: brightness(1.06); box-shadow: 0 12px 26px -10px rgba(26, 93, 224, .7), inset 0 1px 0 rgba(255, 255, 255, .18); }
      .btn-primary:active { transform: translateY(1px) scale(.99); }
      .btn-primary:disabled { opacity: .65; cursor: not-allowed; filter: saturate(.7); transform: none; }
      .btn-ghost { height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-weight: 600; font-size: .9rem; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background-color .16s, border-color .16s; -webkit-tap-highlight-color: transparent; text-decoration: none; }
      .btn-ghost:hover { background: var(--surface-2); border-color: var(--border-strong); }
      .btn-ghost svg { width: 16px; height: 16px; flex: none; }
      .btn-ghost .icon-github { fill: currentColor; }

      /* ---------- 表单 ---------- */
      .url-row { display: flex; gap: 10px; }
      #url-input { flex: 1; min-width: 0; min-height: 48px; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .95rem; font-family: inherit; transition: border-color .18s, box-shadow .18s, background-color .18s; -webkit-appearance: none; }
      #url-input::placeholder { color: var(--faint); }
      #url-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      /* 锁定浏览器自动填充底色，避免输入框被渲染成黄/粉色 */
      input:-webkit-autofill, #url-input:-webkit-autofill, #slug-input:-webkit-autofill, .auth-form input:-webkit-autofill { box-shadow: 0 0 0 1000px var(--input-bg) inset; -webkit-text-fill-color: var(--text); caret-color: var(--text); }
      .slug-row { margin-top: 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .slug-label { font-size: .85rem; font-weight: 600; color: var(--muted); flex: none; }
      .slug-toggle { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 8px 2px; color: var(--primary); font-weight: 700; font-size: .88rem; font-family: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .slug-toggle svg { width: 15px; height: 15px; }
      #slug-input { flex: 1; min-width: 180px; min-height: 44px; padding: 10px 14px; border-radius: 11px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .92rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      #slug-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      @keyframes fade-slide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      .hint-line { margin: 12px 0 0; font-size: .8rem; color: var(--muted); display: flex; gap: 6px; align-items: flex-start; line-height: 1.55; }

      /* ---------- 结果框 ---------- */
      .result-box { display: flex; align-items: stretch; gap: 10px; background: var(--primary-soft); border: 1px solid rgba(26, 93, 224, .18); border-radius: 12px; padding: 12px 14px; }
      .result-url { flex: 1; min-width: 0; display: flex; align-items: center; color: var(--link); font-weight: 700; font-size: .95rem; font-family: var(--mono); text-decoration: none; word-break: break-all; }
      .result-url:hover { text-decoration: underline; }
      .copy-btn { flex: none; height: 40px; padding: 0 15px; border: 0; border-radius: 10px; background: var(--primary); color: #fff; font-size: .85rem; font-weight: 700; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: background-color .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
      .copy-btn svg { width: 15px; height: 15px; }
      .copy-btn:hover { background: var(--primary-deep); }
      .copy-btn:active { transform: scale(.96); }
      .copy-btn.copied { background: var(--teal); }

      /* ---------- 消息（默认隐藏，出错/成功时由 JS 设置 display） ---------- */
      .message { display: none; margin-top: 14px; padding: 12px 14px; border-radius: 12px; border: 1px solid transparent; font-size: .88rem; line-height: 1.55; }
      .message.error { color: var(--error); background: var(--error-bg); border-color: var(--error-border); }
      .message.success { color: var(--success); background: var(--success-bg); border-color: rgba(38, 196, 160, .35); }

      /* ---------- 统计卡片 ---------- */
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .stat-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
      .stat-head { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: .78rem; font-weight: 600; white-space: nowrap; }
      .stat-icon { width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); background: var(--primary-soft); flex: none; }
      .stat-icon svg { width: 16px; height: 16px; }
      .stat-value { display: block; margin-top: 12px; font-size: 1.65rem; font-weight: 800; letter-spacing: -.01em; line-height: 1; font-variant-numeric: tabular-nums; }
      /* 文本型统计值（如「最近创建」的相对日期）：缩小字号，避免日期按大数字渲染 */
      .stat-value.stat-value-text { font-size: 1.2rem; line-height: 1.3; margin-top: 15px; letter-spacing: 0; }
      .stat-note { margin-top: 14px; font-size: .8rem; color: var(--muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .stat-note .btn-ghost { height: 34px; padding: 0 12px; font-size: .8rem; border-radius: 10px; }

      /* ---------- 表格 ---------- */
      .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
      .table-wrap table { width: 100%; border-collapse: collapse; font-size: .88rem; min-width: 620px; }
      table th, table td { padding: 12px 7px; text-align: left; border-bottom: 1px solid var(--border); color: var(--text); }
      table th:first-child, table td:first-child { padding-left: 12px; }
      table th { background: var(--surface-2); color: var(--muted); font-weight: 700; font-size: .8rem; white-space: nowrap; }
      table tbody tr:last-child td { border-bottom: 0; }
      table tbody tr:hover td { background: var(--surface-2); }
      table td a { color: var(--primary); text-decoration: none; font-weight: 600; }
      table td a:hover { text-decoration: underline; }
      .slug-link { font-family: var(--mono); }
      /* 短链列：单行布局，长链省略号截断（悬停见完整 URL），复制按钮不换行 */
      .slug-cell { white-space: nowrap; }
      .slug-cell .slug-link { display: inline-block; overflow: hidden; white-space: normal; word-break: break-all; vertical-align: middle; }
      .td-nowrap { white-space: nowrap; }
      td.td-actions { white-space: nowrap; }
      .td-orig a { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; max-width: 240px; text-align: left; }
      /* 原始链接随窗口宽度折叠展示：宽屏显示更多信息 */
      @media (min-width: 1440px) { .td-orig a { max-width: 480px; } .cell-note { max-width: 420px; } }
      @media (min-width: 1800px) { .td-orig a { max-width: 640px; } .cell-note { max-width: 560px; } }
      .delete-btn { height: 32px; padding: 0 10px; border: 1px solid var(--error-border); border-radius: 9px; background: transparent; color: var(--error); font-size: .78rem; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; transition: background-color .16s, border-color .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
      .delete-btn:hover { background: var(--error-bg); border-color: var(--error); }
      .delete-btn svg { width: 14px; height: 14px; display: block; }
      .delete-btn:active { transform: scale(.96); }
      .badge { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; background: var(--primary-soft); color: var(--nav-active-text); font-size: .76rem; font-weight: 700; font-variant-numeric: tabular-nums; }
      .empty { text-align: center; color: var(--muted); padding: 26px 0; }
      /* 长列表分页：一次渲染前 N 条，「加载更多」追加 */
      .load-more { display: flex; justify-content: center; margin-top: 12px; }

      /* ---------- 图表 ---------- */
      .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
      .chart-card { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
      .chart-card h3 { margin: 0 0 14px; font-size: .85rem; color: var(--muted); font-weight: 700; }
      .bar-chart { display: flex; align-items: flex-end; gap: 8px; }
      .bar-col { flex: 1; min-width: 0; height: 150px; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; padding-top: 20px; }
      .bar-track { position: relative; width: 70%; max-width: 34px; margin: 0 auto; height: 100%; background: var(--primary-soft); border-radius: 7px 7px 3px 3px; }
      .bar-val { position: absolute; top: -20px; left: 0; right: 0; text-align: center; font-size: .72rem; color: var(--muted); font-variant-numeric: tabular-nums; }
      .bar-fill { position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(180deg, var(--primary-2), var(--primary)); border-radius: 7px 7px 3px 3px; }
      .bar-fill.today { background: var(--teal); }
      .bar-label { text-align: center; font-size: .72rem; color: var(--muted); font-weight: 600; font-variant-numeric: tabular-nums; }
      .top-links { display: flex; flex-direction: column; gap: 12px; padding-top: 2px; }
      .top-link-head { display: flex; justify-content: space-between; gap: 10px; font-size: .82rem; margin-bottom: 6px; }
      .top-link-slug { font-family: var(--mono); color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      a.top-link-slug { text-decoration: none; }
      a.top-link-slug:hover { color: var(--primary); }
      .top-link-count { color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 600; }
      .progress { height: 8px; border-radius: 999px; background: var(--primary-soft); overflow: hidden; }
      .progress i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), var(--teal)); }

      /* ---------- 登录页 ---------- */
      .auth-wrap { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 84px 20px 32px; }
      .auth-top { position: fixed; top: calc(16px + env(safe-area-inset-top, 0px)); right: calc(16px + env(safe-area-inset-right, 0px)); z-index: 2; display: flex; gap: 8px; align-items: center; }
      .auth-card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 34px 30px 28px; box-shadow: var(--shadow); text-align: center; }
      .auth-logo { width: 58px; height: 58px; border-radius: 15px; margin: 0 auto 16px; box-shadow: 0 12px 26px -10px rgba(26, 93, 224, .6); }
      .auth-card h1 { margin: 0; font-size: 1.45rem; letter-spacing: .01em; }
      .auth-sub { margin: 8px 0 0; color: var(--muted); font-size: .88rem; }
      .auth-divider { width: 44px; height: 3px; margin: 18px auto; border-radius: 3px; background: linear-gradient(90deg, var(--primary), var(--teal)); }
      .auth-label { margin: 0 0 14px; font-size: .85rem; color: var(--muted); text-align: left; font-weight: 600; }
      .auth-form { display: flex; flex-direction: column; gap: 12px; }
      .auth-form input { min-height: 48px; padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .95rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .auth-form input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .auth-error { display: none; margin-top: 12px; padding: 10px 14px; border-radius: 11px; font-size: .85rem; color: var(--error); background: var(--error-bg); border: 1px solid var(--error-border); }

      /* ---------- 页脚 / Toast ---------- */
      .app-footer { text-align: center; font-size: .78rem; color: var(--faint); }
      /* 应用页页脚吸底；登录页页脚跟在卡片下方（不参与吸底，保证卡片居中） */
      .app > .app-footer { margin-top: auto; padding-top: 12px; }
      .auth-wrap .app-footer { margin-top: 14px; }
      .app-footer a { color: var(--muted); text-decoration: none; }
      .toast { position: fixed; left: 50%; top: calc(24px + env(safe-area-inset-top, 0px)); transform: translate(-50%, -12px) scale(.98); opacity: 0; pointer-events: none; z-index: 50; background: var(--text); color: var(--surface); padding: 11px 18px; border-radius: 999px; font-size: .85rem; font-weight: 600; box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .35); transition: opacity .2s, transform .2s; max-width: calc(100vw - 40px); text-align: center; }
      .toast.show { opacity: 1; transform: translate(-50%, 0) scale(1); }
      /* 可关闭提醒（登录成功等）：3 秒自动消失，点 × 或气泡立即关闭 */
      .toast-closable { display: inline-flex; align-items: center; gap: 10px; }
      .toast-text { min-width: 0; }
      .toast-close { flex: none; width: 20px; height: 20px; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 15px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; opacity: .6; font-family: inherit; }
      .toast-close:hover { opacity: 1; }

      /* ---------- 列表工具栏（搜索 / 刷新） ---------- */
      .table-toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
      .search-wrap { position: relative; flex: 1; min-width: 200px; }
      .search-wrap > svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: var(--faint); pointer-events: none; }
      .search-wrap input { width: 100%; min-height: 42px; padding: 10px 14px 10px 37px; border-radius: 11px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .9rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .search-wrap input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .search-wrap input::placeholder { color: var(--faint); }
      .tb-btn { height: 42px; padding: 0 14px; font-size: .85rem; }
      .tb-btn svg { width: 15px; height: 15px; }
      .tb-btn.spinning svg { animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .tb-btn.spinning svg { animation: none; } }

      /* 可排序表头（访问次数 / 创建时间） */
      th.th-sort { cursor: pointer; user-select: none; -webkit-user-select: none; }
      th.th-sort:hover { color: var(--text); }
      th.th-sort .arrow { display: inline-block; margin-left: 3px; color: var(--primary); }

      /* 行内复制按钮（表格短链列） */
      .row-copy { width: 30px; height: 30px; margin-left: 8px; padding: 0; vertical-align: middle; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--muted); cursor: pointer; transition: color .16s, border-color .16s, background-color .16s; -webkit-tap-highlight-color: transparent; }
      .row-copy:hover { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
      .row-copy.copied { color: var(--success); border-color: var(--success); }
      .row-copy svg { width: 14px; height: 14px; }

      /* ---------- 骨架屏 ---------- */
      .skel { height: 14px; border-radius: 7px; background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 45%, var(--surface-2) 65%); background-size: 200% 100%; animation: skel 1.2s ease infinite; }
      td .skel { width: 82%; }
      @keyframes skel { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      @media (prefers-reduced-motion: reduce) { .skel { animation: none; } }

      /* ---------- 确认弹窗（删除等破坏性操作） ---------- */
      dialog { width: min(520px, calc(100% - 32px)); border: 1px solid var(--border); border-radius: 16px; padding: 24px; background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
      dialog h2 { margin: 0 0 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
      dialog h2 svg { width: 18px; height: 18px; color: var(--error); }
      dialog::backdrop { background: var(--scrim); }
      .dialog-text { margin: 0 0 18px; font-size: .9rem; color: var(--muted); line-height: 1.6; word-break: break-all; }
      .dialog-text b { color: var(--text); font-family: var(--mono); }
      .row-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .btn-danger { height: 44px; border: 0; border-radius: 12px; background: var(--error); color: #fff; font-weight: 700; font-size: .9rem; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: filter .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
      .btn-danger:hover { filter: brightness(1.08); }
      .btn-danger:active { transform: scale(.98); }

      /* 访问详情弹窗：宽版横向布局（移动端自动收窄为单列） */
      #detail-dialog { width: min(760px, calc(100% - 32px)); }
      #detail-body { display: flex; flex-direction: column; gap: 14px; }
      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .detail-grid .span-2 { grid-column: 1 / -1; }
      .detail-grid .bar-chart { gap: 3px; }
      .detail-grid .bar-label { font-size: .64rem; }
      @media (max-width: 620px) { .detail-grid { grid-template-columns: 1fr; } .opt-pair { grid-template-columns: 1fr; } }

      /* 二维码弹窗 */
      .qr-view { display: flex; justify-content: center; padding: 4px 0 16px; }
      .qr-view canvas { width: 240px; height: 240px; image-rendering: pixelated; border-radius: 8px; background: #fff; }

      /* ---------- 「关于项目」弹窗 ---------- */
      .about-close { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: background-color .16s, color .16s; }
      .about-close:hover { background: var(--surface-2); color: var(--text); }
      .about-close svg { width: 16px; height: 16px; }
      .about-card { text-align: center; }
      .about-card h2 { margin: 0; justify-content: center; font-size: 1.2rem; }
      .about-logo { width: 54px; height: 54px; border-radius: 13px; margin: 0 auto 12px; box-shadow: 0 12px 26px -10px rgba(26, 93, 224, .6); }
      .about-sub { margin: 6px 0 0; font-size: .85rem; color: var(--muted); }
      .version-badge { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; margin-top: 10px; border-radius: 999px; background: var(--primary-soft); color: var(--nav-active-text); font-size: .78rem; font-weight: 700; font-variant-numeric: tabular-nums; }
      .about-desc { margin: 14px 0; font-size: .84rem; color: var(--muted); line-height: 1.7; }
      .about-info { display: flex; flex-direction: column; gap: 9px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; margin-bottom: 16px; text-align: left; }
      .about-info-row { display: flex; justify-content: space-between; gap: 12px; font-size: .82rem; line-height: 1.5; }
      .about-info-row .k { color: var(--muted); flex: none; }
      .about-info-row .v { color: var(--text); font-weight: 600; text-align: right; word-break: break-all; }

      /* 登录页「关于项目」入口 */
      .auth-about { display: inline-flex; align-items: center; gap: 5px; margin-top: 18px; border: 0; background: none; padding: 6px 10px; border-radius: 9px; color: var(--faint); font-size: .78rem; font-weight: 600; font-family: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .auth-about:hover { color: var(--primary); background: var(--primary-soft); }
      .auth-about svg { width: 14px; height: 14px; flex: none; }
      .auth-about span { white-space: nowrap; }

      /* ---------- 登录页口令可见性切换 ---------- */
      .pw-wrap { position: relative; }
      .pw-wrap input { width: 100%; padding-right: 48px; }
      .eye-btn { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; -webkit-tap-highlight-color: transparent; }
      .eye-btn:hover { background: var(--surface-3); color: var(--text); }
      .eye-btn svg { width: 18px; height: 18px; }

      /* ---------- 生成结果 + 二维码 ---------- */
      .result-flex { display: flex; gap: 14px; align-items: stretch; }
      .result-flex .result-box { flex: 1; min-width: 0; }
      .result-qr { flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; }
      .result-qr canvas { display: block; width: 108px; height: 108px; border-radius: 6px; image-rendering: pixelated; }
      .qr-cap { font-size: .72rem; color: var(--muted); font-weight: 600; white-space: nowrap; }
      .qr-dl-btn { height: 30px; padding: 0 10px; font-size: .76rem; border-radius: 9px; }
      .qr-dl-btn svg { width: 13px; height: 13px; }

      /* 自定义短链实时反馈 */
      #slug-input.invalid { border-color: var(--error); box-shadow: 0 0 0 4px var(--error-bg); }
      .slug-count { font-size: .76rem; color: var(--faint); font-variant-numeric: tabular-nums; }

      /* ---------- 创建表单扩展（更多选项 / 批量创建） ---------- */
      .form-toggles { display: flex; gap: 4px 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
      .opts-panel { margin-top: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; animation: fade-slide .22s ease; }
      .opts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 16px; }
      .opts-grid label { display: flex; flex-direction: column; gap: 6px; font-size: .8rem; font-weight: 600; color: var(--muted); }
      .opts-grid input, .opts-grid select { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .9rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .opts-grid input:focus, .opts-grid select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      #batch-import { width: 100%; resize: vertical; min-height: 72px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .88rem; font-family: var(--mono); line-height: 1.6; transition: border-color .18s, box-shadow .18s; }
      #batch-import:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .batch-import-wrap { display: flex; flex-direction: column; gap: 8px; }
      .batch-import-ops { display: flex; gap: 8px; flex-wrap: wrap; }
      .batch-submit { align-self: stretch; width: 100%; }
      /* 批量逐行编辑器：≥820px 一行排开（序号 + 三个输入框 + 删除）；
         窄屏切换为固定两档网格（序号左栏贯穿，右侧三行），任何宽度都不会错位 */
      .batch-rows { display: flex; flex-direction: column; gap: 8px; }
      .batch-row-edit { display: grid; grid-template-columns: min-content minmax(260px, 2.2fr) minmax(170px, 1.3fr) minmax(150px, 1fr) 38px; gap: 8px; align-items: center; border: 1px solid var(--border); border-radius: 10px; background: var(--input-bg); padding: 10px; }
      .batch-row-edit.invalid { border-color: var(--error); box-shadow: 0 0 0 3px var(--error-bg); }
      .bre-idx { font-size: .8rem; font-weight: 700; color: var(--faint); font-variant-numeric: tabular-nums; text-align: center; }
      .batch-row-edit input { min-width: 0; min-height: 38px; padding: 9px 10px; border-radius: 9px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: .88rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; }
      .batch-row-edit input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .bre-del { width: 38px; min-height: 38px; border: 0; border-radius: 9px; background: var(--error); color: #fff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: filter .16s, transform .12s; }
      .bre-del:hover { filter: brightness(1.08); }
      .bre-del:active { transform: scale(.94); }
      .bre-del svg { width: 14px; height: 14px; }
      @media (max-width: 820px) {
        .batch-row-edit { grid-template-columns: min-content 1fr 38px; grid-template-areas: "idx url del" "idx slug slug" "idx note note"; }
        .bre-idx { grid-area: idx; }
        .br-url { grid-area: url; }
        .br-slug { grid-area: slug; }
        .br-note { grid-area: note; }
        .bre-del { grid-area: del; }
      }
      .batch-ops { display: flex; gap: 8px; flex-wrap: wrap; }
      .batch-op { height: 36px; padding: 0 12px; font-size: .8rem; }
      .batch-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
      .batch-row:last-child { border-bottom: 0; }
      .batch-row .copy-btn { height: 34px; padding: 0 12px; }
      .batch-err { color: var(--error); font-size: .82rem; line-height: 1.5; word-break: break-all; }
      .cell-note { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .72rem; color: var(--faint); margin-top: 2px; }
      .cell-badge { display: inline-flex; margin-left: 6px; height: 18px; padding: 0 7px; align-items: center; border-radius: 999px; font-size: .68rem; font-weight: 700; background: var(--surface-3); color: var(--muted); vertical-align: middle; }
      .cell-badge.warn { background: var(--error-bg); color: var(--error); }
      .row-edit { height: 32px; padding: 0 8px; margin-right: 4px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); color: var(--muted); font-size: .78rem; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; transition: color .16s, border-color .16s; -webkit-tap-highlight-color: transparent; }
      .row-edit svg { width: 14px; height: 14px; display: block; }
      .row-edit:hover { color: var(--primary); border-color: var(--primary); }
      .row-restore { color: var(--success); border-color: var(--success); }
      .row-restore:hover { color: var(--success); border-color: var(--success); background: var(--success-bg); }
      .trash-toggle.on { color: var(--nav-active-text); border-color: var(--primary); background: var(--nav-active-bg); }

      /* ---------- 系统设置 ---------- */
      .settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
      .settings-card { border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2); padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; margin: 0; }
      .settings-card legend { font-weight: 700; font-size: .84rem; color: var(--muted); padding: 0 6px; }
      .settings-card label { display: flex; flex-direction: column; gap: 5px; font-size: .8rem; font-weight: 600; color: var(--muted); }
      .settings-card label.chk { flex-direction: row; align-items: center; gap: 8px; }
      .settings-card input[type="text"], .settings-card input[type="password"], .settings-card input[type="number"], .settings-card select, .settings-card textarea { width: 100%; min-width: 0; height: 38px; padding: 0 10px; border-radius: 9px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .88rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .settings-card textarea { height: auto; padding: 8px 10px; resize: vertical; font-family: var(--mono); font-size: .8rem; line-height: 1.6; }
      .settings-card input:focus, .settings-card select:focus, .settings-card textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .settings-card input[type="color"] { padding: 2px; height: 38px; width: 64px; }
      .settings-card input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
      .settings-hint { margin: 0; font-size: .76rem; color: var(--faint); line-height: 1.6; }
      .opt-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .qr-logo-row { display: flex; gap: 14px; align-items: center; }
      .qr-logo-preview { width: 56px; height: 56px; border-radius: 12px; background: #fff; border: 1px solid var(--border); object-fit: contain; padding: 5px; box-sizing: border-box; flex: none; }
      .qr-logo-ops { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
      .qr-logo-ops .btn-ghost { height: 36px; padding: 0 14px; font-size: .8rem; justify-content: center; }
      .qr-upload-btn { cursor: pointer; }
      .qr-upload-btn input[type="file"] { display: none; }
      .token-create { display: flex; gap: 8px; }
      .token-create input { flex: 1; min-width: 0; }
      .token-new { display: flex; align-items: center; gap: 10px; background: var(--success-bg); border: 1px solid rgba(38, 196, 160, .35); border-radius: 10px; padding: 8px 10px; }
      .token-new code { flex: 1; font-family: var(--mono); font-size: .76rem; word-break: break-all; color: var(--success); font-weight: 700; }
      .token-list { display: flex; flex-direction: column; gap: 6px; }
      .token-item { display: flex; align-items: center; gap: 10px; font-size: .82rem; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
      .token-item .t-name { font-weight: 700; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .token-item .t-time { color: var(--faint); font-size: .74rem; white-space: nowrap; }

      /* 编辑短链弹窗 */
      .edit-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
      .edit-form label { display: flex; flex-direction: column; gap: 5px; font-size: .8rem; font-weight: 600; color: var(--muted); }
      .edit-form label.chk { flex-direction: row; align-items: center; gap: 8px; }
      .edit-form input, .edit-form select { width: 100%; min-width: 0; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .9rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .edit-form input:focus, .edit-form select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .edit-form input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
      .detail-section { margin-top: 14px; }

      /* 主题切换过渡：仅在切换瞬间由 JS 挂上 theme-anim 类，避免首屏闪烁与日常动画冲突 */
      html.theme-anim * { transition: background-color .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease; }

      /* 卡片入场动画（reduced-motion 下禁用） */
      @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      .card { animation: rise .4s ease both; }
      .content .card:nth-of-type(2) { animation-delay: .05s; }
      .content .card:nth-of-type(3) { animation-delay: .1s; }
      .auth-card { animation: rise .45s ease both; }
      @media (prefers-reduced-motion: reduce) { .card, .auth-card { animation: none; } }

      /* ---------- 响应式 ---------- */
      @media (max-width: 860px) {
        .app-body { grid-template-columns: 1fr; }
        .sidebar { position: static; flex-direction: row; overflow-x: auto; gap: 4px; padding: 8px; scroll-snap-type: x proximity; }
        .nav-item { flex: 0 0 auto; min-height: 46px; min-width: max-content; width: auto; padding: 10px 14px; }
        .nav-item.active::before { display: none; }
        .chart-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 620px) {
        .app { padding-left: 14px; padding-right: 14px; }
        .brand-sub { display: none; }
        .url-row { flex-direction: column; }
        .url-row .btn-primary { width: 100%; }
        .result-box { flex-direction: column; align-items: stretch; }
        .result-flex { flex-direction: column; }
        .result-qr { flex-direction: row; align-self: center; }
        .copy-btn { justify-content: center; height: 42px; }
        .table-wrap table { min-width: 480px; }
        .table-toolbar { flex-direction: column; align-items: stretch; }
        .tb-btn { justify-content: center; }
        /* 移动端隐藏「原始链接」「创建时间」列（按列类名隐藏，列序调整时不会错位） */
        .col-orig { display: none; }
        .col-created { display: none; }
        .stat-value { font-size: 1.45rem; }
        /* 后台菜单 2×2 网格完整显示，不横向滑动 */
        .sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; overflow-x: visible; }
        .nav-item { min-width: 0; }
        .nav-sep { display: none; }
        /* iOS 聚焦时禁止自动放大 */
        input, #url-input, #slug-input, .auth-form input { font-size: 16px; }
      }
`;
}

// ==========================================
// 页面外壳（含头部防闪烁的主题预载脚本）
// ==========================================
function buildPage({ title, extraHead = '', css, body, script }) {
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
${extraHead}    <style>
${css}    </style>
</head>
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
  return `<a class="icon-btn" href="https://github.com/Jacky088/Edgeone-ShortURL" target="_blank" rel="noopener noreferrer" title="GitHub: Jacky088/Edgeone-ShortURL">${ICON_GITHUB}</a>`;
}

function brandHtml() {
  return `<div class="brand">${logoHtml('brand-logo')}
      <div class="brand-text"><span class="brand-name">Edgeone-ShortURL</span><span class="brand-sub">基于 EO 的一个短链接转换服务</span></div>
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

// 统一页脚（主页 / 管理后台 / 登录页共用一份文案）
function appFooterHtml() {
  return `<footer class="app-footer">运行在 EdgeOne Pages · v${APP_VERSION} · <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">开源项目</a> · <a href="${ISSUES_URL}" target="_blank" rel="noopener noreferrer">问题反馈</a></footer>`;
}

// 前台顶栏「管理后台」入口：由服务端按 ADMIN_PATH 是否配置决定渲染（__ADMIN_TOP_BUTTON__ 占位符）
export const ADMIN_BUTTON_HTML = `<a class="text-btn goto-admin" href="#">${ICON_SHIELD}<span>管理后台</span></a>`;

// 登录页右上角动作区（不设「管理后台」入口：登录成功即进入系统，该入口在登录页只会造成困惑）
function loginActionsHtml() {
  return `<div class="auth-top">
      ${githubHtml()}
      ${themeToggleHtml()}
    </div>`;
}

// 生成已登录状态的动作区（管理后台页使用；主页动作区因含条件渲染的管理入口而单独组装）
// 「返回前台」固定在动作区第一位
function authedActionsHtml({ admin = false, backHome = false } = {}) {
  return `<div class="top-actions">
      ${backHome ? `<a class="text-btn" href="/">${ICON_ARROW}<span>返回前台</span></a>` : ''}
      ${admin ? `<a class="text-btn goto-admin" href="#">${ICON_SHIELD}<span>管理后台</span></a>` : ''}
      ${githubHtml()}
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

const toastJs = `
      function showToast(text) {
        let t = document.getElementById('toast');
        if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2400);
      }
      // 可关闭提醒（登录成功等）：默认 3 秒自动消失，点击关闭按钮或提醒本身立即关闭
      function showToastClosable(text, duration) {
        let t = document.getElementById('toast-closable');
        if (!t) {
          t = document.createElement('div');
          t.id = 'toast-closable';
          t.className = 'toast toast-closable';
          t.setAttribute('role', 'status');
          const label = document.createElement('span');
          label.className = 'toast-text';
          const close = document.createElement('button');
          close.type = 'button';
          close.className = 'toast-close';
          close.setAttribute('aria-label', '关闭提醒');
          close.textContent = '×';
          t.append(label, close);
          t.addEventListener('click', dismiss);
          document.body.appendChild(t);
        }
        function dismiss() { clearTimeout(t._timer); t.classList.remove('show'); }
        t.querySelector('.toast-text').textContent = text;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(dismiss, duration || 3000);
      }
`;

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
        <h2>Edgeone-ShortURL</h2>
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
  css: themeVarsCss + baseCss() + appShellCss(),
  body: decoHtml() + loginActionsHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <h1>Edgeone-ShortURL</h1>
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
  script: themeJs + toastJs + aboutJs + `
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
  css: themeVarsCss + baseCss() + appShellCss(),
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
                <h2 class="card-title">${ICON_CHAIN}<span>输入长链接</span></h2>
                <form id="link-form" novalidate>
                    <div class="url-row">
                        <input type="url" id="url-input" placeholder="https://www.example.com/very-long-url" autocomplete="url" enterkeyhint="go" required>
                        <button type="submit" class="btn-primary" id="submit-btn">${ICON_CHAIN}<span>生成短链</span></button>
                    </div>
                    <div class="form-toggles">
                        <button type="button" class="slug-toggle" id="opts-toggle" aria-expanded="false" aria-controls="opts-panel">${ICON_SLIDERS}<span>更多选项</span></button>
                        <button type="button" class="slug-toggle" id="batch-toggle" aria-expanded="false" aria-controls="batch-panel">${ICON_LIST}<span>批量创建</span></button>
                    </div>
                    <div class="slug-row">
                        <label class="slug-label" for="slug-input">自定义短链</label>
                        <input type="text" id="slug-input" maxlength="64" placeholder="留空则随机生成" autocomplete="off" spellcheck="false">
                        <span class="slug-count" id="slug-count"></span>
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
                    <div class="opts-panel" id="batch-panel" hidden>
                        <div class="batch-rows" id="batch-rows"></div>
                        <div class="batch-ops">
                            <button type="button" class="btn-ghost batch-op" id="batch-add">${ICON_PLUS}<span>添加一行</span></button>
                            <button type="button" class="btn-ghost batch-op" id="batch-import-toggle" aria-expanded="false" aria-controls="batch-import">${ICON_PENCIL}<span>从文本导入</span></button>
                            <button type="button" class="btn-ghost batch-op" id="batch-clear">${ICON_TRASH}<span>清空</span></button>
                        </div>
                        <div class="batch-import-wrap" id="batch-import-wrap" hidden>
                            <p class="settings-hint" style="margin: 0;">支持两种方式导入：① 将文本内容粘贴到下方输入框，每行一条；② 直接选择 .txt / .csv 文件导入，每行一条，一次最多 20 条。格式：链接 [自定义短链] [备注]（空格分隔）</p>
                            <textarea id="batch-import" rows="3" placeholder="https://example.com/a my-link&#10;https://example.com/b"></textarea>
                            <div class="batch-import-ops">
                                <label class="btn-ghost batch-op">选择 .txt / .csv 文件<input type="file" id="batch-import-file" accept=".txt,.csv,text/plain,text/csv" hidden></label>
                                <button type="button" class="btn-ghost batch-op" id="batch-import-go">确认导入</button>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary batch-submit">${ICON_CHAIN}<span>生成短链</span></button>
                        <p class="hint-line">每行生成一条短链，「自定义短链 / 备注」可逐行填写（留空则随机生成）；上方「更多选项」将应用到全部，一次最多 20 条。</p>
                    </div>
                    <p class="hint-line">仅支持 http/https 开头的完整链接；自定义短链可使用字母、数字、短横线、下划线，最长 64 位。</p>
                    <div class="message error" id="error-message"></div>
                </form>
            </section>

            <section class="card" id="result-card" hidden>
                <h2 class="card-title">${ICON_CHECK}<span>生成结果</span></h2>
                <div class="result-flex" id="result-single">
                    <div class="result-box">
                        <a href="#" target="_blank" rel="noopener noreferrer" class="result-url" id="result-link"></a>
                        <button type="button" class="copy-btn" id="copy-btn">${ICON_COPY}<span>复制</span></button>
                    </div>
                    <div class="result-qr" id="result-qr" hidden>
                        <canvas id="qr-canvas" aria-label="短链二维码"></canvas>
                        <span class="qr-cap">扫码访问</span>
                        <button type="button" class="btn-ghost qr-dl-btn" id="qr-download" hidden>${ICON_DOWNLOAD}<span>下载</span></button>
                    </div>
                </div>
                <div id="result-list" hidden></div>
                <p class="hint-line">短链已创建成功，点击链接可跳转原文并累计访问次数；也可扫码在手机上打开。</p>
            </section>

        </main>
        ${appFooterHtml()}
</div>
`,
  script: QR_LIB_SRC + '\n' + themeJs + toastJs + loginToastJs('登录成功，现在可以创建短链接了。') + adminLinkJs + logoutJs + `
        // 创建短链逻辑（与原实现一致：POST /api/create）
        (function () {
            const form = document.getElementById('link-form');
            const urlInput = document.getElementById('url-input');
            const slugInput = document.getElementById('slug-input');
            const slugCount = document.getElementById('slug-count');
            const submitBtn = document.getElementById('submit-btn');
            const errorMessage = document.getElementById('error-message');
            const resultCard = document.getElementById('result-card');
            const resultLink = document.getElementById('result-link');
            const copyBtn = document.getElementById('copy-btn');
            const qrBox = document.getElementById('result-qr');
            const qrDownload = document.getElementById('qr-download');
            const urlRow = document.querySelector('.url-row');
            const slugRowEl = document.querySelector('.slug-row');
            const optsToggle = document.getElementById('opts-toggle');
            const optsPanel = document.getElementById('opts-panel');
            const batchToggle = document.getElementById('batch-toggle');
            const batchPanel = document.getElementById('batch-panel');
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
            // 二维码样式来自运行时设置（服务端注入）；占位符由 functions/[slug]/index.js 替换
            const QR_CFG = __QR_SETTINGS__;
            const QR_LOGO_SRC = '${QR_LOGO_DATA_URL}';
            const submitLabel = submitBtn.querySelector('span');

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
                    // 批量草稿：展开批量面板，按行回填（每行「链接 [短链]」）
                    batchPanel.hidden = false;
                    batchToggle.setAttribute('aria-expanded', 'true');
                    urlRow.hidden = true;
                    savedUrl.split('\\n').forEach(function (line) {
                        const tokens = line.trim().split(/\\s+/).filter(Boolean);
                        if (tokens.length) batchAddRow(tokens[0], tokens[1] || '');
                    });
                } else {
                    urlInput.value = savedUrl;
                    if (savedSlug) {
                        slugInput.value = savedSlug;
                        slugCount.textContent = savedSlug.length + '/64';
                    }
                }
                showToastClosable('已恢复上次填写的内容，点击「生成短链」继续。', 3600);
                urlInput.focus();
            })();

            // 「更多选项 / 批量创建」折叠面板切换；批量模式隐藏单链接输入行
            optsToggle.addEventListener('click', () => {
                const opening = optsPanel.hidden;
                optsPanel.hidden = !opening;
                optsToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
            });
            batchToggle.addEventListener('click', () => {
                const opening = batchPanel.hidden;
                batchPanel.hidden = !opening;
                batchToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
                urlRow.hidden = opening;
                // 自定义短链仅适用于单条创建：批量模式下隐藏
                slugRowEl.hidden = opening;
                if (opening) {
                    if (!batchRowsEl.children.length) { batchAddRow(); batchAddRow(); batchAddRow(); }
                    const first = batchRowsEl.querySelector('.br-url');
                    if (first) first.focus();
                } else {
                    urlInput.focus();
                }
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
            }
            function clearBatchRows() {
                batchRowsEl.textContent = '';
                batchAddRow(); batchAddRow(); batchAddRow();
            }
            document.getElementById('batch-add').addEventListener('click', function () {
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

            urlInput.addEventListener('input', () => urlInput.classList.remove('invalid'));
            slugInput.addEventListener('input', function () {
                slugInput.classList.remove('invalid');
                slugCount.textContent = this.value.length ? this.value.length + '/64' : '';
            });

            function setLoading(isLoading) {
                submitBtn.disabled = isLoading;
                submitLabel.textContent = isLoading ? '生成中…' : '生成短链';
            }

            function showError(message) {
                errorMessage.textContent = message;
                errorMessage.style.display = 'block';
            }

            // 将短链绘制为二维码（白底保证任何主题下都可扫描；
            // 样式来自运行时设置：中心 Logo 时自动提升纠错等级为 H）
            function drawQr(text) {
                try {
                    if (typeof qrcode !== 'function') { qrBox.hidden = true; if (qrDownload) qrDownload.hidden = true; return; }
                    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
                    const withLogo = !!(QR_CFG && QR_CFG.centerLogo);
                    const qr = qrcode(0, withLogo ? 'H' : 'M');
                    qr.addData(text);
                    qr.make();
                    const count = qr.getModuleCount();
                    const quiet = 4, scale = 4;
                    const size = (count + quiet * 2) * scale;
                    const canvas = document.getElementById('qr-canvas');
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);
                    ctx.fillStyle = (QR_CFG && QR_CFG.dark) || '#16181d';
                    for (let r = 0; r < count; r++) {
                        for (let c = 0; c < count; c++) {
                            if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
                        }
                    }
                    if (withLogo) {
                        const logoSize = Math.round(size * 0.22);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect((size - logoSize) / 2 - 4, (size - logoSize) / 2 - 4, logoSize + 8, logoSize + 8);
                        const img = new Image();
                        img.onload = function () { ctx.drawImage(img, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize); };
                        // 自定义 Logo 优先，未上传时使用网站品牌 Logo
                        img.src = (QR_CFG && QR_CFG.logoDataUrl) || QR_LOGO_SRC;
                    }
                    qrBox.hidden = false;
                    if (qrDownload) qrDownload.hidden = false;
                } catch (err) { qrBox.hidden = true; if (qrDownload) qrDownload.hidden = true; }
            }

            function showSuccess(newLink) {
                resultList.hidden = true;
                resultSingle.hidden = false;
                const shortUrl = window.location.origin + '/' + newLink.slug;
                resultLink.href = shortUrl;
                resultLink.textContent = shortUrl.replace(/^https?:\\/\\//, '');
                copyBtn.dataset.url = shortUrl;
                resultCard.hidden = false;
                drawQr(shortUrl);
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // 批量创建结果：成功行（短链 + 复制）与失败行（原因）分区展示，支持一键全部复制
            function showBatchSuccess(results, errors) {
                resultSingle.hidden = true;
                resultList.hidden = false;
                resultList.textContent = '';
                results.forEach(function (r) {
                    const shortUrl = window.location.origin + '/' + r.slug;
                    const row = document.createElement('div');
                    row.className = 'batch-row';
                    const a = document.createElement('a');
                    a.className = 'result-url';
                    a.href = shortUrl;
                    a.target = '_blank'; a.rel = 'noopener noreferrer';
                    a.textContent = shortUrl.replace(/^https?:\\/\\//, '');
                    a.title = r.original || '';
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'copy-btn';
                    btn.dataset.url = shortUrl;
                    btn.innerHTML = ICON_COPY_SVG;
                    btn.setAttribute('aria-label', '复制 ' + shortUrl);
                    row.append(a, btn);
                    resultList.appendChild(row);
                });
                (errors || []).forEach(function (err) {
                    const row = document.createElement('div');
                    row.className = 'batch-row';
                    const msg = document.createElement('div');
                    msg.className = 'batch-err';
                    msg.textContent = '✕ ' + err.url + '：' + err.error;
                    row.appendChild(msg);
                    resultList.appendChild(row);
                });
                if (results.length > 1) {
                    const allRow = document.createElement('div');
                    allRow.className = 'batch-row';
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
                        } catch (e) { showToast('复制失败，请手动复制'); }
                    });
                    allRow.appendChild(allBtn);
                    resultList.appendChild(allRow);
                }
                resultCard.hidden = false;
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                if (!batchPanel.hidden) {
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
                        if (slugErr) { showError('第 ' + (i + 1) + ' 行：' + slugErr); row.classList.add('invalid'); row.querySelector('.br-slug').focus(); return; }
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
                if (slugError) { showError(slugError); slugInput.focus(); return; }
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
                        throw new Error(data.error || '创建链接失败。');
                    }
                    const newLink = await res.json();
                    urlInput.value = '';
                    slugInput.value = '';
                    slugCount.textContent = '';
                    showSuccess(newLink);
                } catch (err) { showError(err.message); } finally { setLoading(false); }
            }

            copyBtn.addEventListener('click', async () => {
                const url = copyBtn.dataset.url;
                if (!url) return;
                const label = copyBtn.querySelector('span');
                try {
                    await navigator.clipboard.writeText(url);
                    copyBtn.classList.add('copied');
                    label.textContent = '已复制';
                    setTimeout(() => { copyBtn.classList.remove('copied'); label.textContent = '复制'; }, 1600);
                } catch (err) { showToast('复制失败，请手动复制'); }
            });

            form.addEventListener('submit', createLink);

            // 批量结果行的复制按钮（事件委托）
            resultList.addEventListener('click', async (e) => {
                const btn = e.target.closest('.copy-btn');
                if (!btn || !btn.dataset.url) return;
                try {
                    await navigator.clipboard.writeText(btn.dataset.url);
                    btn.classList.add('copied');
                    setTimeout(() => btn.classList.remove('copied'), 1500);
                } catch (err) { showToast('复制失败，请手动复制'); }
            });

            // 二维码下载：画布导出 PNG
            if (qrDownload) qrDownload.addEventListener('click', function () {
                const canvas = document.getElementById('qr-canvas');
                if (!canvas || !canvas.width) return;
                try {
                    const slugPart = (copyBtn.dataset.url || '').split('/').pop() || 'code';
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'shorturl-qr-' + slugPart + '.png';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } catch (err) { showToast('二维码下载失败，请截图保存'); }
            });
        })();
`
});

// ==========================================
// 3. 管理后台页面（短链列表 + 访问统计）
// ==========================================
export const adminHtml = buildPage({
  title: '短链接生成服务 - 管理后台',
  css: themeVarsCss + baseCss() + appShellCss(),
  body: decoHtml() + `
<div class="app">
    <header class="app-header">
        ${brandHtml()}
        ${authedActionsHtml({ backHome: true })}
    </header>
    <div class="app-body">
        <nav class="sidebar" aria-label="主导航">
            <button type="button" class="nav-item active" aria-current="page" data-view="list">${ICON_LIST}<span>短链列表</span></button>
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
                        <div class="search-wrap">${ICON_SEARCH}<input type="search" id="link-search" placeholder="搜索短链或原始链接…" autocomplete="off" aria-label="搜索短链或原始链接"></div>
                        <button type="button" class="btn-ghost tb-btn" id="refresh-btn">${ICON_REFRESH}<span>刷新</span></button>
                        <button type="button" class="btn-ghost tb-btn trash-toggle" id="trash-toggle" aria-pressed="false">${ICON_TRASH}<span>回收站</span><span class="badge" id="trash-count" hidden>0</span></button>
                        <button type="button" class="btn-ghost tb-btn" id="export-csv">${ICON_DOWNLOAD}<span>CSV</span></button>
                        <button type="button" class="btn-ghost tb-btn" id="export-json">${ICON_DOWNLOAD}<span>JSON</span></button>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr>
                                <th>短链接</th><th class="col-orig">原始链接</th><th class="th-sort" data-key="visits" title="点击排序">访问次数<span class="arrow" data-arrow="visits"></span></th><th class="th-sort col-created" data-key="createdAt" title="点击排序">创建时间<span class="arrow" data-arrow="createdAt"></span></th><th>操作</th>
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
                        <button type="button" class="btn-primary" id="settings-save" style="height:40px; padding: 0 18px;">保存设置</button>
                    </div>
                    <p class="card-desc">设置保存在 KV 中，保存后即时生效，无需重新部署。留空或关闭的项使用默认值。</p>
                    <div class="settings-grid">
                        <fieldset class="settings-card">
                            <legend>安全</legend>
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
                        </fieldset>
                        <fieldset class="settings-card">
                            <legend>短链</legend>
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
                        </fieldset>
                        <fieldset class="settings-card">
                            <legend>统计与二维码</legend>
                            <label for="set-dedup-min">访问去重窗口（同一访客短时间内不重复计数）
                                <select id="set-dedup-min">
                                    <option value="0">关闭（每次跳转都计数）</option>
                                    <option value="5">5 分钟</option>
                                    <option value="30">30 分钟</option>
                                    <option value="60">1 小时</option>
                                    <option value="240">4 小时</option>
                                </select>
                            </label>
                            <label class="chk"><input type="checkbox" id="set-qr-logo"> 二维码中心放置 Logo（自动提升纠错等级）</label>
                            <div class="qr-logo-row">
                                <img id="set-qr-logo-preview" class="qr-logo-preview" alt="当前 Logo 预览">
                                <div class="qr-logo-ops">
                                    <label class="btn-ghost qr-upload-btn">上传自定义 Logo<input type="file" id="set-qr-logo-file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
                                    <button type="button" class="btn-ghost" id="set-qr-logo-reset">恢复默认 Logo</button>
                                </div>
                            </div>
                            <p class="settings-hint">默认 Logo 为网站图标；自定义图片建议正方形 PNG / JPG，不超过 110KB。上传与恢复均即时生效，主页与后台的二维码同步更新。</p>
                            <label for="set-qr-dark">二维码前景色
                                <input type="color" id="set-qr-dark" value="#16181d">
                            </label>
                        </fieldset>
                        <fieldset class="settings-card">
                            <legend>API Token</legend>
                            <p class="settings-hint">用于脚本 / 第三方调用管理接口：请求头携带 <b>X-API-Token</b>，可访问创建 / 列表 / 编辑 / 删除 / 设置等全部管理接口。Token 仅在创建时完整显示一次。</p>
                            <div class="token-create">
                                <input type="text" id="token-name" placeholder="Token 名称（如：自动化脚本）" maxlength="30">
                                <button type="button" class="btn-ghost" id="token-create">生成 Token</button>
                            </div>
                            <div class="token-new" id="token-new" hidden>
                                <code id="token-new-value"></code>
                                <button type="button" class="copy-btn" id="token-copy">复制</button>
                            </div>
                            <div class="token-list" id="token-list"></div>
                        </fieldset>
                    </div>
                </div>
            </section>
        </main>
        ${appFooterHtml()}
    </div>
</div>
<dialog id="confirm-dialog">
    <h2>${ICON_TRASH}<span>删除短链</span></h2>
    <p class="dialog-text" id="confirm-text"></p>
    <div class="row-btns">
        <button type="button" class="btn-danger" id="confirm-del">删除</button>
        <button type="button" class="btn-ghost" id="cancel-del">取消</button>
    </div>
</dialog>
<dialog id="edit-dialog">
    <h2 style="color: var(--primary)">${ICON_PENCIL}<span>编辑短链</span></h2>
    <p class="dialog-text" id="edit-slug-label"></p>
    <div class="edit-form">
        <label for="edit-original">目标链接
            <input type="url" id="edit-original" placeholder="https://…">
        </label>
        <label for="edit-note">备注
            <input type="text" id="edit-note" maxlength="100" placeholder="仅管理后台可见">
        </label>
        <div class="opt-pair">
            <label for="edit-exp">有效期（留空 = 永久）
                <input type="datetime-local" id="edit-exp">
            </label>
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
    <h2 style="color: var(--primary)">${ICON_CHART}<span>访问详情</span></h2>
    <p class="dialog-text" id="detail-slug"></p>
    <div id="detail-body"></div>
    <div class="row-btns" style="margin-top: 16px">
        <button type="button" class="btn-ghost" id="detail-close" style="grid-column: 1 / -1">关闭</button>
    </div>
</dialog>
<dialog id="qr-dialog">
    <h2 style="color: var(--primary)">${ICON_QR}<span>短链二维码</span></h2>
    <p class="dialog-text" id="qr-slug-label"></p>
    <div class="qr-view"><canvas id="qr-dialog-canvas" aria-label="短链二维码"></canvas></div>
    <div class="row-btns">
        <button type="button" class="btn-primary" id="qr-dlg-download">${ICON_DOWNLOAD}<span>下载 PNG</span></button>
        <button type="button" class="btn-ghost" id="qr-dlg-close">关闭</button>
    </div>
</dialog>
` + aboutDialogHtml(),
  script: QR_LIB_SRC + '\n' + themeJs + toastJs + loginToastJs('登录成功。') + logoutJs + fmtUtilJs + aboutJs + `
        // 管理后台逻辑（GET /api/links + POST /api/delete 等；二维码绘制与主页同源）
        (function () {
            const QR_CFG = __QR_SETTINGS__;
            const QR_LOGO_SRC = '${QR_LOGO_DATA_URL}';
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
            const confirmDel = document.getElementById('confirm-del');
            const cancelDel = document.getElementById('cancel-del');
            const adminSlug = window.location.pathname.split('/').pop();
            const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Slug': adminSlug };
            const ICON_COPY_SVG = '${ICON_COPY}';
            const ICON_CHECK_SVG = '${ICON_CHECK}';
            const ICON_PENCIL_SVG = '${ICON_PENCIL}';
            const ICON_CHART_SVG = '${ICON_CHART}';
            const ICON_TRASH_SVG = '${ICON_TRASH}';
            const ICON_QR_SVG = '${ICON_QR}';
            const trashToggle = document.getElementById('trash-toggle');
            const trashCount = document.getElementById('trash-count');
            const exportCsvBtn = document.getElementById('export-csv');
            const exportJsonBtn = document.getElementById('export-json');
            const editDialog = document.getElementById('edit-dialog');
            const detailDialog = document.getElementById('detail-dialog');
            const qrDialog = document.getElementById('qr-dialog');

            // 列表状态：全量数据 + 搜索过滤 + 排序（默认与原版一致：按访问次数降序）
            let allLinks = [];
            let filterText = '';
            let sortKey = 'visits';
            let sortDir = 'desc';
            let pendingSlug = null;
            let pendingPurge = false;
            // 视图状态：list（有效短链）| trash（回收站）；lastActive 供统计视图聚合使用
            let viewMode = 'list';
            let lastActive = [];
            let trashTotal = null;
            let settingsLoaded = false;
            // 客户端分页：一次渲染前 PAGE_SIZE 条，「加载更多」追加，避免大列表全量渲染卡顿
            const PAGE_SIZE = 50;
            let shownCount = PAGE_SIZE;

            function visibleLinks() {
                let list = allLinks;
                if (filterText) {
                    list = list.filter(function (l) {
                        return ('/' + String(l.slug || '')).toLowerCase().indexOf(filterText) > -1 ||
                               String(l.original || '').toLowerCase().indexOf(filterText) > -1;
                    });
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
                adminNote.textContent = '共 ' + allLinks.length + ' 条记录' + (filterText ? '，筛选出 ' + filtered.length + ' 条' : '') + '，按' + sortLabel + '排列' + (filtered.length > shown ? '，当前显示前 ' + shown + ' 条' : '') + '。';
            }

            function renderSkeleton() {
                tbody.textContent = '';
                for (let i = 0; i < 5; i++) {
                    const tr = document.createElement('tr');
                    for (let c = 0; c < 5; c++) {
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
                    td.colSpan = 5; td.className = 'empty';
                    td.textContent = viewMode === 'trash' ? '回收站是空的。' : '暂无短链接，回到前台「创建短链」生成一个吧。';
                    tr.appendChild(td); tbody.appendChild(tr);
                    linkCount.textContent = '0';
                    return;
                }
                if (!filtered.length) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 5; td.className = 'empty';
                    td.textContent = '没有匹配「' + filterText + '」的短链接。';
                    tr.appendChild(td); tbody.appendChild(tr);
                    linkCount.textContent = '0';
                    return;
                }
                links.forEach(function (link) {
                    const shortUrl = window.location.origin + '/' + link.slug;
                    const row = document.createElement('tr');
                    row.dataset.slug = link.slug;

                    const shortCell = document.createElement('td');
                    shortCell.className = 'slug-cell';
                    const shortAnchor = document.createElement('a');
                    shortAnchor.className = 'slug-link';
                    shortAnchor.href = shortUrl; shortAnchor.target = '_blank'; shortAnchor.rel = 'noopener noreferrer';
                    shortAnchor.title = shortUrl;
                    shortAnchor.textContent = shortUrl.replace(/^https?:\\/\\//, '');
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

                    const originalCell = document.createElement('td');
                    originalCell.className = 'td-orig col-orig';
                    const originalAnchor = document.createElement('a');
                    originalAnchor.href = link.original; originalAnchor.target = '_blank'; originalAnchor.rel = 'noopener noreferrer';
                    originalAnchor.title = link.original;
                    originalAnchor.textContent = link.original.length > 60 ? link.original.substring(0, 60) + '…' : link.original;
                    originalCell.appendChild(originalAnchor);

                    const visitsCell = document.createElement('td');
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

                    row.append(shortCell, originalCell, visitsCell, createdCell, actionCell);
                    tbody.appendChild(row);
                });
                linkCount.textContent = String(filtered.length);
            }

            function renderStats(links) {
                let visits = 0, latest = 0;
                links.forEach(function (l) { visits += (l.visits || 0); if (l.createdAt && l.createdAt > latest) latest = l.createdAt; });
                document.getElementById('stat-visits').textContent = numberFormat(visits);
                document.getElementById('stat-links').textContent = numberFormat(links.length);
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
                try {
                    const res = await fetch(viewMode === 'trash' ? '/api/links?trash=1' : '/api/links', { headers: authHeaders });
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
                    allLinks = await res.json();
                    shownCount = PAGE_SIZE;
                    if (viewMode === 'list') {
                        lastActive = allLinks;
                    } else {
                        trashTotal = allLinks.length;
                        updateTrashBadge();
                    }
                    renderList();
                    renderStats(lastActive);
                    updateNote();
                    updateSortArrows();
                } catch (err) { if (err.message !== 'auth') { adminNote.textContent = err.message; console.error(err); } }
            }

            // 删除确认：自定义弹窗替代原生 confirm()，风格与整体一致
            function requestDelete(slug, purge) {
                pendingSlug = slug;
                pendingPurge = purge === true;
                if (pendingPurge) {
                    confirmText.textContent = '彻底删除 ';
                    const b = document.createElement('b');
                    b.textContent = '/' + slug;
                    confirmText.append(b, document.createTextNode(' 吗？该操作不可恢复。'));
                } else {
                    confirmText.textContent = '确定要删除短链接 ';
                    const b = document.createElement('b');
                    b.textContent = '/' + slug;
                    confirmText.append(b, document.createTextNode(' 吗？删除后将进入回收站，可随时恢复。'));
                }
                if (typeof dialog.showModal !== 'function') {
                    if (window.confirm('您确定要删除短链接 "' + slug + '" 吗？')) doDelete(slug, pendingPurge);
                    return;
                }
                dialog.showModal();
            }

            async function doDelete(slug, purge) {
                try {
                    const res = await fetch('/api/delete', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: slug, purge: purge === true }) });
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
                    renderList();
                    renderStats(lastActive);
                    updateNote();
                    showToast(wasPurge ? '已彻底删除 ' + slug : '已移入回收站：/' + slug);
                } catch (err) { showToast(err.message); }
            }

            // 从回收站恢复短链
            async function doRestore(slug) {
                try {
                    const res = await fetch('/api/restore', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: slug }) });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || '恢复失败。');
                    }
                    allLinks = allLinks.filter(function (l) { return l.slug !== slug; });
                    trashTotal = Math.max(0, trashTotal - 1);
                    updateTrashBadge();
                    renderList();
                    updateNote();
                    showToast('已恢复 /' + slug);
                } catch (err) { showToast(err.message); }
            }

            function updateTrashBadge() {
                if (!trashCount) return;
                if (trashTotal == null) { trashCount.hidden = true; return; }
                trashCount.hidden = trashTotal === 0;
                trashCount.textContent = String(trashTotal);
            }

            tbody.addEventListener('click', function (e) {
                const copyBtnEl = e.target.closest('.row-copy');
                if (copyBtnEl) {
                    const url = copyBtnEl.dataset.url;
                    navigator.clipboard.writeText(url).then(function () {
                        copyBtnEl.classList.add('copied');
                        copyBtnEl.innerHTML = ICON_CHECK_SVG;
                        setTimeout(function () { copyBtnEl.classList.remove('copied'); copyBtnEl.innerHTML = ICON_COPY_SVG; }, 1500);
                    }).catch(function () { showToast('复制失败，请手动复制'); });
                    return;
                }
                const actBtn = e.target.closest('.row-edit');
                if (actBtn) {
                    const link = allLinks.find(function (l) { return l.slug === actBtn.dataset.slug; });
                    if (link) {
                        if (actBtn.dataset.act === 'edit') openEdit(link);
                        else if (actBtn.dataset.act === 'qr') openQr(link);
                        else openDetail(link);
                    }
                    return;
                }
                const restoreBtn = e.target.closest('.row-restore');
                if (restoreBtn) { doRestore(restoreBtn.dataset.slug); return; }
                const btn = e.target.closest('.delete-btn');
                if (btn) requestDelete(btn.dataset.slug, btn.dataset.purge === '1');
            });

            confirmDel.addEventListener('click', function () { const s = pendingSlug; const p = pendingPurge; pendingSlug = null; pendingPurge = false; dialog.close(); if (s) doDelete(s, p); });
            cancelDel.addEventListener('click', function () { pendingSlug = null; dialog.close(); });
            dialog.addEventListener('click', function (e) { if (e.target === dialog) { pendingSlug = null; dialog.close(); } });
            dialog.addEventListener('close', function () { pendingSlug = null; });

            // 搜索：按短链 / 原始链接实时过滤（纯客户端）
            searchInput.addEventListener('input', function () {
                filterText = this.value.trim().toLowerCase();
                shownCount = PAGE_SIZE;
                renderList();
                updateNote();
            });

            // 排序：点击「访问次数 / 创建时间」表头切换升/降序
            document.querySelectorAll('th.th-sort').forEach(function (th) {
                th.addEventListener('click', function () {
                    const key = th.dataset.key;
                    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
                    else { sortKey = key; sortDir = 'desc'; }
                    shownCount = PAGE_SIZE;
                    updateSortArrows();
                    renderList();
                    updateNote();
                });
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

            // ---------- 回收站切换 ----------
            trashToggle.addEventListener('click', async function () {
                viewMode = viewMode === 'list' ? 'trash' : 'list';
                const label = trashToggle.querySelector('span');
                if (label) label.textContent = viewMode === 'trash' ? '返回列表' : '回收站';
                trashToggle.classList.toggle('on', viewMode === 'trash');
                trashToggle.setAttribute('aria-pressed', viewMode === 'trash' ? 'true' : 'false');
                searchInput.value = '';
                filterText = '';
                await getLinks();
            });

            // 启动时后台获取回收站数量（徽标提示）
            (async function () {
                try {
                    const res = await fetch('/api/links?trash=1', { headers: authHeaders });
                    if (res.ok) {
                        trashTotal = (await res.json()).length;
                        updateTrashBadge();
                    }
                } catch (e) {}
            })();

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
            exportCsvBtn.addEventListener('click', function () {
                if (!allLinks.length) { showToast('暂无数据可导出'); return; }
                const header = ['slug', 'original', 'visits', 'createdAt', 'note', 'expiresAt', 'maxVisits', 'hasPassword'];
                const lines = [header.join(',')];
                allLinks.forEach(function (l) {
                    lines.push([l.slug, l.original, l.visits, new Date(l.createdAt).toISOString(), l.note, l.expiresAt || '', l.maxVisits || '', l.hasPassword ? 'yes' : 'no'].map(csvCell).join(','));
                });
                const d = new Date();
                downloadFile('shorturl-export-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.csv', '\\ufeff' + lines.join('\\n'), 'text/csv;charset=utf-8');
                showToast('已导出 ' + allLinks.length + ' 条记录（CSV）');
            });
            exportJsonBtn.addEventListener('click', function () {
                if (!allLinks.length) { showToast('暂无数据可导出'); return; }
                downloadFile('shorturl-export.json', JSON.stringify(allLinks, null, 2), 'application/json');
                showToast('已导出 ' + allLinks.length + ' 条记录（JSON）');
            });

            // ---------- 二维码查看（样式来自运行时设置，与主页一致） ----------
            function drawQrCanvas(canvas, text) {
                try {
                    if (typeof qrcode !== 'function') return false;
                    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
                    const withLogo = !!(QR_CFG && QR_CFG.centerLogo);
                    const qr = qrcode(0, withLogo ? 'H' : 'M');
                    qr.addData(text);
                    qr.make();
                    const count = qr.getModuleCount();
                    const quiet = 4, scale = 8;
                    const size = (count + quiet * 2) * scale;
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);
                    ctx.fillStyle = (QR_CFG && QR_CFG.dark) || '#16181d';
                    for (let r = 0; r < count; r++) {
                        for (let c = 0; c < count; c++) {
                            if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
                        }
                    }
                    if (withLogo) {
                        const logoSize = Math.round(size * 0.22);
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect((size - logoSize) / 2 - 8, (size - logoSize) / 2 - 8, logoSize + 16, logoSize + 16);
                        const img = new Image();
                        img.onload = function () { ctx.drawImage(img, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize); };
                        // 自定义 Logo 优先，未上传时使用网站品牌 Logo
                        img.src = (QR_CFG && QR_CFG.logoDataUrl) || QR_LOGO_SRC;
                    }
                    return true;
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
                } catch (err) { showToast('二维码下载失败，请截图保存'); }
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
                if (payload.original && !/^https?:\\/\\//.test(payload.original)) {
                    showToast('目标链接需以 http/https 开头'); return;
                }
                const btn = this;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/update', { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
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
                } catch (err) { showToast(err.message); }
                finally { btn.disabled = false; }
            });

            // ---------- 访问详情弹窗（横版：概览一行 + 趋势通栏 + 设备/来源双列） ----------
            function openDetail(link) {
                document.getElementById('detail-slug').textContent = '访问详情 /' + link.slug + (link.note ? ' · ' + link.note : '');
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

            // 加载更多：追加下一页数据（纯客户端分页）
            if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () {
                shownCount += PAGE_SIZE;
                renderList();
                updateNote();
            });

            // 侧边栏切换「短链列表 / 访问统计 / 系统设置」，支持 ?view= 深链直达
            function setView(v) {
                viewList.hidden = v !== 'list';
                viewStats.hidden = v !== 'stats';
                document.getElementById('view-settings').hidden = v !== 'settings';
                document.querySelectorAll('.nav-item[data-view]').forEach(function (x) {
                    const active = x.dataset.view === v;
                    x.classList.toggle('active', active);
                    if (active) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
                });
                if (v === 'settings' && !settingsLoaded) {
                    settingsLoaded = true;
                    loadSettings();
                    loadTokens();
                }
            }
            document.querySelectorAll('.nav-item[data-view]').forEach(function (b) {
                b.addEventListener('click', function () { setView(b.dataset.view); });
            });
            let initialView = 'list';
            try {
                const requested = new URLSearchParams(window.location.search).get('view');
                if (requested === 'stats' || requested === 'settings') initialView = requested;
            } catch (err) {}
            setView(initialView);

            // ---------- 系统设置 ----------
            let qrLogoCustom = '';
            function updateQrLogoPreview() {
                const img = document.getElementById('set-qr-logo-preview');
                if (img) img.src = qrLogoCustom || QR_LOGO_SRC;
            }
            async function loadSettings() {
                try {
                    const res = await fetch('/api/settings', { headers: authHeaders });
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
                    document.getElementById('set-qr-logo').checked = !!(s.qr && s.qr.centerLogo);
                    document.getElementById('set-qr-dark').value = (s.qr && s.qr.dark) || '#16181d';
                    qrLogoCustom = (s.qr && s.qr.logoDataUrl) || '';
                    updateQrLogoPreview();
                    document.getElementById('set-pwd-hint').textContent = s.hasCustomPassword
                        ? '当前使用自定义口令（保存在 KV，修改后所有旧会话立即失效）'
                        : '当前使用环境变量口令（未配置则无需登录）';
                } catch (e) { showToast('设置加载失败'); }
            }

            // 上传自定义 Logo（立即保存生效；自动勾选「中心放置 Logo」）
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
                try {
                    const res = await fetch('/api/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ qr: { centerLogo: true, logoDataUrl: dataUrl } }) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Logo 上传失败');
                    qrLogoCustom = dataUrl;
                    // 同步内存配置：本页二维码弹窗立即使用新 Logo，无需刷新
                    QR_CFG.logoDataUrl = dataUrl;
                    QR_CFG.centerLogo = true;
                    document.getElementById('set-qr-logo').checked = true;
                    updateQrLogoPreview();
                    showToast('自定义 Logo 已启用，二维码即时生效');
                } catch (err) { showToast(err.message); }
            });

            // 恢复默认 Logo（网站图标），同样立即生效
            document.getElementById('set-qr-logo-reset').addEventListener('click', async function () {
                const btn = this;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ qr: { logoDataUrl: '' } }) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '操作失败');
                    qrLogoCustom = '';
                    QR_CFG.logoDataUrl = '';
                    updateQrLogoPreview();
                    showToast('已恢复默认 Logo（网站图标）');
                } catch (err) { showToast(err.message); }
                finally { btn.disabled = false; }
            });

            document.getElementById('settings-save').addEventListener('click', async function () {
                const btn = this;
                btn.disabled = true;
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
                    qr: {
                        centerLogo: document.getElementById('set-qr-logo').checked,
                        dark: document.getElementById('set-qr-dark').value
                    }
                };
                const newPwd = document.getElementById('set-password').value;
                if (newPwd) payload.password = newPwd;
                if (document.getElementById('set-clearpwd').checked) payload.clearPassword = true;
                try {
                    const res = await fetch('/api/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '保存失败');
                    document.getElementById('set-password').value = '';
                    document.getElementById('set-clearpwd').checked = false;
                    loadSettings();
                    if (data.sessionInvalidated) {
                        showToastClosable('口令已更新，所有旧会话已失效，即将重新登录…', 2600);
                        setTimeout(function () { window.location.href = '/'; }, 1600);
                    } else {
                        showToast('设置已保存，即时生效');
                    }
                } catch (err) { showToast(err.message || '保存失败'); }
                finally { btn.disabled = false; }
            });

            // ---------- API Token ----------
            async function loadTokens() {
                const list = document.getElementById('token-list');
                try {
                    const res = await fetch('/api/token', { headers: authHeaders });
                    if (!res.ok) throw new Error('x');
                    const tokens = await res.json();
                    list.textContent = '';
                    if (!tokens.length) {
                        const empty = document.createElement('div');
                        empty.className = 'settings-hint';
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
                                const res2 = await fetch('/api/token', { method: 'DELETE', headers: authHeaders, body: JSON.stringify({ id: t.id }) });
                                if (!res2.ok) throw new Error();
                                showToast('已吊销 ' + t.name);
                                loadTokens();
                            } catch (e) { showToast('吊销失败'); revoke.disabled = false; }
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

            document.getElementById('token-create').addEventListener('click', async function () {
                const btn = this;
                btn.disabled = true;
                try {
                    const res = await fetch('/api/token', { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: document.getElementById('token-name').value }) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || '创建失败');
                    document.getElementById('token-new').hidden = false;
                    document.getElementById('token-new-value').textContent = data.token;
                    document.getElementById('token-name').value = '';
                    loadTokens();
                } catch (err) { showToast(err.message || '创建失败'); }
                finally { btn.disabled = false; }
            });
            document.getElementById('token-copy').addEventListener('click', async function () {
                const btn = this;
                try {
                    await navigator.clipboard.writeText(document.getElementById('token-new-value').textContent);
                    btn.textContent = '已复制';
                    setTimeout(function () { btn.textContent = '复制'; }, 1500);
                } catch (e) { showToast('复制失败，请手动复制'); }
            });

            getLinks();
        })();
`
});

// ==========================================
// 4. 密码保护页（单条短链设置访问密码后的中转验证页）
// ==========================================
export function passwordHtml({ slug, error = '' } = {}) {
  return buildPage({
    title: '访问验证 · Edgeone-ShortURL',
    css: themeVarsCss + baseCss() + appShellCss(),
    body: decoHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <h1>密码保护链接</h1>
        <p class="auth-sub">该短链接设置了访问密码，验证通过后即可继续访问（24 小时内免重复输入）。</p>
        <div class="auth-divider"></div>
        <form method="POST" action="/${slug}">
            <div class="pw-wrap">
                <input type="password" name="pw" placeholder="输入访问密码…" autocomplete="current-password" required autofocus>
            </div>
            ${error ? `<div class="auth-error" style="display:block">${error}</div>` : ''}
            <button type="submit" class="btn-primary" style="width:100%; margin-top:12px">${ICON_SHIELD}<span>继续访问</span></button>
        </form>
    </div>
</div>
`,
    script: themeJs
  });
}

// ==========================================
// 5. 错误页（404 / 无效短链：面向外部访客的品牌化页面）
// ==========================================
export function errorPageHtml({ code = '404', title = '链接不存在', message = '该短链接不存在或已被删除。' } = {}) {
  return buildPage({
    title: `${title} · Edgeone-ShortURL`,
    css: themeVarsCss + baseCss() + appShellCss() + `
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
    script: themeJs
  });
}