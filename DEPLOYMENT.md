# 部署指南

本文档详细说明如何部署 AU Auction Results 应用到生产环境。

## 部署到 Vercel

### 1. 准备工作

1. 确保你有以下账号：
   - GitHub 账号
   - Vercel 账号
   - PostgreSQL 数据库（推荐使用 Vercel Postgres）

2. Fork 本项目到你的 GitHub 账号

### 2. 创建 Vercel 项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 选择你 fork 的仓库
4. 选择 "Next.js" 作为框架预设
5. 保持默认的构建设置

### 3. 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

```
DATABASE_URL=你的PostgreSQL连接字符串
API_SECRET=用于保护API端点的密钥（自行生成）
```

### 4. 设置数据库

#### 使用 Vercel Postgres（推荐）

1. 在 Vercel 项目中，点击 "Storage" 标签
2. 点击 "Create Database"
3. 选择 "Postgres"
4. 按照提示创建数据库
5. 数据库创建后，`DATABASE_URL` 会自动添加到环境变量

#### 使用外部 PostgreSQL

1. 准备一个 PostgreSQL 数据库实例
2. 获取连接字符串，格式如下：
   ```
   postgresql://用户名:密码@主机:端口/数据库名?schema=public
   ```
3. 将连接字符串添加到 Vercel 环境变量

### 5. 初始化数据库

部署完成后，需要运行数据库迁移：

```bash
# 在本地运行，使用生产数据库URL
DATABASE_URL=你的生产数据库URL npx prisma migrate deploy
```

### 6. 配置域名（可选）

1. 在 Vercel 项目设置中，点击 "Domains"
2. 添加你的自定义域名
3. 按照提示配置 DNS

## GitHub Actions 配置

### 1. 设置 Secrets

在 GitHub 仓库设置中，添加以下 Secrets：

- `DATABASE_URL`: PostgreSQL 连接字符串
- `API_URL`: 你的应用 URL（如 https://your-app.vercel.app）
- `API_SECRET`: API 密钥（与 Vercel 环境变量保持一致）

### 2. 启用 Actions

1. 进入仓库的 "Actions" 标签
2. 启用 workflows
3. 检查 CI 和 Scraper workflows 是否正常

### 3. 测试定时任务

可以手动触发 scraper workflow 来测试：

1. 进入 Actions 标签
2. 选择 "Weekend Scraper"
3. 点击 "Run workflow"
4. 选择分支并运行

## 监控和维护

### 日志查看

1. **应用日志**: 在 Vercel Dashboard 的 "Functions" 标签查看
2. **构建日志**: 在 Vercel Dashboard 的 "Deployments" 查看
3. **爬虫日志**: 在 GitHub Actions 的运行历史中查看

### 数据库维护

定期检查数据库：

```sql
-- 查看数据量
SELECT COUNT(*) FROM "Auction";
SELECT COUNT(*) FROM "SuburbStats";

-- 查看最近的爬虫记录
SELECT * FROM "ScrapeLog" ORDER BY "startTime" DESC LIMIT 10;

-- 清理旧数据（保留最近6个月）
DELETE FROM "Auction" WHERE "auctionDate" < NOW() - INTERVAL '6 months';
```

### 性能优化

1. **启用 ISR（增量静态再生）**
   - 对于城区详情页面，可以配置 ISR 减少数据库压力

2. **配置缓存**
   - 使用 Vercel Edge Config 或 Redis 缓存热门数据

3. **监控性能**
   - 使用 Vercel Analytics 监控页面性能
   - 设置告警规则

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 `DATABASE_URL` 格式是否正确
   - 确认数据库允许从 Vercel IP 访问
   - 检查 SSL 设置

2. **爬虫失败**
   - 检查目标网站是否更改了结构
   - 查看 GitHub Actions 日志
   - 验证 Playwright 是否正确安装

3. **构建失败**
   - 检查依赖是否正确安装
   - 确认 Prisma 客户端已生成
   - 查看构建日志中的错误信息

### 回滚策略

如果部署出现问题：

1. 在 Vercel Dashboard 找到之前的成功部署
2. 点击 "..." 菜单
3. 选择 "Promote to Production"
4. 确认回滚

## 安全建议

1. **API 保护**
   - 为敏感端点添加认证
   - 实现速率限制
   - 使用 CORS 策略

2. **数据安全**
   - 定期备份数据库
   - 使用环境变量存储敏感信息
   - 启用 HTTPS

3. **监控告警**
   - 设置错误告警
   - 监控异常流量
   - 定期审查日志