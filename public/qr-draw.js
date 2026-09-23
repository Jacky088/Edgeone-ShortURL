// 二维码绘制（主页结果卡 + 后台弹窗共用，与 pages.js 内联版同源）。
// 依赖：qrcode-generator（public/qr-lib.js，先加载），运行时样式 window.__QR_CFG__。
// 中心 Logo 时自动提升纠错等级为 H；白底保证任何主题下都可扫描。
(function () {
  'use strict';

  function qrCfg() { return window.__QR_CFG__ || {}; }

  function drawOnto(canvas, text, scale, padLogoPx) {
    if (typeof qrcode !== 'function') return false;
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }
    var cfg = qrCfg();
    var withLogo = !!cfg.centerLogo;
    var qr = qrcode(0, withLogo ? 'H' : 'M');
    qr.addData(text);
    qr.make();
    var count = qr.getModuleCount();
    var quiet = 4;
    var size = (count + quiet * 2) * scale;
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = cfg.dark || '#16181d';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
    if (withLogo) {
      var logoSize = Math.round(size * 0.22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((size - logoSize) / 2 - padLogoPx, (size - logoSize) / 2 - padLogoPx, logoSize + padLogoPx * 2, logoSize + padLogoPx * 2);
      var img = new Image();
      img.onload = function () { ctx.drawImage(img, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize); };
      // 自定义 Logo 优先，未上传时使用网站品牌 Logo
      img.src = cfg.logoDataUrl || window.__QR_LOGO_SRC__;
    }
    return true;
  }

  // 主页结果卡：小尺寸（scale 4），返回是否绘制成功（失败时调用方隐藏二维码区）
  function drawResult(canvas, text) {
    try {
      return drawOnto(canvas, text, 4, 4);
    } catch (err) {
      return false;
    }
  }

  // 后台弹窗：大尺寸（scale 8）
  function drawDialog(canvas, text) {
    try {
      return drawOnto(canvas, text, 8, 8);
    } catch (err) {
      return false;
    }
  }

  window.drawQrResult = drawResult;
  window.drawQrDialog = drawDialog;
})();
