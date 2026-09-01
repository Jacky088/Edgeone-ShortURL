# 📦 Edgeone-ShortURL

基于 **腾讯云 EdgeOne Pages** 构建的无服务器短链接服务（URL Shortener）。支持快速创建短链接、访问统计与简易管理后台；全新蓝色科技风 UI，原生适配**桌面端 / 移动端**与**日间 / 夜间模式**。

---

## ✨ 特性

- 🔗 **短链生成**：自动生成随机短链接，也支持自定义短链标识（slug）。
- 📊 **访问统计**：汇总访问次数、短链数量、最近创建时间，可视化「近 7 天新增短链」柱状图与「访问量 TOP」排行。
- 🧠 **管理后台**：短链列表 + 一键删除，按访问量排序；统计图表一屏掌握。
- 🎨 **现代 UI**：深科技蓝 + 青绿主题，日间 / 夜间模式（默认跟随系统、可手动切换），桌面 / 移动端响应式布局。
- 🔐 **安全设计**：口令登录 + 服务端会话、登录失败限流、保留字与协议校验。
- 🚀 **无服务器架构**：基于 EdgeOne Pages Functions + KV，低延迟、零运维。
- ⚙️ **简单部署**：一键部署，无需额外服务器。

---

## 📸 预览

![Edgeone-ShortURL 预览（日间 / 夜间模式）](preview.png)

---

## 🧩 安装与部署

### 1. Fork 并部署到 EdgeOne Pages

1. Fork 本仓库到你的 GitHub 帐号。
2. 在 EdgeOne Pages 控制台中绑定该仓库，或点击下方按钮一键部署。
3. 完成自动构建与部署。

[![使用国内版 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https%3A%2F%2Fgithub.com%2FJacky088%2FEdgeone-ShortURL)（国内版）

[![使用国际版 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2FJacky088%2FEdgeone-ShortURL)（国际版）

### 2. 绑定 KV 存储

1. 打开 Pages 项目 → **设置 → KV 存储**，新建一个命名空间（namespace）。
2. 将绑定变量名设置为：`my_kv`（代码同时兼容 `MY_KV`，或自动扫描其它 KV 绑定）。
3. 重新部署项目。

> ⚠️ 不绑定 KV 时服务将不可用 —— 短链数据、登录会话与限流状态都存储在 KV 中。

### 3. 配置环境变量（可选）

| 变量名 | 必填 | 作用说明 |
|--------|------|----------|
| `ADMIN_PATH` | 视需要 | 管理后台路径（如 `admin123`）。未设置则无法进入管理后台 |
| `PASSWORD` | 视需要 | 访问口令。设置后访问主页与后台均需口令；未设置则无需登录 |

---

## 🗺️ 使用方法

1. 打开部署后的网站地址，即可进入首页「创建短链」。
2. 输入长链接，点击 **生成短链**；可展开「自定义短链（可选）」指定短链标识。
3. 生成后自动出现结果框，一键 **复制** 短链；点击短链即跳转原文并累计访问次数。
4. 若配置了 `ADMIN_PATH`，通过顶栏「管理后台」进入：
   - **短链列表**：查看全部短链、原始链接、访问次数与创建时间，支持删除。
   - **访问统计**：总访问量 / 短链总数 / 最近创建，以及近 7 天新增与访问量 TOP 排行。

---

## 📡 API 接口说明

| 接口 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/create` | POST | 会话 | 创建短链，请求体 `{ "url": "...", "slug": "可选" }` |
| `/api/links` | GET | `X-Admin-Slug` | 获取短链列表（需携带管理后台路径） |
| `/api/delete` | POST | `X-Admin-Slug` | 删除短链，请求体 `{ "slug": "..." }` |
| `/api/auth` | POST | - | 口令登录，请求体 `{ "password": "..." }` |
| `/api/logout` | POST | 会话 | 注销当前会话 |

示例：

```bash
# 创建短链
curl -X POST https://your.domain/api/create \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-url", "slug": "my-link"}'

# 获取短链列表
curl https://your.domain/api/links -H "X-Admin-Slug: admin123"
```

### KV 数据结构

| Key | 说明 |
|-----|------|
| `<slug>` | 短链数据 `{ "original", "visits", "createdAt" }` |
| `hash:<sha256(url)>` | URL 去重映射（相同长链接自动复用同一个短链） |
| `sess:<token>` | 服务端登录会话（含过期时间） |
| `rl:<ip>` | 登录失败按 IP 的限流计数 |

---

## 🔒 安全说明

- 口令使用**常量时间比较**；登录失败按 IP 限流（5 次失败锁定 10 分钟）。
- 会话采用随机 token，`HttpOnly` + `Secure` 会话级 Cookie（**关闭浏览器标签后自动失效**），服务端存储并按活跃度滑动续期兜底。
- `api`、`favicon.ico`、`hash:` / `sess:` / `rl:` 前缀及管理员路径均为保留字，不可注册为短链。
- 短链跳转仅允许 `http/https` 协议，防御 `javascript:` 等协议注入。
- 自定义短链仅允许字母、数字、短横线、下划线，防御路径遍历。

---

## 🧪 本地开发与测试

```bash
npm test    # 运行单元测试（Node 18+，无第三方依赖）
```

核心代码位于 `functions/` 目录：

```
functions/
├── index.js            # 路由入口
├── [slug]/index.js     # 页面路由 / 短链跳转 / 鉴权
├── pages.js            # 三个页面模板（统一设计系统，仅此一处维护 UI）
├── utils.js            # 公共工具函数
└── api/                # create / links / delete / auth / logout
```

---

## 🛡️ 致谢

项目灵感来自 [**hobk 的 eo-short**](https://github.com/hobk/eo-short)，感谢其开源贡献。

---

## 📃 License

本项目使用 **MIT License**。

---

如果这个项目对你有帮助，欢迎在 GitHub 上点一个 ⭐ 支持作者！
