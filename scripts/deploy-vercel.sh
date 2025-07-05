#!/bin/bash

echo "🚀 AU Auction Results - Vercel 部署脚本"
echo "======================================="

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm i -g vercel"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 步骤 1: 登录 Vercel
echo "📝 步骤 1: 登录 Vercel"
vercel login

# 步骤 2: 链接项目
echo ""
echo "🔗 步骤 2: 链接项目"
vercel link

# 步骤 3: 拉取环境变量
echo ""
echo "📥 步骤 3: 拉取环境变量"
vercel env pull .env.production.local

# 步骤 4: 检查环境变量
echo ""
echo "🔍 步骤 4: 检查环境变量"
if [ -f ".env.production.local" ]; then
    echo "✅ 环境变量文件已创建"
    echo ""
    echo "请确保以下变量已设置："
    echo "- DATABASE_URL"
    echo "- API_SECRET"
    echo "- NEXT_PUBLIC_APP_URL"
else
    echo "❌ 环境变量文件创建失败"
    exit 1
fi

# 步骤 5: 部署选项
echo ""
echo "🚀 步骤 5: 选择部署选项"
echo "1) 部署到生产环境"
echo "2) 部署到预览环境"
echo "3) 退出"
read -p "请选择 (1-3): " choice

case $choice in
    1)
        echo "部署到生产环境..."
        vercel --prod
        ;;
    2)
        echo "部署到预览环境..."
        vercel
        ;;
    3)
        echo "退出部署"
        exit 0
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 运行数据库迁移: DATABASE_URL=\$DATABASE_URL npx prisma migrate deploy"
echo "2. 访问你的应用测试功能"
echo "3. 配置 GitHub Actions secrets"
echo "4. 测试爬虫功能"