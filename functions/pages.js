// functions/pages.js
// 三个页面（登录页 / 主页 / 管理后台）的 HTML 模板。
import { QR_LIB_SRC } from './qr-src.js';
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
      html { -webkit-text-size-adjust: 100%; }
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
      .app { position: relative; z-index: 1; width: min(1160px, 100%); margin: 0 auto; padding: calc(20px + env(safe-area-inset-top, 0px)) 20px calc(28px + env(safe-area-inset-bottom, 0px)); }
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

      .content { min-width: 0; display: flex; flex-direction: column; gap: 20px; }
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
      .btn-ghost { height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-weight: 600; font-size: .9rem; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background-color .16s, border-color .16s; -webkit-tap-highlight-color: transparent; }
      .btn-ghost:hover { background: var(--surface-2); border-color: var(--border-strong); }

      /* ---------- 表单 ---------- */
      .url-row { display: flex; gap: 10px; }
      #url-input { flex: 1; min-width: 0; height: 48px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .95rem; font-family: inherit; transition: border-color .18s, box-shadow .18s, background-color .18s; -webkit-appearance: none; }
      #url-input::placeholder { color: var(--faint); }
      #url-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      /* 锁定浏览器自动填充底色，避免输入框被渲染成黄/粉色 */
      input:-webkit-autofill, #url-input:-webkit-autofill, #slug-input:-webkit-autofill, .auth-form input:-webkit-autofill { box-shadow: 0 0 0 1000px var(--input-bg) inset; -webkit-text-fill-color: var(--text); caret-color: var(--text); }
      .slug-row { margin-top: 6px; }
      .slug-toggle { display: inline-flex; align-items: center; gap: 6px; background: none; border: 0; padding: 8px 2px; color: var(--primary); font-weight: 700; font-size: .88rem; font-family: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      .slug-toggle svg { width: 15px; height: 15px; }
      #slug-input { display: none; margin-top: 10px; width: 100%; height: 44px; padding: 0 14px; border-radius: 11px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .92rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      #slug-input.show { display: block; animation: fade-slide .22s ease; }
      #slug-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      @keyframes fade-slide { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      .hint-line { margin: 12px 0 0; font-size: .8rem; color: var(--muted); display: flex; gap: 6px; align-items: flex-start; line-height: 1.55; }

      /* ---------- 结果框 ---------- */
      .result-box { display: flex; align-items: stretch; gap: 10px; background: var(--primary-soft); border: 1px solid rgba(26, 93, 224, .18); border-radius: 12px; padding: 12px 14px; }
      .result-url { flex: 1; min-width: 0; display: flex; align-items: center; color: var(--nav-active-text); font-weight: 700; font-size: .95rem; font-family: var(--mono); text-decoration: none; word-break: break-all; }
      .result-url:hover { text-decoration: underline; }
      .copy-btn { flex: none; height: 40px; padding: 0 15px; border: 0; border-radius: 10px; background: var(--primary); color: #fff; font-size: .85rem; font-weight: 700; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: background-color .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
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
      .stat-note { margin-top: 14px; font-size: .8rem; color: var(--muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .stat-note .btn-ghost { height: 34px; padding: 0 12px; font-size: .8rem; border-radius: 10px; }

      /* ---------- 表格 ---------- */
      .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
      .table-wrap table { width: 100%; border-collapse: collapse; font-size: .88rem; min-width: 620px; }
      table th, table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); color: var(--text); }
      table th { background: var(--surface-2); color: var(--muted); font-weight: 700; font-size: .8rem; white-space: nowrap; }
      table tbody tr:last-child td { border-bottom: 0; }
      table tbody tr:hover td { background: var(--surface-2); }
      table td a { color: var(--primary); text-decoration: none; font-weight: 600; }
      table td a:hover { text-decoration: underline; }
      .slug-link { font-family: var(--mono); }
      /* 短链列：单行布局，长链省略号截断（悬停见完整 URL），复制按钮不换行 */
      .slug-cell { white-space: nowrap; }
      .slug-cell .slug-link { display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
      .td-nowrap { white-space: nowrap; }
      .td-orig a { display: block; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .delete-btn { height: 32px; padding: 0 12px; border: 0; border-radius: 9px; background: var(--error); color: #fff; font-size: .78rem; font-weight: 700; font-family: inherit; cursor: pointer; white-space: nowrap; transition: filter .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
      .delete-btn:hover { filter: brightness(1.08); }
      .delete-btn:active { transform: scale(.96); }
      .badge { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; background: var(--primary-soft); color: var(--nav-active-text); font-size: .76rem; font-weight: 700; font-variant-numeric: tabular-nums; }
      .empty { text-align: center; color: var(--muted); padding: 26px 0; }

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
      .auth-wrap { position: relative; z-index: 1; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 84px 20px 32px; }
      .auth-top { position: fixed; top: calc(16px + env(safe-area-inset-top, 0px)); right: calc(16px + env(safe-area-inset-right, 0px)); z-index: 2; display: flex; gap: 8px; align-items: center; }
      .auth-card { width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 34px 30px 28px; box-shadow: var(--shadow); text-align: center; }
      .auth-logo { width: 58px; height: 58px; border-radius: 15px; margin: 0 auto 16px; box-shadow: 0 12px 26px -10px rgba(26, 93, 224, .6); }
      .auth-card h1 { margin: 0; font-size: 1.45rem; letter-spacing: .01em; }
      .auth-sub { margin: 8px 0 0; color: var(--muted); font-size: .88rem; }
      .auth-divider { width: 44px; height: 3px; margin: 18px auto; border-radius: 3px; background: linear-gradient(90deg, var(--primary), var(--teal)); }
      .auth-label { margin: 0 0 14px; font-size: .85rem; color: var(--muted); text-align: left; font-weight: 600; }
      .auth-form { display: flex; flex-direction: column; gap: 12px; }
      .auth-form input { height: 48px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .95rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
      .auth-form input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 4px var(--ring); }
      .auth-error { display: none; margin-top: 12px; padding: 10px 14px; border-radius: 11px; font-size: .85rem; color: var(--error); background: var(--error-bg); border: 1px solid var(--error-border); }
      .features { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .feature { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); font-size: .8rem; font-weight: 600; color: var(--text); text-align: left; }
      .feature .fi { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: inline-flex; align-items: center; justify-content: center; flex: none; }
      .feature .fi svg { width: 14px; height: 14px; }
      .fi-blue { background: var(--primary); } .fi-teal { background: var(--teal); } .fi-violet { background: #7c5cf6; } .fi-sky { background: #38bdf8; }

      /* ---------- 页脚 / Toast ---------- */
      .app-footer { margin-top: 6px; text-align: center; font-size: .78rem; color: var(--faint); }
      .app-footer a { color: var(--muted); text-decoration: none; }
      .toast { position: fixed; left: 50%; bottom: calc(30px + env(safe-area-inset-bottom, 0px)); transform: translate(-50%, 12px) scale(.98); opacity: 0; pointer-events: none; z-index: 50; background: var(--text); color: var(--surface); padding: 11px 18px; border-radius: 999px; font-size: .85rem; font-weight: 600; box-shadow: 0 12px 30px -10px rgba(0, 0, 0, .35); transition: opacity .2s, transform .2s; max-width: calc(100vw - 40px); text-align: center; }
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
      .search-wrap input { width: 100%; height: 42px; padding: 0 14px 0 37px; border-radius: 11px; border: 1px solid var(--border-strong); background: var(--input-bg); color: var(--text); font-size: .9rem; font-family: inherit; transition: border-color .18s, box-shadow .18s; -webkit-appearance: none; }
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
      dialog { width: min(380px, calc(100% - 32px)); border: 1px solid var(--border); border-radius: 16px; padding: 24px; background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
      dialog h2 { margin: 0 0 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
      dialog h2 svg { width: 18px; height: 18px; color: var(--error); }
      dialog::backdrop { background: var(--scrim); }
      .dialog-text { margin: 0 0 18px; font-size: .9rem; color: var(--muted); line-height: 1.6; word-break: break-all; }
      .dialog-text b { color: var(--text); font-family: var(--mono); }
      .row-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .btn-danger { height: 44px; border: 0; border-radius: 12px; background: var(--error); color: #fff; font-weight: 700; font-size: .9rem; font-family: inherit; cursor: pointer; transition: filter .16s, transform .12s; -webkit-tap-highlight-color: transparent; }
      .btn-danger:hover { filter: brightness(1.08); }
      .btn-danger:active { transform: scale(.98); }

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

      /* 自定义短链实时反馈 */
      #slug-input.invalid { border-color: var(--error); box-shadow: 0 0 0 4px var(--error-bg); }
      .slug-count { margin-left: 8px; font-size: .76rem; color: var(--faint); font-variant-numeric: tabular-nums; }

      /* 主题切换过渡：仅在切换瞬间由 JS 挂上 theme-anim 类，避免首屏闪烁与日常动画冲突 */
      html.theme-anim * { transition: background-color .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease; }

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
        /* 移动端隐藏「原始链接」「创建时间」列 */
        table th:nth-child(2), table td:nth-child(2) { display: none; }
        table th:nth-child(4), table td:nth-child(4) { display: none; }
        .stat-value { font-size: 1.45rem; }
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
    <script>(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';localStorage.setItem('theme',t);}document.documentElement.setAttribute('data-theme',t);var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.content=t==='dark'?'#0a1026':'#eef4fe';}catch(e){document.documentElement.setAttribute('data-theme','light');}})();</script>
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

// 返回带「管理后台」按钮的动作区（登录页，固定右上角）
// 登录页尚未鉴权：点击「管理后台」仅提示登录，不做跳转（主题切换只由模式按钮负责）
function adminActionsHtml() {
  return `<div class="auth-top">
      <button type="button" class="text-btn goto-admin" data-note="请登录后操作！">${ICON_SHIELD}<span>管理后台</span></button>
      ${githubHtml()}
      ${themeToggleHtml()}
    </div>`;
}

// 生成已登录状态的动作区（主页 / 管理后台）
// 「管理后台」「返回前台」为镜像导航动作，统一固定在动作区第一位
// 「管理后台」用 <a> 承载（由 adminLinkJs 补真实 href），支持中键 / 新标签页打开
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
          try { localStorage.setItem('theme', mode); } catch (e) {}
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
      function adminUrl() { return '/' + String(adminPathStatus).replace(/^\\/+/, ''); }
      function gotoAdmin() { if (!adminPathStatus) { showToast('您未设置开启管理后台'); return; } window.location.href = adminUrl(); }
      document.querySelectorAll('a.goto-admin').forEach(function (a) { a.href = adminPathStatus ? adminUrl() : '#'; });
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
          showToastClosable('${text}', 3000);
        } catch (e) {}
      })();
`;

// 通用格式化工具
const fmtUtilJs = `
      function pad2(n) { return String(n).padStart(2, '0'); }
      function numberFormat(n) { try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return String(n || 0); } }
      function fmtDateShort(ts) { const d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
      function dayKey(d) { return '' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
`;

// ==========================================
// 1. 登录页面
// ==========================================
export const loginHtml = buildPage({
  title: '访问验证',
  extraHead: `    <meta name="description" content="短链接在线生成，支持长链接缩短，免费开源，提供API接口。" />\n`,
  css: themeVarsCss + baseCss() + appShellCss(),
  body: decoHtml() + adminActionsHtml() + `
<div class="auth-wrap">
    <div class="auth-card">
        ${logoHtml('auth-logo')}
        <h1>Edgeone-ShortURL</h1>
        <p class="auth-sub">基于 EO 的一个短链接转换服务</p>
        <div class="auth-divider"></div>
        <p class="auth-label">请输入访问口令</p>
        <form class="auth-form" id="login-form">
            <div class="pw-wrap">
                <input type="password" id="password" placeholder="输入口令…" autocomplete="current-password" required>
                <button type="button" class="eye-btn" id="pw-toggle" aria-label="显示口令" aria-pressed="false" title="显示/隐藏口令">${ICON_EYE}</button>
            </div>
            <button type="submit" class="btn-primary" id="btn">${ICON_SHIELD}<span>验证</span></button>
        </form>
        <div class="auth-error" id="error-msg">口令错误</div>
        <div class="features">
            <div class="feature"><span class="fi fi-blue">${ICON_CHAIN}</span>生成短链</div>
            <div class="feature"><span class="fi fi-teal">${ICON_BOLT}</span>快速跳转</div>
            <div class="feature"><span class="fi fi-violet">${ICON_CHART}</span>数据统计</div>
            <div class="feature"><span class="fi fi-sky">${ICON_SHIELD}</span>安全稳定</div>
        </div>
    </div>
</div>
`,
  script: themeJs + toastJs + adminLinkJs + `
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
        ${authedActionsHtml({ admin: true })}
    </header>
    <div class="app-body">
        <nav class="sidebar" aria-label="主导航">
            <button type="button" class="nav-item active" aria-current="page" id="nav-create">${ICON_CHAIN}<span>创建短链</span></button>
            <a class="nav-item goto-admin" href="#">${ICON_LIST}<span>短链列表</span></a>
            <a class="nav-item goto-admin" href="#">${ICON_CHART}<span>访问统计</span></a>
        </nav>
        <main class="content">
            <section class="card">
                <h2 class="card-title">${ICON_CHAIN}<span>输入长链接</span></h2>
                <form id="link-form" novalidate>
                    <div class="url-row">
                        <input type="url" id="url-input" placeholder="https://www.example.com/very-long-url" autocomplete="url" enterkeyhint="go" required>
                        <button type="submit" class="btn-primary" id="submit-btn">${ICON_CHAIN}<span>生成短链</span></button>
                    </div>
                    <div class="slug-row">
                        <button type="button" class="slug-toggle" id="slug-toggle" aria-expanded="false">${ICON_PENCIL}<span>自定义短链（可选）</span></button>
                        <span class="slug-count" id="slug-count"></span>
                        <input type="text" id="slug-input" maxlength="64" placeholder="例如: my-link" autocomplete="off" spellcheck="false" aria-hidden="true">
                    </div>
                    <p class="hint-line">仅支持 http/https 开头的完整链接；自定义短链可使用字母、数字、短横线、下划线，最长 64 位。</p>
                    <div class="message error" id="error-message"></div>
                </form>
            </section>

            <section class="card" id="result-card" hidden>
                <h2 class="card-title">${ICON_CHECK}<span>生成结果</span></h2>
                <div class="result-flex">
                    <div class="result-box">
                        <a href="#" target="_blank" rel="noopener noreferrer" class="result-url" id="result-link"></a>
                        <button type="button" class="copy-btn" id="copy-btn">${ICON_COPY}<span>复制</span></button>
                    </div>
                    <div class="result-qr" id="result-qr" hidden>
                        <canvas id="qr-canvas" aria-label="短链二维码"></canvas>
                        <span class="qr-cap">扫码访问</span>
                    </div>
                </div>
                <p class="hint-line">短链已创建成功，点击链接可跳转原文并累计访问次数；也可扫码在手机上打开。</p>
            </section>

            <section class="card">
                <h2 class="card-title">${ICON_CHART}<span>访问统计</span></h2>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_EYE}</span>访问次数</div><b class="stat-value" id="stat-visits">–</b></div>
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CHAIN}</span>短链数量</div><b class="stat-value" id="stat-links">–</b></div>
                    <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CLOCK}</span>最近创建</div><b class="stat-value" id="stat-created">–</b></div>
                </div>
                <div class="stat-note" id="stats-note"></div>
            </section>

            <footer class="app-footer">运行在 EdgeOne Pages · <a href="https://github.com/Jacky088/Edgeone-ShortURL" target="_blank" rel="noopener noreferrer">开源项目</a></footer>
        </main>
    </div>
</div>
`,
  script: QR_LIB_SRC + '\n' + themeJs + toastJs + loginToastJs('登录成功，现在可以创建短链接了。') + adminLinkJs + logoutJs + fmtUtilJs + `
        // 创建短链逻辑（与原实现一致：POST /api/create）
        (function () {
            const form = document.getElementById('link-form');
            const urlInput = document.getElementById('url-input');
            const slugInput = document.getElementById('slug-input');
            const slugToggle = document.getElementById('slug-toggle');
            const slugCount = document.getElementById('slug-count');
            const submitBtn = document.getElementById('submit-btn');
            const errorMessage = document.getElementById('error-message');
            const resultCard = document.getElementById('result-card');
            const resultLink = document.getElementById('result-link');
            const copyBtn = document.getElementById('copy-btn');
            const qrBox = document.getElementById('result-qr');
            const submitLabel = submitBtn.querySelector('span');

            slugToggle.addEventListener('click', () => {
                const opening = !slugInput.classList.contains('show');
                slugInput.classList.toggle('show', opening);
                slugToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
                slugInput.setAttribute('aria-hidden', opening ? 'false' : 'true');
                if (opening) slugInput.focus();
            });

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

            // 将短链绘制为二维码（白底黑码保证任何主题下都可扫描）
            function drawQr(text) {
                try {
                    if (typeof qrcode !== 'function') { qrBox.hidden = true; return; }
                    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
                    const qr = qrcode(0, 'M');
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
                    ctx.fillStyle = '#16181d';
                    for (let r = 0; r < count; r++) {
                        for (let c = 0; c < count; c++) {
                            if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
                        }
                    }
                    qrBox.hidden = false;
                } catch (err) { qrBox.hidden = true; }
            }

            function showSuccess(newLink) {
                const shortUrl = window.location.origin + '/' + newLink.slug;
                resultLink.href = shortUrl;
                resultLink.textContent = shortUrl.replace(/^https?:\\/\\//, '');
                copyBtn.dataset.url = shortUrl;
                resultCard.hidden = false;
                drawQr(shortUrl);
                resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            async function createLink(e) {
                e.preventDefault();
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
                    const payload = { url: originalUrl };
                    if (customSlug) payload.slug = customSlug;
                    const res = await fetch('/api/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    if (res.status === 401) { window.location.reload(); return; }
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || '创建链接失败。');
                    }
                    const newLink = await res.json();
                    urlInput.value = '';
                    slugInput.value = '';
                    slugCount.textContent = '';
                    slugInput.classList.remove('show');
                    slugToggle.setAttribute('aria-expanded', 'false');
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
        })();

        // 访问统计：有管理后台权限时拉取 /api/links 汇总（只读，无副作用）
        (async function loadIndexStats() {
            const statVisits = document.getElementById('stat-visits');
            if (!statVisits) return;
            const statLinks = document.getElementById('stat-links');
            const statCreated = document.getElementById('stat-created');
            const note = document.getElementById('stats-note');
            if (!adminPathStatus) { note.textContent = '未设置管理后台，无法汇总统计；配置 ADMIN_PATH 后即可启用。'; return; }
            try {
                const res = await fetch('/api/links', { headers: { 'X-Admin-Slug': adminPathStatus } });
                if (res.status === 401) {
                    note.textContent = '需要管理权限才能查看统计。';
                    const go = document.createElement('button');
                    go.type = 'button'; go.className = 'btn-ghost'; go.textContent = '前往管理后台';
                    go.addEventListener('click', gotoAdmin);
                    note.appendChild(go);
                    return;
                }
                if (!res.ok) throw new Error('x');
                const links = await res.json();
                let visits = 0, latest = 0;
                links.forEach(function (l) { visits += (l.visits || 0); if (l.createdAt && l.createdAt > latest) latest = l.createdAt; });
                statVisits.textContent = numberFormat(visits);
                statLinks.textContent = numberFormat(links.length);
                statCreated.textContent = latest ? fmtDateShort(latest) : '—';
                note.textContent = '数据汇总自「管理后台」中的全部短链记录。';
            } catch (err) { note.textContent = '统计数据加载失败。'; }
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
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead><tr>
                                <th>短链接</th><th>原始链接</th><th class="th-sort" data-key="visits" title="点击排序">访问次数<span class="arrow" data-arrow="visits"></span></th><th class="th-sort" data-key="createdAt" title="点击排序">创建时间<span class="arrow" data-arrow="createdAt"></span></th><th>操作</th>
                            </tr></thead>
                            <tbody id="links-table-body"></tbody>
                        </table>
                    </div>
                    <p class="hint-line" id="admin-note"></p>
                </div>
            </section>
            <section class="view" id="view-stats" hidden>
                <div class="card">
                    <h2 class="card-title">${ICON_CHART}<span>访问统计</span></h2>
                    <div class="stats-grid">
                        <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_EYE}</span>总访问次数</div><b class="stat-value" id="stat-visits">–</b></div>
                        <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CHAIN}</span>短链数量</div><b class="stat-value" id="stat-links">–</b></div>
                        <div class="stat-card"><div class="stat-head"><span class="stat-icon">${ICON_CLOCK}</span>最近创建</div><b class="stat-value" id="stat-created">–</b></div>
                    </div>
                </div>
                <div class="chart-grid">
                    <div class="chart-card"><h3>近 7 天新增短链</h3><div class="bar-chart" id="created-chart"></div></div>
                    <div class="chart-card"><h3>访问量 TOP 短链</h3><div class="top-links" id="top-links"></div></div>
                </div>
            </section>
        </main>
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
`,
  script: themeJs + toastJs + loginToastJs('登录成功。') + logoutJs + fmtUtilJs + `
        // 管理后台逻辑（与原实现一致：GET /api/links + POST /api/delete）
        (function () {
            const viewList = document.getElementById('view-list');
            const viewStats = document.getElementById('view-stats');
            const tbody = document.getElementById('links-table-body');
            const linkCount = document.getElementById('link-count');
            const adminNote = document.getElementById('admin-note');
            const searchInput = document.getElementById('link-search');
            const refreshBtn = document.getElementById('refresh-btn');
            const dialog = document.getElementById('confirm-dialog');
            const confirmText = document.getElementById('confirm-text');
            const confirmDel = document.getElementById('confirm-del');
            const cancelDel = document.getElementById('cancel-del');
            const adminSlug = window.location.pathname.split('/').pop();
            const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Slug': adminSlug };
            const ICON_COPY_SVG = '${ICON_COPY}';
            const ICON_CHECK_SVG = '${ICON_CHECK}';

            // 列表状态：全量数据 + 搜索过滤 + 排序（默认与原版一致：按访问次数降序）
            let allLinks = [];
            let filterText = '';
            let sortKey = 'visits';
            let sortDir = 'desc';
            let pendingSlug = null;

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
                const shown = visibleLinks().length;
                const sortLabel = (sortKey === 'visits' ? '访问次数' : '创建时间') + (sortDir === 'asc' ? '升序' : '降序');
                adminNote.textContent = '共 ' + allLinks.length + ' 条记录' + (filterText ? '，筛选出 ' + shown + ' 条' : '') + '，按' + sortLabel + '排列。';
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

            function renderList() {
                tbody.textContent = '';
                const links = visibleLinks();
                if (!allLinks.length) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = 5; td.className = 'empty';
                    td.textContent = '暂无短链接，回到前台「创建短链」生成一个吧。';
                    tr.appendChild(td); tbody.appendChild(tr);
                    linkCount.textContent = '0';
                    return;
                }
                if (!links.length) {
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

                    const originalCell = document.createElement('td');
                    originalCell.className = 'td-orig';
                    const originalAnchor = document.createElement('a');
                    originalAnchor.href = link.original; originalAnchor.target = '_blank'; originalAnchor.rel = 'noopener noreferrer';
                    originalAnchor.title = link.original;
                    originalAnchor.textContent = link.original.length > 60 ? link.original.substring(0, 60) + '…' : link.original;
                    originalCell.appendChild(originalAnchor);

                    const visitsCell = document.createElement('td');
                    visitsCell.textContent = numberFormat(link.visits);

                    const createdCell = document.createElement('td');
                    createdCell.className = 'td-nowrap';
                    createdCell.textContent = link.createdAt ? fmtDateShort(link.createdAt) : '—';

                    const actionCell = document.createElement('td');
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-btn';
                    deleteButton.dataset.slug = link.slug;
                    deleteButton.textContent = '删除';
                    deleteButton.setAttribute('aria-label', '删除 ' + link.slug);
                    actionCell.appendChild(deleteButton);

                    row.append(shortCell, originalCell, visitsCell, createdCell, actionCell);
                    tbody.appendChild(row);
                });
                linkCount.textContent = String(links.length);
            }

            function renderStats(links) {
                let visits = 0, latest = 0;
                links.forEach(function (l) { visits += (l.visits || 0); if (l.createdAt && l.createdAt > latest) latest = l.createdAt; });
                document.getElementById('stat-visits').textContent = numberFormat(visits);
                document.getElementById('stat-links').textContent = numberFormat(links.length);
                document.getElementById('stat-created').textContent = latest ? fmtDateShort(latest) : '—';

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
                    const res = await fetch('/api/links', { headers: authHeaders });
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
                    renderList();
                    renderStats(allLinks);
                    updateNote();
                    updateSortArrows();
                } catch (err) { if (err.message !== 'auth') { adminNote.textContent = err.message; console.error(err); } }
            }

            // 删除确认：自定义弹窗替代原生 confirm()，风格与整体一致
            function requestDelete(slug) {
                pendingSlug = slug;
                confirmText.textContent = '确定要删除短链接 ';
                const b = document.createElement('b');
                b.textContent = '/' + slug;
                confirmText.appendChild(b);
                confirmText.appendChild(document.createTextNode(' 吗？删除后该短链立即失效。'));
                if (typeof dialog.showModal !== 'function') {
                    if (window.confirm('您确定要删除短链接 "' + slug + '" 吗？')) doDelete(slug);
                    return;
                }
                dialog.showModal();
            }

            async function doDelete(slug) {
                try {
                    const res = await fetch('/api/delete', { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: slug }) });
                    if (!res.ok) throw new Error('删除失败。');
                    // 从内存数据移除后整表重渲染，列表 / 徽标 / 统计视图保持同步
                    allLinks = allLinks.filter(function (l) { return l.slug !== slug; });
                    renderList();
                    renderStats(allLinks);
                    updateNote();
                    showToast('已删除 ' + slug);
                } catch (err) { showToast(err.message); }
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
                const btn = e.target.closest('.delete-btn');
                if (btn) requestDelete(btn.dataset.slug);
            });

            confirmDel.addEventListener('click', function () { const s = pendingSlug; pendingSlug = null; dialog.close(); if (s) doDelete(s); });
            cancelDel.addEventListener('click', function () { pendingSlug = null; dialog.close(); });
            dialog.addEventListener('click', function (e) { if (e.target === dialog) { pendingSlug = null; dialog.close(); } });
            dialog.addEventListener('close', function () { pendingSlug = null; });

            // 搜索：按短链 / 原始链接实时过滤（纯客户端）
            searchInput.addEventListener('input', function () {
                filterText = this.value.trim().toLowerCase();
                renderList();
                updateNote();
            });

            // 排序：点击「访问次数 / 创建时间」表头切换升/降序
            document.querySelectorAll('th.th-sort').forEach(function (th) {
                th.addEventListener('click', function () {
                    const key = th.dataset.key;
                    if (sortKey === key) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
                    else { sortKey = key; sortDir = 'desc'; }
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

            // 侧边栏切换「短链列表 / 访问统计」
            document.querySelectorAll('.nav-item[data-view]').forEach(function (b) {
                b.addEventListener('click', function () {
                    const v = b.dataset.view;
                    viewList.hidden = v !== 'list';
                    viewStats.hidden = v !== 'stats';
                    document.querySelectorAll('.nav-item[data-view]').forEach(function (x) {
                        const active = x === b;
                        x.classList.toggle('active', active);
                        if (active) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
                    });
                });
            });

            getLinks();
        })();
`
});