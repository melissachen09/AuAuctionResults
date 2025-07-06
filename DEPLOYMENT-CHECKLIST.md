# 部署检查清单

## 部署前准备

- [ ] GitHub 仓库已创建并推送代码
- [ ] Vercel 账号已注册
- [ ] 本地测试通过 `npm run build`

## Vercel 部署步骤

### 1. 导入项目到 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 选择 "Import Git Repository"
4. 授权访问 GitHub（如果还没有）
5. 找到 `AuAuctionResults` 仓库并点击 "Import"

### 2. 配置项目设置

在项目导入页面：

**Framework Preset**: Next.js (应该会自动检测)

**Root Directory**: `au-auction-results` ⚠️ 重要：必须设置为 `au-auction-results`

**Build and Output Settings**:
- Build Command: `prisma generate && next build`
- Output Directory: `.next` (保持默认)
- Install Command: `npm install`

**Node.js Version**: 20.x

### 3. 配置环境变量

点击 "Environment Variables" 部分，添加以下变量：

#### 必需的环境变量：

1. **DATABASE_URL**
   - 类型: `Encrypted`
   - 值: 你的 PostgreSQL 连接字符串
   - 示例: `postgresql://user:pass@host:5432/dbname?sslmode=require`

2. **API_SECRET**
   - 类型: `Encrypted`
   - 值: 生成一个安全的随机字符串
   - 可以使用: `openssl rand -base64 32`

3. **NEXT_PUBLIC_APP_URL**
   - 类型: `Plain`
   - 值: 暂时留空，部署后会自动分配

### 4. 创建 Vercel Postgres 数据库

1. 在 Vercel 项目页面，点击 "Storage" 标签
2. 点击 "Create Database"
3. 选择 "Postgres"
4. 选择区域（建议选择 Sydney 或最近的区域）
5. 创建数据库
6. 创建完成后，`DATABASE_URL` 会自动添加到环境变量

### 5. 部署项目

1. 确认所有设置正确
2. 点击 "Deploy"
3. 等待部署完成（通常需要 2-5 分钟）

## 部署后配置

### 1. 运行数据库迁移

部署成功后，需要初始化数据库：

```bash
# 在本地运行，使用生产环境的 DATABASE_URL
DATABASE_URL="你的生产数据库URL" npx prisma migrate deploy
```

或者使用 Vercel CLI：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 运行迁移
vercel env pull .env.production.local
npx prisma migrate deploy
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加 Secrets：

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下 secrets：
   - `DATABASE_URL`: 从 Vercel 复制
   - `API_URL`: 你的 Vercel 应用 URL
   - `API_SECRET`: 与 Vercel 环境变量相同

### 3. 测试部署

1. **访问首页**: `https://your-app.vercel.app`
2. **检查 API**: `https://your-app.vercel.app/api/suburbs`
3. **测试主题切换**
4. **检查响应式设计**

### 4. 测试爬虫（可选）

手动触发爬虫测试：

```bash
curl -X POST https://your-app.vercel.app/api/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -d '{"source": "domain"}'
```

## 自定义域名（可选）

1. 在 Vercel 项目设置中，点击 "Domains"
2. 添加你的域名
3. 按照提示配置 DNS：
   - A 记录: `76.76.21.21`
   - CNAME: `cname.vercel-dns.com`

## 监控和维护

### 启用监控

1. **Vercel Analytics**
   - 在项目设置中启用 Analytics
   - 查看性能指标

2. **错误追踪**（推荐）
   - 注册 [Sentry](https://sentry.io)
   - 添加 `SENTRY_DSN` 到环境变量
   - 安装 Sentry: `npm install @sentry/nextjs`

### 定期维护

- [ ] 每周检查爬虫日志
- [ ] 每月检查数据库大小
- [ ] 定期更新依赖
- [ ] 监控 API 使用情况

## 故障排除

### 常见问题

1. **构建失败**
   - 检查 Node.js 版本
   - 确认 `au-auction-results` 为根目录
   - 查看构建日志

2. **数据库连接失败**
   - 验证 `DATABASE_URL` 格式
   - 检查 SSL 设置
   - 确认 IP 白名单

3. **页面 404**
   - 检查路由配置
   - 验证构建输出

4. **API 错误**
   - 检查环境变量
   - 查看函数日志

## 需要帮助？

- Vercel 文档: https://vercel.com/docs
- Next.js 部署指南: https://nextjs.org/docs/deployment
- 项目 Issues: https://github.com/melissachen09/AuAuctionResults/issues