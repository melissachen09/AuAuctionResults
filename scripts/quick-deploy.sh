#!/bin/bash

echo "🚀 AU Auction Results - 快速部署脚本"
echo "====================================="
echo ""

# 生成 API Secret
API_SECRET=$(openssl rand -base64 32)
echo "🔐 生成 API_SECRET: $API_SECRET"
echo ""

# 创建环境变量文件
cat > .env.production <<EOF
API_SECRET="$API_SECRET"
NODE_ENV="production"
EOF

echo "✅ 环境变量文件已创建"
echo ""

# 检查 Vercel 登录状态
echo "🔑 检查 Vercel 登录状态..."
if vercel whoami > /dev/null 2>&1; then
    echo "✅ 已登录 Vercel"
else
    echo "📝 需要登录 Vercel..."
    vercel login
fi
echo ""

# 设置项目名称
PROJECT_NAME="au-auction-results-$(date +%s)"
echo "📦 项目名称: $PROJECT_NAME"
echo ""

# 部署到 Vercel（非交互式）
echo "🚀 开始部署..."
echo ""

# 使用 --yes 参数进行非交互式部署
vercel --prod --yes --name "$PROJECT_NAME" \
    --env API_SECRET="$API_SECRET" \
    --env NODE_ENV="production" \
    --build-env DATABASE_URL="@database_url" \
    > deployment.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    
    # 从日志中提取 URL
    DEPLOYMENT_URL=$(cat deployment.log | grep -o 'https://[^ ]*' | tail -1)
    echo ""
    echo "🌐 应用 URL: $DEPLOYMENT_URL"
    
    # 保存部署信息
    cat > deployment-info.json <<EOF
{
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "projectName": "$PROJECT_NAME",
  "deploymentUrl": "$DEPLOYMENT_URL",
  "apiSecret": "$API_SECRET",
  "nextSteps": [
    "1. 创建 Vercel Postgres 数据库",
    "2. 运行数据库迁移",
    "3. 配置 GitHub Actions Secrets"
  ]
}
EOF
    
    echo ""
    echo "📋 下一步操作："
    echo ""
    echo "1. 创建数据库："
    echo "   打开 $DEPLOYMENT_URL"
    echo "   在 Vercel Dashboard 中点击 Storage → Create Database → Postgres"
    echo ""
    echo "2. 运行数据库迁移："
    echo "   vercel env pull .env.production.local"
    echo "   npx prisma migrate deploy"
    echo ""
    echo "3. 测试应用："
    echo "   open $DEPLOYMENT_URL"
    echo ""
    echo "💾 部署信息已保存到 deployment-info.json"
    
else
    echo "❌ 部署失败！请查看 deployment.log 获取详细信息"
    cat deployment.log
    exit 1
fi

# 清理临时文件
rm -f deployment.log