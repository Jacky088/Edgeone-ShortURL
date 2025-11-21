# EdgeOne-ShortURL 短链接生成服务

基于腾讯云 EdgeOne Pages 构建的无服务器短链接服务，简单开源。


## 🚀 核心功能

- **短链生成**: 自动生成随机短链接标识符，支持自定义
- **访问统计**: 实时统计每个短链接的访问量
- **管理界面**: 极其简洁的 Web 界面管理

## 🔧 一键部署

### 1. 安装部署：

[![使用国内版EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fhobk%2Feo-short%2F)（国内版）

[使用国际版部署](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fhobk%2Feo-short%2F)

### 2. 绑定 KV 数据库
- 第一步项目部署成功后，进入 EdgeOne 控制台
- 在项目设置中，导航到 **KV 存储** 部分
- 创建一个新的 KV 数据库命名空间
- 使用指定变量名 `my_kv` 将此 KV 数据库命名空间绑定到你的项目
- 重新部署即可生效，建议绑定自定义域名

### 3. 配置环境变量（可选）
在Edgeone控制台中 **项目设置 --> 环境变量** 中设置：
- 变量名为`ADMIN_PATH`: 管理后台路径，例如设置变量值为`abc123`，则管理页面地址为`https://你的自定义域名/abc123`
- 变量名为`PASSWORD`: 设置访问口令，防止他人恶意访问

## 🎯 使用方法

1. **访问管理界面**: 打开您的 EdgeOne Pages 临时域名或自定义域名
2. **创建短链接**: 在输入框中粘贴长 URL，点击创建
3. **使用短链接**: 访问生成的短链接会自动重定向到原始 URL
4. **查看统计**: 在管理后台查看所有短链接及其访问次数


## ✨ 项目特色

- **零静态文件**: 整个前端是一个纯 Serverless Functions 项目
- **动态路由**: 单个 EdgeOne Function 作为通用路由器
- **无服务器架构**: 基于 EdgeOne 的全球基础设施，确保低延迟和高可用性
- **简单部署**: 只需拥有 Edgeone 账户即可部署

### API 接口
- `POST /api/create` - 创建新的短链接
- `GET /api/links` - 获取所有短链接列表
- `DELETE /api/delete` - 删除指定的短链接


## 许可证

MIT License
