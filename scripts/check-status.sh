#!/bin/bash

echo "🔍 检查应用部署状态"
echo "==================="
echo ""

# 获取项目信息
echo "📦 Vercel 项目信息："
vercel project ls | grep au-auction-results || echo "项目: au-auction-results-1751718481"

echo ""
echo "🌐 部署信息："
vercel ls | head -5

echo ""
echo "🔧 环境变量状态："
echo "检查已配置的环境变量..."
vercel env ls

echo ""
echo "📊 数据库连接状态："
if [ -f ".env.production.local" ]; then
    if grep -q "DATABASE_URL" .env.production.local; then
        echo "✅ DATABASE_URL 已在本地环境文件中找到"
    else
        echo "❌ DATABASE_URL 未配置"
        echo ""
        echo "⚠️  请执行以下步骤："
        echo "1. 在 Vercel Dashboard 创建 Postgres 数据库"
        echo "2. 运行: vercel env pull .env.production.local"
    fi
else
    echo "❌ 本地环境文件未找到"
    echo "运行: vercel env pull .env.production.local"
fi

echo ""
echo "🚀 快速操作："
echo "- 创建数据库后运行: ./scripts/setup-database.sh"
echo "- 测试部署: ./scripts/test-deployment.sh"
echo "- 查看项目: vercel open"