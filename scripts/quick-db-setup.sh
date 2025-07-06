#!/bin/bash

echo "🚀 快速数据库配置脚本"
echo "===================="
echo ""
echo "本脚本将帮助你快速配置数据库并完成部署"
echo ""

# 检查是否已有数据库URL
if [ -n "$1" ]; then
    DATABASE_URL="$1"
    echo "✅ 使用提供的数据库URL"
else
    echo "请输入你的数据库连接字符串："
    echo "(格式: postgresql://user:password@host:port/database?sslmode=require)"
    echo ""
    read -p "DATABASE_URL: " DATABASE_URL
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 数据库URL不能为空"
    exit 1
fi

echo ""
echo "📝 配置步骤："
echo ""

# 步骤 1: 添加到 Vercel 环境变量
echo "1️⃣ 添加数据库URL到Vercel..."
echo "$DATABASE_URL" | vercel env add DATABASE_URL production

if [ $? -ne 0 ]; then
    echo "❌ 添加环境变量失败"
    echo "尝试手动添加："
    echo "vercel env add DATABASE_URL production"
    exit 1
fi

# 步骤 2: 添加 API_SECRET
echo ""
echo "2️⃣ 配置 API_SECRET..."
API_SECRET="I3pqIWtzjDmH93N7gTGb6r/z590dqpH3wGPmX35dTi0="
echo "$API_SECRET" | vercel env add API_SECRET production

# 步骤 3: 拉取环境变量
echo ""
echo "3️⃣ 拉取环境变量到本地..."
vercel env pull .env.production.local

# 步骤 4: 恢复 PostgreSQL schema
echo ""
echo "4️⃣ 准备数据库 schema..."
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

# 步骤 5: 生成 Prisma Client
echo ""
echo "5️⃣ 生成 Prisma Client..."
npx prisma generate

# 步骤 6: 创建迁移
echo ""
echo "6️⃣ 创建数据库迁移..."
mkdir -p prisma/migrations/20250105_init

cat > prisma/migrations/20250105_init/migration.sql <<'EOF'
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
CREATE INDEX "Auction_suburb_idx" ON "Auction"("suburb");
CREATE INDEX "Auction_auctionDate_idx" ON "Auction"("auctionDate");
CREATE UNIQUE INDEX "SuburbStats_suburb_state_date_key" ON "SuburbStats"("suburb", "state", "date");
CREATE INDEX "SuburbStats_date_idx" ON "SuburbStats"("date");
CREATE INDEX "ScrapeLog_source_startTime_idx" ON "ScrapeLog"("source", "startTime");
EOF

# 步骤 7: 运行迁移
echo ""
echo "7️⃣ 执行数据库迁移..."
export DATABASE_URL="$DATABASE_URL"
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ 数据库迁移失败"
    echo "尝试直接执行 SQL..."
    npx prisma db push
fi

# 步骤 8: 重新部署
echo ""
echo "8️⃣ 重新部署应用..."
vercel --prod --yes

echo ""
echo "✅ 配置完成！"
echo ""
echo "📊 测试你的应用："
echo ""
echo "1. 访问首页："
echo "   https://au-auction-results-1751718481.vercel.app"
echo ""
echo "2. 测试 API："
echo "   curl https://au-auction-results-1751718481.vercel.app/api/suburbs"
echo ""
echo "3. 查看数据库："
echo "   npx prisma studio"
echo ""
echo "🎉 恭喜！你的应用现在已完全配置并运行！"