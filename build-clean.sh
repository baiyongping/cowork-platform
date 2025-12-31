#!/bin/bash

# ============================================
# 际华协同办公平台 - 清理构建脚本 (Linux/Mac)
# 版本: v1.0
# 用途: 彻底清理旧构建文件并重新构建
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${CYAN}[$1]${NC} $2"; }

echo "====================================="
echo "际华协同办公平台 - 清理构建"
echo "====================================="
echo ""

# 1. 强制删除 dist 目录
log_step "1/5" "删除旧的 dist 目录..."
if [ -d "dist" ]; then
    rm -rf dist
    sleep 1
    
    if [ -d "dist" ]; then
        log_error "dist 目录删除失败,可能被占用"
        echo "  请关闭所有开发服务器和文件浏览器后重试"
        exit 1
    else
        log_info "dist 目录已删除"
    fi
else
    log_info "dist 目录不存在,跳过"
fi

# 2. 清理 Vite 缓存
log_step "2/5" "清理 Vite 缓存..."
if [ -d "node_modules/.vite" ]; then
    rm -rf node_modules/.vite
    log_info "Vite 缓存已清理"
else
    log_info "Vite 缓存不存在,跳过"
fi

# 3. 检查依赖变更
log_step "3/5" "检查依赖变更..."
needInstall=false

if [ -f ".last-build-hash" ]; then
    lastHash=$(cat .last-build-hash)
    currentHash=$(sha256sum package-lock.json | awk '{print $1}')
    
    if [ "$lastHash" != "$currentHash" ]; then
        log_warn "检测到依赖变更,将重新安装"
        needInstall=true
    fi
else
    log_warn "首次构建,将安装依赖"
    needInstall=true
fi

if [ "$needInstall" = true ]; then
    echo "执行 npm ci (清理安装)..."
    npm ci
    
    if [ $? -eq 0 ]; then
        sha256sum package-lock.json | awk '{print $1}' > .last-build-hash
        log_info "依赖安装完成"
    else
        log_error "依赖安装失败"
        exit 1
    fi
else
    log_info "依赖无变更,跳过安装"
fi

# 4. 验证环境变量
log_step "4/5" "验证环境变量..."
if [ -f ".env.production" ]; then
    if grep -q "VITE_CLOUDBASE_ENV_ID=" .env.production; then
        envId=$(grep "VITE_CLOUDBASE_ENV_ID=" .env.production | cut -d'=' -f2)
        log_info "CloudBase 环境ID: $envId"
    else
        log_warn "未找到 VITE_CLOUDBASE_ENV_ID"
    fi
else
    log_warn ".env.production 文件不存在"
fi

# 5. 执行构建
log_step "5/5" "开始构建..."
echo ""
npx vite build --mode production

if [ $? -eq 0 ]; then
    echo ""
    echo "====================================="
    echo -e "${GREEN}✓ 构建完成!${NC}"
    echo "====================================="
    echo ""
    
    # 显示构建产物信息
    distSize=$(du -sh dist | awk '{print $1}')
    fileCount=$(find dist -type f | wc -l)
    
    echo -e "${CYAN}📦 dist 目录大小: $distSize${NC}"
    echo -e "${CYAN}📄 文件总数: $fileCount${NC}"
    
    # 生成版本标记
    version=$(date +%Y%m%d-%H%M%S)
    echo -n "$version" > dist/.build-version
    echo -e "${CYAN}🏷️  构建版本: $version${NC}"
    
    echo ""
    echo -e "${CYAN}主要文件:${NC}"
    find dist -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" \) -exec ls -lh {} \; | 
        awk '{printf "%-40s %8s\n", $9, $5}' | 
        sort
    
    echo ""
    echo -e "${GREEN}✅ 下一步操作:${NC}"
    echo "1. 使用 Lighthouse MCP 工具上传到服务器"
    echo "2. 或使用 SCP 命令上传: scp -r dist root@152.136.183.181:/var/www/jihua-deploy/"
    echo ""
    
else
    echo ""
    echo "====================================="
    echo -e "${RED}✗ 构建失败!${NC}"
    echo "====================================="
    echo ""
    echo -e "${YELLOW}常见问题:${NC}"
    echo "1. 检查 TypeScript 类型错误"
    echo "2. 检查 ESLint 报错"
    echo "3. 检查环境变量配置"
    echo "4. 查看上方具体错误信息"
    echo ""
    exit 1
fi
