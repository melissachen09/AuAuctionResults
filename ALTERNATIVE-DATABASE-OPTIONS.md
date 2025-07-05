# 替代数据库选项

由于需要手动在Vercel Dashboard创建数据库，这里提供几个免费的PostgreSQL云服务选项：

## 选项 1: Neon (推荐) 🚀

Neon 提供免费的 PostgreSQL 数据库，非常适合这个项目。

### 步骤：

1. **注册 Neon**
   - 访问 https://neon.tech
   - 使用 GitHub 登录
   - 免费计划包含 3GB 存储

2. **创建数据库**
   - 点击 "Create Database"
   - 选择区域：Asia Pacific (Singapore) 或 (Sydney如果可用)
   - 项目名：au-auction-results

3. **获取连接字符串**

   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

4. **在 Vercel 中配置**
   ```bash
   vercel env add DATABASE_URL production
   # 粘贴 Neon 的连接字符串
   ```

## 选项 2: Supabase 🔥

Supabase 提供免费的 PostgreSQL 数据库，还包含实时功能。

### 步骤：

1. **注册 Supabase**
   - 访问 https://supabase.com
   - 创建新项目
   - 选择区域：Southeast Asia (Singapore)

2. **获取数据库凭据**
   - 在项目设置中找到 Database
   - 复制连接字符串

3. **配置环境变量**
   ```bash
   vercel env add DATABASE_URL production
   ```

## 选项 3: Railway 🚂

Railway 提供简单的数据库部署。

### 步骤：

1. **注册 Railway**
   - 访问 https://railway.app
   - 使用 GitHub 登录

2. **创建 PostgreSQL 服务**
   - New Project → PostgreSQL
   - 自动生成连接字符串

3. **配置 Vercel**
   ```bash
   vercel env add DATABASE_URL production
   ```

## 快速设置脚本

无论选择哪个服务，获取连接字符串后运行：

```bash
# 1. 添加数据库 URL 到 Vercel
vercel env add DATABASE_URL production
# 粘贴你的连接字符串

# 2. 拉取环境变量
vercel env pull .env.production.local

# 3. 运行迁移
npx prisma migrate deploy

# 4. 重新部署
vercel --prod
```

## 推荐：使用 Neon

Neon 是最简单快捷的选项：

1. 访问 https://console.neon.tech/signup
2. 创建数据库（1分钟）
3. 复制连接字符串
4. 运行上面的快速设置脚本

## 测试数据库连接

```bash
# 测试连接
npx prisma db pull

# 如果成功，运行迁移
npx prisma migrate deploy
```

选择一个服务，获取数据库URL后告诉我，我会帮你完成剩余的配置！
