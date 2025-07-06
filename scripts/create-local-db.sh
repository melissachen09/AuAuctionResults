#!/bin/bash

echo "🗄️  设置本地 PostgreSQL 数据库"
echo "=============================="
echo ""

# 检查是否安装了 PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 未安装"
    echo ""
    echo "请安装 PostgreSQL："
    echo "- macOS: brew install postgresql"
    echo "- Ubuntu: sudo apt-get install postgresql"
    echo "- Windows: 下载安装程序"
    exit 1
fi

# 生成随机密码
DB_PASSWORD=$(openssl rand -base64 12)
DB_NAME="auction_results_db"
DB_USER="auction_user"

echo "📝 创建数据库配置..."
echo ""
echo "数据库名: $DB_NAME"
echo "用户名: $DB_USER"
echo "密码: $DB_PASSWORD"
echo ""

# 创建数据库和用户
echo "🔧 创建数据库..."
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 数据库创建成功"
else
    echo "❌ 数据库创建失败"
    echo "尝试使用现有数据库..."
fi

# 创建本地环境文件
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"

cat > .env.local <<EOF
DATABASE_URL="$DATABASE_URL"
API_SECRET="$(openssl rand -base64 32)"
NODE_ENV="development"
EOF

echo ""
echo "✅ 本地环境文件已创建"
echo ""
echo "📋 数据库连接信息："
echo "DATABASE_URL=$DATABASE_URL"
echo ""

# 运行迁移
echo "🏗️  运行数据库迁移..."
npx prisma migrate dev --name init

echo ""
echo "✅ 本地数据库设置完成！"
echo ""
echo "🚀 启动本地开发服务器："
echo "   npm run dev"
echo ""
echo "📊 查看数据库："
echo "   npx prisma studio"