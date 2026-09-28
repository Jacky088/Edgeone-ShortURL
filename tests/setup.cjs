// tests/setup.cjs
// Node 18 的测试预加载垫片：全局 crypto（WebCrypto）在 Node 19+ 默认暴露，
// Node 18 没有；生产代码（functions/utils.js）为兼容 EdgeOne Pages 边缘运行时
// 不允许 import node: 内置模块，因此 Node 18 跑测试时在此处补上全局。
// 经 package.json 的 `node --require ./tests/setup.cjs --test` 注入，
// --test 的子进程会继承 execArgv，所有测试文件都能生效。
if (typeof globalThis.crypto === 'undefined') {
  try {
    globalThis.crypto = require('node:crypto').webcrypto;
  } catch (e) {
    // 无法提供 WebCrypto 的环境维持原状，由具体测试报错暴露
  }
}
