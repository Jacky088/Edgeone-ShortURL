# 🚀 部署指南

## 📋 前置要求

- EdgeOne Pages 账号
- EdgeOne D1 数据库 (或兼容的 KV 存储)
- 域名 (可选，用于自定义域名)

---

## 🔧 部署步骤

### 1. 准备环境变量

在 EdgeOne Pages 控制台设置以下环境变量：

```bash
# 管理员密码 (至少 16 字符，建议使用密码生成器)
ADMIN_PASSWORD=your_secure_password_here

# 管理路径 (随机字符串，用于访问管理页面)
ADMIN_PATH=your_secret_admin_path_12345

# 会话密钥 (至少 32 字符，用于 HMAC 签名)
SESSION_SECRET=your_session_secret_key_must_be_at_least_32_chars

# CSRF 密钥 (至少 32 字符)
CSRF_SECRET=your_csrf_secret_key_must_be_at_least_32_chars
```

**生成强密钥示例** (PowerShell):
```powershell
# 生成 32 字节随机密钥
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

---

### 2. 初始化数据库

在 EdgeOne D1 控制台执行以下 SQL：

```sql
-- 创建短链接表
CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX idx_created_at ON links(created_at);

-- (可选) 插入测试数据
INSERT INTO links (slug, url, created_at) VALUES 
  ('test', 'https://example.com', strftime('%s', 'now'));
```

---

### 3. 部署到 EdgeOne Pages

#### 方式 A: 通过控制台上传

1. 打包项目文件夹
2. 登录 EdgeOne Pages 控制台
3. 创建新项目 → 上传 ZIP
4. 绑定 D1 数据库 (变量名: `DB`)
5. 设置环境变量 (见步骤 1)
6. 点击 "部署"

#### 方式 B: 通过 Git 集成

1. 推送代码到 Git 仓库 (GitHub/GitLab/Gitee)
2. EdgeOne Pages 控制台 → 新建项目 → 连接 Git
3. 选择仓库和分支
4. 构建配置:
   - 构建命令: (留空)
   - 输出目录: `/`
   - 环境变量: 同步骤 1
5. 绑定 D1 数据库
6. 点击 "部署"

---

### 4. 验证部署

部署完成后，访问以下 URL 验证：

#### ✅ 基础检查
```bash
# 1. 访问首页
curl https://your-domain.pages.dev/

# 2. 测试 API 端点 (应返回 405 Method Not Allowed)
curl https://your-domain.pages.dev/api-auth

# 3. 访问管理页面
curl https://your-domain.pages.dev/{ADMIN_PATH}
```

#### ✅ 认证测试
```bash
# 登录 API (替换 PASSWORD)
curl -X POST https://your-domain.pages.dev/api-auth \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}'
  
# 预期响应:
# {"success":true,"csrf_token":"..."}
```

#### ✅ 创建短链接测试
```bash
# 需要先登录获取 Cookie 和 CSRF Token
curl -X POST https://your-domain.pages.dev/api-create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{"url":"https://example.com","slug":"test123"}'
  
# 预期响应:
# {"success":true,"slug":"test123"}
```

---

## 🔒 安全配置

### 1. 环境变量安全

- ❌ 不要在代码中硬编码密钥
- ✅ 使用 EdgeOne 控制台的加密环境变量
- ✅ 定期轮换密钥 (建议每 3 个月)
- ✅ 不同环境使用不同的密钥

### 2. WAF 配置 (推荐)

在 EdgeOne 控制台启用 Web 应用防火墙：

1. 规则集 → 启用 "OWASP 核心规则集"
2. 速率限制 → 设置 `/api-*` 路由限制:
   - `/api-auth`: 5 次/15 分钟
   - `/api-create`: 10 次/分钟
   - `/api-delete`: 20 次/分钟
3. 地理位置封锁 → 根据需要限制访问区域
4. Bot 管理 → 启用 "验证码挑战"

### 3. SSL/TLS 配置

- ✅ 强制 HTTPS 重定向
- ✅ 启用 HSTS (max-age=31536000)
- ✅ 使用 TLS 1.3
- ✅ 禁用 TLS 1.0/1.1

---

## 🛠️ 维护指南

### 定期任务

- **每周**: 检查审计日志，查看异常登录
- **每月**: 审查速率限制触发次数
- **每季度**: 轮换密钥和密码
- **每半年**: 完整安全审计

### 日志查看

EdgeOne Pages 控制台 → 实时日志 → 过滤关键词:

```
# 查看登录失败
"Login failed"

