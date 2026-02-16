#!/bin/bash

# 客户情报采集系统 - 快速部署脚本
# 用于自动化部署情报采集功能的所有组件

echo "=========================================="
echo "   客户情报采集系统 - 快速部署"
echo "=========================================="
echo ""

# 检查环境
echo "📋 步骤 1/4: 检查环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查CloudBase环境变量
if [ -z "$TCB_ENV_ID" ]; then
    echo "⚠️  环境变量 TCB_ENV_ID 未设置"
    read -p "请输入CloudBase环境ID: " TCB_ENV_ID
    export TCB_ENV_ID
fi

echo "✅ CloudBase 环境ID: $TCB_ENV_ID"
echo ""

# 初始化数据库
echo "📋 步骤 2/4: 初始化数据库集合..."
if [ -f "database/init-intelligence-collections.js" ]; then
    node database/init-intelligence-collections.js
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功"
    else
        echo "❌ 数据库初始化失败"
        exit 1
    fi
else
    echo "⚠️  初始化脚本不存在，跳过"
fi
echo ""

# 部署云函数
echo "📋 步骤 3/4: 部署云函数..."
if [ -d "cloudfunctions/intelligence-collector" ]; then
    echo "正在部署 intelligence-collector 云函数..."
    
    # 检查是否有部署脚本
    if [ -f "deploy-function-direct.js" ]; then
        node deploy-function-direct.js intelligence-collector
        if [ $? -eq 0 ]; then
            echo "✅ 云函数部署成功"
        else
            echo "❌ 云函数部署失败"
            echo "💡 提示：可以手动在CloudBase控制台上传云函数"
        fi
    else
        echo "⚠️  自动部署脚本不存在"
        echo "💡 请手动部署云函数："
        echo "   1. 打开CloudBase控制台"
        echo "   2. 进入云函数管理"
        echo "   3. 上传 cloudfunctions/intelligence-collector 目录"
    fi
else
    echo "❌ 云函数目录不存在"
    exit 1
fi
echo ""

# 构建前端
echo "📋 步骤 4/4: 构建前端..."
if [ -f "package.json" ]; then
    echo "正在构建前端代码..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ 前端构建成功"
        echo "💡 提示：请将 dist 目录部署到CloudBase静态托管"
    else
        echo "⚠️  前端构建失败，但不影响功能使用"
    fi
else
    echo "⚠️  package.json 不存在，跳过前端构建"
fi
echo ""

# 部署完成
echo "=========================================="
echo "   ✅ 部署完成！"
echo "=========================================="
echo ""
echo "📝 下一步操作："
echo "1. 确认云函数已成功部署"
echo "   访问: https://console.cloud.tencent.com/tcb/scf"
echo ""
echo "2. 配置数据库权限"
echo "   集合: customer_intelligence, intelligence_reports"
echo "   权限: read/write = auth != null"
echo ""
echo "3. 部署前端到静态托管（如果需要）"
echo "   上传 dist 目录内容"
echo ""
echo "4. 开始使用"
echo "   - 进入商机管理"
echo "   - 打开任意商机详情"
echo "   - 切换到"客户情报"标签页"
echo ""
echo "📖 完整使用指南："
echo "   查看文件: 客户情报采集系统_使用指南.md"
echo ""
echo "=========================================="
