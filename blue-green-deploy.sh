#!/bin/bash

# ============================================
# 际华协同办公平台 - 增强版蓝绿部署脚本
# 版本: v2.0 (防缓存增强版)
# 端口配置: 3000(蓝) + 3003(绿)
# 新增功能:
# - 部署前清理旧dist
# - 验证上传文件完整性
# - 强制Docker无缓存构建
# - 自动备份和清理旧版本
# ============================================

set -e

# 配置变量
DOMAIN="jihuadz.xin"
PROJECT_NAME="jihua-prod"
BLUE_PORT=3000
GREEN_PORT=3003
DEPLOY_DIR="/var/www/jihua-deploy"
DIST_DIR="$DEPLOY_DIR/dist"
DOCKERFILE_PATH="$DEPLOY_DIR/Dockerfile"
IMAGE_NAME="jihua-prod-app"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 新增: 清理旧部署文件
clean_old_deployment() {
    log_info "======================================"
    log_info "清理旧部署文件"
    log_info "======================================"
    
    # 1. 备份当前dist (如果存在)
    if [ -d "$DIST_DIR" ]; then
        local backup_name="dist-backup-$(date +%Y%m%d-%H%M%S)"
        log_info "备份当前 dist 到: $backup_name"
        cp -r "$DIST_DIR" "$DEPLOY_DIR/$backup_name"
        
        # 2. 强制删除旧dist
        log_info "删除旧的 dist 目录..."
        rm -rf "$DIST_DIR"
        sleep 1
        log_info "✓ 旧 dist 目录已删除"
        
        # 3. 清理旧备份 (保留最近3个)
        log_info "清理旧备份..."
        cd "$DEPLOY_DIR"
        ls -t | grep "^dist-backup-" | tail -n +4 | xargs -r rm -rf
        log_info "✓ 旧备份已清理 (保留最近3个)"
    else
        log_info "✓ dist 目录不存在,跳过清理"
    fi
    
    # 4. 清理Docker build缓存
    log_info "清理 Docker build 缓存..."
    docker builder prune -f --filter "label=project=jihua-prod" > /dev/null 2>&1 || true
    log_info "✓ Docker 缓存已清理"
}

# 新增: 验证上传文件
validate_upload() {
    log_info "======================================"
    log_info "验证上传文件"
    log_info "======================================"
    
    # 1. 检查dist目录
    if [ ! -d "$DIST_DIR" ]; then
        log_error "dist 目录不存在: $DIST_DIR"
        exit 1
    fi
    
    # 2. 检查index.html
    if [ ! -f "$DIST_DIR/index.html" ]; then
        log_error "index.html 不存在"
        exit 1
    fi
    
    # 3. 检查assets目录
    if [ ! -d "$DIST_DIR/assets" ]; then
        log_error "assets 目录不存在"
        exit 1
    fi
    
    # 4. 统计文件数量和大小
    local file_count=$(find "$DIST_DIR" -type f | wc -l)
    local total_size=$(du -sh "$DIST_DIR" | awk '{print $1}')
    
    log_info "文件总数: $file_count"
    log_info "总大小: $total_size"
    
    # 5. 检查构建版本标记
    if [ -f "$DIST_DIR/.build-version" ]; then
        local build_version=$(cat "$DIST_DIR/.build-version")
        log_info "构建版本: $build_version"
    else
        log_warn "未找到构建版本标记"
    fi
    
    # 6. 验证文件完整性 (基本检查)
    if [ $file_count -lt 5 ]; then
        log_error "文件数量异常 (少于5个),可能上传不完整"
        exit 1
    fi
    
    log_info "✓ 文件验证通过"
}

# 新增: 强制无缓存构建镜像
build_docker_image() {
    local target_env=$1
    
    log_info "======================================"
    log_info "构建 Docker 镜像 (无缓存)"
    log_info "======================================"
    
    cd $DEPLOY_DIR
    
    # 使用 --no-cache 强制重新构建
    # 添加构建标签用于后续清理
    docker build \
        --no-cache \
        --pull \
        --label "project=jihua-prod" \
        --label "env=$target_env" \
        --label "build-time=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -t ${IMAGE_NAME}:${target_env} \
        -f $DOCKERFILE_PATH \
        .
    
    log_info "✓ Docker 镜像构建完成"
}

# 检查当前活跃环境
get_active_env() {
    if docker ps --format "{{.Names}}" | grep -q "${PROJECT_NAME}-blue"; then
        if [ "$(docker inspect -f '{{.State.Running}}' ${PROJECT_NAME}-blue 2>/dev/null)" = "true" ]; then
            echo "blue"
            return
        fi
    fi
    
    if docker ps --format "{{.Names}}" | grep -q "${PROJECT_NAME}-green"; then
        if [ "$(docker inspect -f '{{.State.Running}}' ${PROJECT_NAME}-green 2>/dev/null)" = "true" ]; then
            echo "green"
            return
        fi
    fi
    
    echo "none"
}