# 查看速率限制触发
"Rate limit exceeded"

# 查看 CSRF 验证失败
"CSRF token 无效"
```

### 备份策略

```bash
# 导出 D1 数据库
wrangler d1 export <DATABASE_NAME> --output=backup.sql

# 定期备份 (建议每天)
# 保留最近 30 天的备份
```

---

## 🐛 故障排查

### 问题 1: 登录失败 (400/401)

**可能原因**:
- 密码错误
- 环境变量未设置
- 会话密钥错误

**解决方案**:
```bash
# 检查环境变量
wrangler pages deployment list <PROJECT_NAME>
wrangler pages deployment tail <DEPLOYMENT_ID>

# 查看日志中的错误信息
```

---

### 问题 2: CSRF Token 验证失败

**可能原因**:
- 前端未正确获取 Token
- Cookie 被阻止 (浏览器隐私设置)
- CSRF_SECRET 未设置

**解决方案**:
```javascript
// 检查浏览器控制台
console.log(sessionStorage.getItem('csrf_token'));

// 检查 Cookie
document.cookie;
```

---

### 问题 3: 速率限制误触发

**可能原因**:
- 多用户共享 IP (NAT)
- 爬虫访问

**解决方案**:
```javascript
// 方案 A: 调整速率限制参数
// functions/lib/security.js
const RATE_LIMITS = {
  login: { limit: 10, window: 15 * 60 * 1000 }, // 提高到 10 次
  // ...
};

// 方案 B: 启用 IP 白名单
function isWhitelistedIP(ip) {
  const whitelist = ['123.45.67.89'];
  return whitelist.includes(ip);
}
```

---

### 问题 4: API 返回 404

**可能原因**:
- Functions 文件未正确部署
- 路由配置错误

**解决方案**:
```bash
# 检查 functions 目录结构
ls -R functions/
# 应该看到:
# functions/api-auth.js
# functions/api-create.js
# functions/api-delete.js
# functions/api-links.js
# functions/[slug]/index.js

# 检查前端 API 调用路径
grep -r "/api-" functions/
```

---

## 📊 性能优化

### 1. 缓存策略

```javascript
// 在 functions/[slug]/index.js 中添加
return new Response(html, {
  headers: {
    'Content-Type': 'text/html',
    'Cache-Control': 'public, max-age=60', // 缓存 60 秒
  }
});
```

### 2. 数据库优化

```sql
-- 定期清理过期会话 (手动或定时任务)
DELETE FROM __kv__ WHERE key LIKE 'session:%' AND expires < strftime('%s', 'now');

-- 优化查询
ANALYZE links;
```

### 3. 监控指标

在 EdgeOne 控制台监控:
- 请求量 (QPS)
- 错误率 (4xx/5xx)
- 响应时间 (P50/P95/P99)
- 数据库查询耗时

---

## 🔄 更新流程

### 代码更新

1. 在本地测试新功能
2. 提交到 Git 仓库
3. EdgeOne Pages 自动触发部署
4. 验证生产环境

### 数据库迁移

```sql
-- 示例: 添加新字段
ALTER TABLE links ADD COLUMN click_count INTEGER DEFAULT 0;

-- 创建新索引
CREATE INDEX idx_click_count ON links(click_count);
```

---

## 📞 支持

- **EdgeOne 文档**: https://cloud.tencent.com/document/product/1552
- **Cloudflare Workers 文档**: https://developers.cloudflare.com/workers/
- **安全问题**: 请查看 `SECURITY_AUDIT_REPORT.md`

---

**最后更新**: 2026-07-10  
**版本**: 1.0.0
