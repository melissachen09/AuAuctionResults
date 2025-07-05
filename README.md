# AU Auction Results - 澳洲房产拍卖清空率数据平台

一个现代化的网站应用，用于展示和分析来自 Domain.com.au 和 realestate.com.au 的澳洲房产拍卖清空率数据。

## 🚀 功能特性

- **自动数据抓取**: 每周末自动从 Domain 和 REA 网站抓取最新拍卖数据
- **智能去重**: 自动识别和合并来自不同数据源的重复房产信息
- **区域分析**: 按 suburb（城区）分类展示清空率统计
- **数据可视化**: 使用图表展示历史趋势和数据分布
- **响应式设计**: 支持桌面和移动设备访问
- **深色模式**: 支持明暗主题切换

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **编程语言**: TypeScript
- **样式框架**: Tailwind CSS
- **UI 组件**: Shadcn/ui
- **数据可视化**: Recharts
- **状态管理**: Zustand
- **数据库**: PostgreSQL (通过 Vercel Postgres)
- **ORM**: Prisma
- **网页抓取**: Playwright
- **部署平台**: Vercel

## 📦 安装指南

### 前置要求

- Node.js 18+
- npm 或 yarn
- PostgreSQL 数据库

### 本地开发

1. 克隆仓库

```bash
git clone https://github.com/melissachen09/AuAuctionResults.git
cd au-auction-results
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置以下变量：

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
NODE_ENV="development"
```

4. 初始化数据库

```bash
npx prisma generate
npx prisma migrate dev
```

5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 🏗️ 项目结构

```
au-auction-results/
├── src/
│   ├── app/                    # Next.js 应用路由
│   │   ├── api/               # API 路由
│   │   ├── dashboard/         # 仪表板页面
│   │   └── about/             # 关于页面
│   ├── components/            # React 组件
│   │   ├── charts/           # 图表组件
│   │   ├── dashboard/        # 仪表板组件
│   │   ├── home/             # 首页组件
│   │   ├── layout/           # 布局组件
│   │   └── shared/           # 共享组件
│   ├── lib/                   # 工具函数和服务
│   │   └── scrapers/         # 网页抓取器
│   ├── hooks/                 # React hooks
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript 类型定义
├── prisma/                    # Prisma 架构和迁移
├── public/                    # 静态资源
└── .github/workflows/         # GitHub Actions 工作流
```

## 📡 API 端点

### 获取城区数据

```
GET /api/suburbs
```

参数:

- `state`: 州代码 (NSW, VIC, QLD 等)
- `date`: 日期 (YYYY-MM-DD)
- `sortBy`: 排序字段
- `sortOrder`: 排序方向 (asc/desc)
- `page`: 页码
- `limit`: 每页数量

### 获取城区详情

```
GET /api/suburbs/[suburb]
```

### 获取趋势数据

```
GET /api/trends
```

参数:

- `suburb`: 城区名称
- `state`: 州代码
- `period`: 时间段 (4weeks, 12weeks, 6months, 1year)

### 触发数据抓取

```
POST /api/scrape
```

请求体:

```json
{
  "source": "domain" | "rea" | "all",
  "date": "2024-01-01" // 可选
}
```

## 🚢 部署

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 创建新项目
3. 连接 GitHub 仓库
4. 配置环境变量:
   - `DATABASE_URL`: PostgreSQL 连接字符串
5. 部署

### 数据库设置

推荐使用 Vercel Postgres：

1. 在 Vercel 项目中启用 Postgres
2. 复制连接字符串到环境变量
3. 运行数据库迁移

### 定时任务设置

GitHub Actions 会在每周六日晚上 8 点（悉尼时间）自动运行爬虫。
也可以在 Actions 页面手动触发。

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行 E2E 测试
npm run test:e2e

# 运行类型检查
npm run type-check

# 运行 linter
npm run lint
```

## 🤝 贡献指南

欢迎提交 Pull Request！请确保：

1. 代码通过所有测试
2. 遵循现有的代码风格
3. 更新相关文档
4. 提交清晰的 commit 信息

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 数据来源：[Domain.com.au](https://www.domain.com.au) 和 [realestate.com.au](https://www.realestate.com.au)
- 使用 [Next.js](https://nextjs.org) 构建
- 部署在 [Vercel](https://vercel.com) 平台
