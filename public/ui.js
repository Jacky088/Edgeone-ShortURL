// 公共前端脚本：主题切换 / Toast / 关于弹窗 / 注销 / 登录欢迎语 / 日期格式化。
// 静态文件 public/ui.js，由各页面 <head> 同步引用（保证 body 末尾内联业务脚本的解析期调用先就绪）。
// 注意：adminLink（管理后台入口）含服务端占位符 __ADMIN_PATH_STATUS__，仍保留在 pages.js 内联脚本中。
(function () {
  'use strict';

  /* ---------- DOM 就绪后执行 ---------- */
  // ui.js 在 <head> 同步加载，此时 body 尚未解析；直接碰 DOM 的初始化必须等 DOM 就绪，
  // 否则 getElementById 拿到 null 导致绑定被跳过（主题切换/注销/关于弹窗/登录欢迎语全灭）。
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- 主题切换（默认跟随系统，手动切换后记忆到 localStorage） ---------- */
  ready(function () {
    var htmlEl = document.documentElement;
    var moon = document.getElementById('icon-moon');
    var sun = document.getElementById('icon-sun');
    function syncIcons(mode) {
      if (moon) moon.style.display = mode === 'dark' ? 'none' : 'block';
      if (sun) sun.style.display = mode === 'dark' ? 'block' : 'none';
    }
    function setTheme(mode) {
      htmlEl.setAttribute('data-theme', mode);
      try { localStorage.setItem('theme', mode); localStorage.setItem('theme_manual', '1'); } catch (e) {}
      syncIcons(mode);
      var mc = document.querySelector('meta[name="theme-color"]');
      if (mc) mc.content = mode === 'dark' ? '#0a1026' : '#eef4fe';
      // 切换瞬间开启全局过渡，让卡片/输入框随主题平滑变化（400ms 后移除，避免影响交互动画）
      htmlEl.classList.add('theme-anim');
      clearTimeout(setTheme._t);
      setTheme._t = setTimeout(function () { htmlEl.classList.remove('theme-anim'); }, 400);
    }
    var toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      setTheme(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    syncIcons(htmlEl.getAttribute('data-theme') || 'light');
    // 没有手动标记时跟随系统主题变化（与 head 预载脚本语义一致）
    try {
      var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      if (mq) {
        var follow = function (e) {
          var s = null;
          try { s = localStorage.getItem('theme'); } catch (err) {}
          if (s !== 'light' && s !== 'dark') {
            var nt = e.matches ? 'dark' : 'light';
            htmlEl.setAttribute('data-theme', nt);
            var mc2 = document.querySelector('meta[name="theme-color"]');
            if (mc2) mc2.content = nt === 'dark' ? '#0a1026' : '#eef4fe';
            syncIcons(nt);
          }
        };
        if (mq.addEventListener) mq.addEventListener('change', follow);
        else if (mq.addListener) mq.addListener(follow);
      }
    } catch (e) {}
  });

  /* ---------- Toast ---------- */
  function showToast(text) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }
  // 可关闭提醒（登录成功等）：默认 3 秒自动消失，点击关闭按钮或提醒本身立即关闭
  function showToastClosable(text, duration) {
    var t = document.getElementById('toast-closable');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast-closable';
      t.className = 'toast toast-closable';
      t.setAttribute('role', 'status');
      var label = document.createElement('span');
      label.className = 'toast-text';
      var close = document.createElement('button');
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
  window.showToast = showToast;
  window.showToastClosable = showToastClosable;

  /* ---------- 登录成功欢迎提醒 ---------- */
  // 登录页在 reload 前写入 sessionStorage 标记，落地页读取后展示可关闭提醒；
  // 有待恢复的未完成创建时，改由「已恢复内容」提示代替，避免两条提示重叠。
  // 各页面通过 <body data-login-toast="..."> 传入文案（无属性则不展示）。
  ready(function () {
    try {
      if (sessionStorage.getItem('login_success') !== '1') return;
      sessionStorage.removeItem('login_success');
      if (sessionStorage.getItem('pending_create_url')) return;
      var text = document.body ? document.body.getAttribute('data-login-toast') : null;
      if (text) showToastClosable(text, 3000);
    } catch (e) {}
  });

  /* ---------- 注销 ---------- */
  ready(function () {
    var btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var label = btn.querySelector('span');
      btn.disabled = true;
      if (label) label.textContent = '注销中…';
      fetch('/api/logout', { method: 'POST' }).then(function (res) {
        if (!res.ok) throw new Error('注销失败');
        window.location.href = '/';
      }).catch(function () {
        if (label) label.textContent = '注销';
        btn.disabled = false;
        showToast('注销失败，请稍后重试');
      });
    });
  });

  /* ---------- 通用格式化工具 ---------- */
  function pad2(n) { return String(n).padStart(2, '0'); }
  function numberFormat(n) { try { return Number(n || 0).toLocaleString('en-US'); } catch (e) { return String(n || 0); } }
  function fmtDateShort(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtDateTime(ts) { var d = new Date(ts); return fmtDateShort(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fmtFullDateTime(ts) { var d = new Date(ts); return fmtDateShort(ts) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  function dayKey(d) { return '' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function fmtRelativeDay(ts) {
    var d = new Date(ts);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diffDays = Math.round((today - thatDay) / 86400000);
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
  window.pad2 = pad2;
  window.numberFormat = numberFormat;
  window.fmtDateShort = fmtDateShort;
  window.fmtDateTime = fmtDateTime;
  window.fmtFullDateTime = fmtFullDateTime;
  window.dayKey = dayKey;
  window.fmtRelativeDay = fmtRelativeDay;
  window.setStatDate = setStatDate;

  /* ---------- 「关于项目」弹窗 ---------- */
  // 所有 .open-about 入口（侧边栏栏目 / 登录页入口）共用
  ready(function () {
    var dlg = document.getElementById('about-dialog');
    if (!dlg) return;
    function openAbout() { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    document.querySelectorAll('.open-about').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); openAbout(); });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    var closeBtn = dlg.querySelector('.about-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { dlg.close(); });
  });
})();
