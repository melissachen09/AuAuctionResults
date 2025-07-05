#!/bin/bash

echo "🚀 AU Auction Results - Vercel 自动部署"
echo "======================================="
echo ""

# 生成 API Secret
API_SECRET=$(openssl rand -base64 32)
echo "🔐 API_SECRET 已生成"
echo ""

# 创建临时的 Prisma schema，使用本地 SQLite 进行构建
echo "📦 准备构建配置..."
cp prisma/schema.prisma prisma/schema.prisma.backup

# 修改 schema 为 SQLite（仅用于构建）
cat > prisma/schema.prisma <<EOF
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Auction {
  id            String   @id @default(cuid())
  address       String
  suburb        String
  state         String
  postcode      String
  price         Int?
  result        String
  auctionDate   DateTime
  source        String
  propertyType  String
  bedrooms      Int?
  bathrooms     Int?
  carSpaces     Int?
  agentName     String?
  agencyName    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([address, auctionDate])
  @@index([suburb])
  @@index([auctionDate])
}

model SuburbStats {
  id              String   @id @default(cuid())
  suburb          String
  state           String
  date            DateTime
  totalAuctions   Int
  soldCount       Int
  passedInCount   Int
  withdrawnCount  Int
  clearanceRate   Float
  averagePrice    Float?
  medianPrice     Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([suburb, state, date])
  @@index([date])
}

model ScrapeLog {
  id          String   @id @default(cuid())
  source      String
  status      String
  startTime   DateTime
  endTime     DateTime?
  recordCount Int?
  errorLog    String?
  createdAt   DateTime @default(now())

  @@index([source, startTime])
}
EOF

# 生成 Prisma Client
echo "🏗️  生成 Prisma Client..."
npx prisma generate

# 部署到 Vercel
echo ""
echo "🚀 开始部署到 Vercel..."
echo ""

# 使用 vercel deploy 命令
vercel deploy --prod \
  --env API_SECRET="$API_SECRET" \
  --env NODE_ENV="production" \
  --yes

# 获取部署 URL
DEPLOYMENT_URL=$(vercel ls --limit 1 | grep -o 'https://[^ ]*' | head -1)

# 恢复原始 schema
mv prisma/schema.prisma.backup prisma/schema.prisma

# 保存部署信息
cat > deployment-info.json <<EOF
{
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deploymentUrl": "$DEPLOYMENT_URL",
  "apiSecret": "$API_SECRET",
  "important": "请立即在 Vercel Dashboard 中创建 Postgres 数据库！",
  "nextSteps": [
    "1. 访问 Vercel Dashboard",
    "2. 选择你的项目",
    "3. 点击 Storage → Create Database → Postgres",
    "4. 选择 Sydney 区域",
    "5. 数据库创建后运行: vercel env pull && npx prisma migrate deploy"
  ]
}
EOF

echo ""
echo "✅ 部署成功！"
echo ""
echo "🌐 应用 URL: $DEPLOYMENT_URL"
echo ""
echo "⚠️  重要：应用现在使用临时数据库配置"
echo ""
echo "📋 请立即执行以下步骤："
echo ""
echo "1. 打开 Vercel Dashboard: https://vercel.com/dashboard"
echo "2. 选择你的项目"
echo "3. 点击 'Storage' 标签"
echo "4. 点击 'Create Database' → 选择 'Postgres'"
echo "5. 选择 'Sydney' 区域"
echo "6. 创建完成后，DATABASE_URL 会自动添加到环境变量"
echo ""
echo "7. 然后运行以下命令完成设置："
echo "   vercel env pull .env.production.local"
echo "   npx prisma migrate deploy"
echo "   vercel redeploy --prod"
echo ""
echo "💾 API_SECRET 已保存到 deployment-info.json"
echo "   请妥善保管！"