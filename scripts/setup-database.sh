#!/bin/bash

echo "🗄️  Vercel Postgres 数据库设置向导"
echo "==================================="
echo ""
echo "📋 步骤 1: 创建数据库"
echo "---------------------"
echo ""
echo "请在浏览器中执行以下操作："
echo ""
echo "1. 打开 Vercel Dashboard:"
echo "   https://vercel.com/yqm0nk3ys-projects/au-auction-results-1751718481"
echo ""
echo "2. 点击顶部的 'Storage' 标签"
echo ""
echo "3. 点击 'Create Database' 按钮"
echo ""
echo "4. 选择 'Postgres'"
echo ""
echo "5. 配置数据库："
echo "   - Database Name: auction-results-db"
echo "   - Region: Sydney (syd1) 或最近的区域"
echo ""
echo "6. 点击 'Create'"
echo ""
echo "⏳ 数据库创建需要 1-2 分钟..."
echo ""
read -p "数据库创建完成后，按 Enter 继续..."

echo ""
echo "📋 步骤 2: 获取环境变量"
echo "---------------------"
echo ""
echo "正在从 Vercel 拉取环境变量..."

# 拉取环境变量
vercel env pull .env.production.local

if [ -f ".env.production.local" ]; then
    echo "✅ 环境变量已成功获取"
    
    # 检查 DATABASE_URL 是否存在
    if grep -q "DATABASE_URL" .env.production.local; then
        echo "✅ DATABASE_URL 已配置"
    else
        echo "❌ DATABASE_URL 未找到"
        echo "请确保数据库已创建并连接到项目"
        exit 1
    fi
else
    echo "❌ 无法获取环境变量"
    exit 1
fi

echo ""
echo "📋 步骤 3: 准备数据库迁移"
echo "------------------------"
echo ""

# 恢复原始的 PostgreSQL schema
echo "恢复 PostgreSQL schema..."
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Auction {
  id            String   @id @default(cuid())
  address       String
  suburb        String
  state         String
  postcode      String
  price         Int?
  result        String   // 'sold' | 'passed_in' | 'withdrawn'
  auctionDate   DateTime
  source        String   // 'domain' | 'rea'
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
  source      String   // 'domain' | 'rea'
  status      String   // 'success' | 'failed' | 'partial'
  startTime   DateTime
  endTime     DateTime?
  recordCount Int?
  errorLog    String?
  createdAt   DateTime @default(now())

  @@index([source, startTime])
}
EOF

echo "✅ Schema 已恢复"

echo ""
echo "📋 步骤 4: 创建数据库表"
echo "---------------------"
echo ""

# 生成迁移文件
echo "生成数据库迁移..."
mkdir -p prisma/migrations/20250105_initial
cat > prisma/migrations/20250105_initial/migration.sql <<'EOF'
-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "price" INTEGER,
    "result" TEXT NOT NULL,
    "auctionDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "carSpaces" INTEGER,
    "agentName" TEXT,
    "agencyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuburbStats" (
    "id" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAuctions" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL,
    "passedInCount" INTEGER NOT NULL,
    "withdrawnCount" INTEGER NOT NULL,
    "clearanceRate" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION,
    "medianPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuburbStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "recordCount" INTEGER,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_address_auctionDate_key" ON "Auction"("address", "auctionDate");

-- CreateIndex
CREATE INDEX "Auction_suburb_idx" ON "Auction"("suburb");

-- CreateIndex
CREATE INDEX "Auction_auctionDate_idx" ON "Auction"("auctionDate");

-- CreateIndex
CREATE UNIQUE INDEX "SuburbStats_suburb_state_date_key" ON "SuburbStats"("suburb", "state", "date");

-- CreateIndex
CREATE INDEX "SuburbStats_date_idx" ON "SuburbStats"("date");

-- CreateIndex
CREATE INDEX "ScrapeLog_source_startTime_idx" ON "ScrapeLog"("source", "startTime");
EOF

# 设置生产环境变量
export $(cat .env.production.local | xargs)

# 运行迁移
echo "执行数据库迁移..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功！"
else
    echo "❌ 数据库迁移失败"
    echo "请检查错误信息并重试"
    exit 1
fi

echo ""
echo "📋 步骤 5: 生成 Prisma Client"
echo "----------------------------"
npx prisma generate

echo ""
echo "📋 步骤 6: 重新部署应用"
echo "---------------------"
echo ""
echo "重新部署以应用数据库配置..."
vercel --prod --yes

echo ""
echo "✅ 数据库设置完成！"
echo ""
echo "📊 你可以使用 Prisma Studio 查看数据库："
echo "   npx prisma studio"
echo ""
echo "🧪 测试应用功能："
echo "   ./scripts/test-deployment.sh"
echo ""
echo "🎉 恭喜！你的应用现在已完全配置并运行！"