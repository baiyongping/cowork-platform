#!/bin/bash

# ============================================
# 际华协同办公平台 - 生产环境蓝绿部署脚本
# 版本: v1.0
# 端口配置: 3000(蓝) + 3003(绿)
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

# 主部署流程
main() {
    log_info "======================================"
    log_info "开始生产环境蓝绿部署"
    log_info "======================================"
    
    ACTIVE_ENV=$(get_active_env)
    TARGET_ENV=$(get_target_env)
    TARGET_PORT=$(get_env_port $TARGET_ENV)
    
    log_info "当前活跃环境: $ACTIVE_ENV"
    log_info "目标部署环境: $TARGET_ENV (端口:$TARGET_PORT)"
    
    if [ ! -d "$DIST_DIR" ]; then
        log_error "部署目录不存在: $DIST_DIR"
        exit 1
    fi
    
    log_info "构建Docker镜像..."
    cd $DEPLOY_DIR
    docker build -t ${IMAGE_NAME}:${TARGET_ENV} -f $DOCKERFILE_PATH .
    
    if docker ps -a --format "{{.Names}}" | grep -q "${PROJECT_NAME}-${TARGET_ENV}"; then
        log_info "停止旧的 $TARGET_ENV 容器..."
        docker stop ${PROJECT_NAME}-${TARGET_ENV} || true
        docker rm ${PROJECT_NAME}-${TARGET_ENV} || true
    fi
    
    log_info "启动新容器: ${PROJECT_NAME}-${TARGET_ENV} (端口:$TARGET_PORT)..."
    docker run -d \
        --name ${PROJECT_NAME}-${TARGET_ENV} \
        --restart unless-stopped \
        -p $TARGET_PORT:80 \
        ${IMAGE_NAME}:${TARGET_ENV}
    
    if ! health_check $TARGET_PORT; then
        log_error "新环境健康检查失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    
    if ! switch_nginx $TARGET_ENV; then
        log_error "Nginx切换失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    
    if [ "$ACTIVE_ENV" != "none" ]; then
        log_info "等待30秒后清理旧环境..."
        sleep 30
        log_info "停止旧容器: ${PROJECT_NAME}-${ACTIVE_ENV}..."
        docker stop ${PROJECT_NAME}-${ACTIVE_ENV} || true
    fi
    
    log_info "======================================"
    log_info "✓ 部署完成!"
    log_info "======================================"
    log_info "活跃环境: $TARGET_ENV"
    log_info "访问地址: https://$DOMAIN"
    log_info "容器状态:"
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
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
    rollback)
        rollback $2
        ;;
    status)
        echo "当前活跃环境: $(get_active_env)"
        docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
    *)
        echo "用法: $0 {deploy|rollback|status} [blue|green]"
        exit 1
        ;;
esac
