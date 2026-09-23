// 用法：node scripts/gen-assets.mjs
// 把 public/app.css|ui.js|qr-lib.js|qr-draw.js 打包成 functions/static-assets.js（字符串导出），
// 供 functions/[slug] 在函数拦截静态请求时兜底返回。改 public/ 下文件后重跑本脚本。
// 注意：生成文件请勿手工编辑。
import fs from 'node:fs';

const pairs = [
  ['APP_CSS', 'public/app.css'],
  ['UI_JS', 'public/ui.js'],
  ['QR_LIB_JS', 'public/qr-lib.js'],
  ['QR_DRAW_JS', 'public/qr-draw.js'],
];

const out = [
  '// 自动生成：node scripts/gen-assets.mjs；请勿手工编辑。',
  '// 内容来自 public/app.css|ui.js|qr-lib.js|qr-draw.js，与各文件保持一致。',
];
for (const [name, file] of pairs) {
  const content = fs.readFileSync(file, 'utf8');
  out.push(`export const ${name} = ${JSON.stringify(content)};`);
  console.log(`${name}: ${Buffer.byteLength(content)} bytes from ${file}`);
}
fs.writeFileSync('functions/static-assets.js', out.join('\n') + '\n');
console.log('wrote functions/static-assets.js');
