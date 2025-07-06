#!/bin/bash

echo "🚀 Supabase 数据库配置向导"
echo "=========================="
echo ""
echo "📋 在 Supabase Dashboard 中查找你的数据库连接信息："
echo ""
echo "1. 打开你的 Supabase 项目"
echo "2. 点击左侧的 'Settings' (设置)"
echo "3. 点击 'Database'"
echo "4. 找到 'Connection string' 部分"
echo "5. 选择 'URI' 标签"
echo "6. 点击 'Copy' 复制连接字符串"
echo ""
echo "连接字符串格式："
echo "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
echo ""
read -p "请粘贴你的 Supabase 数据库连接字符串: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ 数据库URL不能为空"
    exit 1
fi

# 验证URL格式
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    echo "❌ 无效的数据库URL格式"
    echo "URL应该以 postgresql:// 开头"
    exit 1
fi

echo ""
echo "✅ 数据库URL已接收"
echo ""

# 调用快速设置脚本
echo "🔧 开始配置..."
./scripts/quick-db-setup.sh "$DATABASE_URL"