# 获取目标环境
get_target_env() {
    local active=$(get_active_env)
    if [ "$active" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# 获取环境端口
get_env_port() {
    local env=$1
    if [ "$env" = "blue" ]; then
        echo $BLUE_PORT
    else
        echo $GREEN_PORT
    fi
}

# 健康检查
health_check() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    log_info "等待服务启动 (端口:$port)..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:$port/ > /dev/null 2>&1; then
            log_info "✓ 健康检查通过"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    log_error "健康检查失败"
    return 1
}

# 切换Nginx配置
switch_nginx() {
    local target_env=$1
    local target_port=$(get_env_port $target_env)
    
    log_info "切换Nginx到 $target_env 环境 (端口:$target_port)..."
    
    sudo cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/${DOMAIN}.backup
    sudo sed -i "s/server 127.0.0.1:[0-9]\+;/server 127.0.0.1:$target_port;/" /etc/nginx/sites-available/$DOMAIN
    
    if sudo nginx -t 2>&1; then
        sudo systemctl reload nginx
        log_info "✓ Nginx切换成功"
        return 0
    else
        log_error "Nginx配置测试失败,恢复备份"
        sudo cp /etc/nginx/sites-available/${DOMAIN}.backup /etc/nginx/sites-available/$DOMAIN
        sudo systemctl reload nginx
        return 1
    fi
}

# 主部署流程 (增强版)
main() {
    log_info "======================================"
    log_info "开始增强版蓝绿部署"
    log_info "======================================"
    
    # 【新增】步骤0: 清理旧文件
    clean_old_deployment
    
    # 【新增】步骤1: 验证上传文件
    validate_upload
    
    ACTIVE_ENV=$(get_active_env)
    TARGET_ENV=$(get_target_env)
    TARGET_PORT=$(get_env_port $TARGET_ENV)
    
    log_info "当前活跃环境: $ACTIVE_ENV"
    log_info "目标部署环境: $TARGET_ENV (端口:$TARGET_PORT)"
    
    # 步骤2: 强制无缓存构建镜像
    build_docker_image $TARGET_ENV
    
    # 步骤3: 停止旧容器
    if docker ps -a --format "{{.Names}}" | grep -q "${PROJECT_NAME}-${TARGET_ENV}"; then
        log_info "停止旧的 $TARGET_ENV 容器..."
        docker stop ${PROJECT_NAME}-${TARGET_ENV} || true
        docker rm ${PROJECT_NAME}-${TARGET_ENV} || true
    fi
    
    # 步骤4: 启动新容器
    log_info "启动新容器: ${PROJECT_NAME}-${TARGET_ENV} (端口:$TARGET_PORT)..."
    docker run -d \
        --name ${PROJECT_NAME}-${TARGET_ENV} \
        --restart unless-stopped \
        -p $TARGET_PORT:80 \
        ${IMAGE_NAME}:${TARGET_ENV}
    
    # 步骤5: 健康检查
    if ! health_check $TARGET_PORT; then
        log_error "新环境健康检查失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    
    # 步骤6: 切换Nginx
    if ! switch_nginx $TARGET_ENV; then
        log_error "Nginx切换失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    
    # 步骤7: 清理旧容器和镜像
    if [ "$ACTIVE_ENV" != "none" ]; then
        log_info "等待30秒后清理旧环境..."
        sleep 30
        log_info "停止旧容器: ${PROJECT_NAME}-${ACTIVE_ENV}..."
        docker stop ${PROJECT_NAME}-${ACTIVE_ENV} || true
        
        # 【新增】删除旧镜像
        log_info "删除旧镜像: ${IMAGE_NAME}:${ACTIVE_ENV}..."
        docker rmi ${IMAGE_NAME}:${ACTIVE_ENV} || true
    fi
    
    log_info "======================================"
    log_info "✓ 部署完成!"
    log_info "======================================"
    log_info "活跃环境: $TARGET_ENV"
    log_info "访问地址: https://$DOMAIN"
    log_info ""
    log_info "容器状态:"
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # 【新增】清理提示
    log_info ""
    log_warn "⚠ 重要提示:"
    log_warn "1. 请使用 Ctrl+Shift+R (硬刷新) 清理浏览器缓存"
    log_warn "2. 或使用隐私/无痕模式访问验证"
    log_warn "3. CDN缓存约需3-5分钟更新"
}

# 回滚函数
rollback() {
    local target_env=$1
    
    if [ -z "$target_env" ]; then
        log_error "请指定要回滚到的环境: blue 或 green"
        exit 1
    fi
    
    log_warn "======================================"
    log_warn "开始回滚到 $target_env 环境"
    log_warn "======================================"
    
    if ! docker ps -a --format "{{.Names}}" | grep -q "${PROJECT_NAME}-${target_env}"; then
        log_error "$target_env 环境容器不存在"
        exit 1
    fi
    
    docker start ${PROJECT_NAME}-${target_env} || true
    local target_port=$(get_env_port $target_env)
    
    if ! health_check $target_port; then
        log_error "回滚失败: $target_env 环境不健康"
        exit 1
    fi
    
    if switch_nginx $target_env; then
        log_info "✓ 回滚成功"
    else
        log_error "回滚失败: Nginx切换失败"
        exit 1
    fi
}

case "${1:-deploy}" in
    deploy)
        main
        ;;
    clean)
        clean_old_deployment
        ;;
    validate)
        validate_upload
        ;;
    rollback)
        rollback $2
        ;;
    status)
        echo "当前活跃环境: $(get_active_env)"
        docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    *)
        echo "用法: $0 {deploy|clean|validate|rollback|status} [blue|green]"
        echo ""
        echo "命令说明:"
        echo "  deploy    - 执行完整的蓝绿部署 (包含清理和验证)"
        echo "  clean     - 仅清理旧部署文件和缓存"
        echo "  validate  - 仅验证上传文件的完整性"
        echo "  rollback  - 回滚到指定环境 (需指定 blue 或 green)"
        echo "  status    - 查看当前环境状态"
        exit 1
        ;;
esac
