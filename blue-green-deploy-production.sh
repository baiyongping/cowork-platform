#!/bin/bash

# ============================================
# 际华协同办公平台 - 生产环境蓝绿部署脚本
# 版本: v3.12.0
# 域名: jihuadz.xin
# 端口配置: 3000(蓝) + 3003(绿)
# 功能:
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
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 显示横幅
show_banner() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  际华协同办公平台 - 生产环境部署${NC}"
    echo -e "${BLUE}  版本: v3.12.0${NC}"
    echo -e "${BLUE}  域名: https://$DOMAIN${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

# 清理旧部署文件
clean_old_deployment() {
    log_step "清理旧部署文件"
    
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
    docker builder prune -f --filter "label=project=$PROJECT_NAME" > /dev/null 2>&1 || true
    log_info "✓ Docker 缓存已清理"
    
    echo ""
}

# 验证上传文件
validate_upload() {
    log_step "验证上传文件"
    
    # 1. 检查dist目录
    if [ ! -d "$DIST_DIR" ]; then
        log_error "dist 目录不存在: $DIST_DIR"
        log_error "请先使用 Lighthouse MCP 工具上传构建产物"
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
    echo ""
}

# 强制无缓存构建镜像
build_docker_image() {
    local target_env=$1
    
    log_step "构建 Docker 镜像 (无缓存)"
    
    cd $DEPLOY_DIR
    
    # 使用 --no-cache 强制重新构建
    log_info "开始构建镜像: ${IMAGE_NAME}:${target_env}"
    docker build \
        --no-cache \
        --pull \
        --label "project=$PROJECT_NAME" \
        --label "env=$target_env" \
        --label "build-time=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -t ${IMAGE_NAME}:${target_env} \
        -f $DOCKERFILE_PATH \
        .
    
    log_info "✓ Docker 镜像构建完成"
    echo ""
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
            echo ""
            log_info "✓ 健康检查通过"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_error "健康检查失败 (超时 60 秒)"
    return 1
}

# 切换Nginx配置
switch_nginx() {
    local target_env=$1
    local target_port=$(get_env_port $target_env)
    
    log_info "切换Nginx到 $target_env 环境 (端口:$target_port)..."
    
    # 备份当前配置
    sudo cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/${DOMAIN}.backup
    
    # 更新upstream配置
    sudo sed -i "s/server 127.0.0.1:[0-9]\+;/server 127.0.0.1:$target_port;/" /etc/nginx/sites-available/$DOMAIN
    
    # 测试Nginx配置
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
    show_banner
    
    log_step "开始生产环境蓝绿部署"
    
    # 步骤0: 清理旧文件
    clean_old_deployment
    
    # 步骤1: 验证上传文件
    validate_upload
    
    ACTIVE_ENV=$(get_active_env)
    TARGET_ENV=$(get_target_env)
    TARGET_PORT=$(get_env_port $TARGET_ENV)
    
    log_info "当前活跃环境: $ACTIVE_ENV"
    log_info "目标部署环境: $TARGET_ENV (端口:$TARGET_PORT)"
    echo ""
    
    # 步骤2: 构建镜像
    build_docker_image $TARGET_ENV
    
    # 步骤3: 停止旧容器
    log_step "准备目标环境容器"
    if docker ps -a --format "{{.Names}}" | grep -q "${PROJECT_NAME}-${TARGET_ENV}"; then
        log_info "停止旧的 $TARGET_ENV 容器..."
        docker stop ${PROJECT_NAME}-${TARGET_ENV} || true
        docker rm ${PROJECT_NAME}-${TARGET_ENV} || true
    fi
    echo ""
    
    # 步骤4: 启动新容器
    log_step "启动新环境容器"
    log_info "容器名称: ${PROJECT_NAME}-${TARGET_ENV}"
    log_info "监听端口: $TARGET_PORT"
    docker run -d \
        --name ${PROJECT_NAME}-${TARGET_ENV} \
        --restart unless-stopped \
        --memory="1g" \
        --cpus="2.0" \
        -p $TARGET_PORT:80 \
        ${IMAGE_NAME}:${TARGET_ENV}
    
    log_info "✓ 容器已启动"
    echo ""
    
    # 步骤5: 健康检查
    log_step "执行健康检查"
    if ! health_check $TARGET_PORT; then
        log_error "新环境健康检查失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    echo ""
    
    # 步骤6: 切换Nginx
    log_step "切换 Nginx 流量"
    if ! switch_nginx $TARGET_ENV; then
        log_error "Nginx切换失败,回滚部署"
        docker stop ${PROJECT_NAME}-${TARGET_ENV}
        exit 1
    fi
    echo ""
    
    # 步骤7: 清理旧容器和镜像
    if [ "$ACTIVE_ENV" != "none" ]; then
        log_step "清理旧环境"
        log_info "等待30秒后清理旧环境..."
        sleep 30
        log_info "停止旧容器: ${PROJECT_NAME}-${ACTIVE_ENV}..."
        docker stop ${PROJECT_NAME}-${ACTIVE_ENV} || true
        
        log_info "删除旧镜像: ${IMAGE_NAME}:${ACTIVE_ENV}..."
        docker rmi ${IMAGE_NAME}:${ACTIVE_ENV} || true
        
        log_info "✓ 旧环境已清理"
        echo ""
    fi
    
    # 部署完成
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ✓ 生产环境部署完成!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    log_info "活跃环境: $TARGET_ENV"
    log_info "生产域名: https://$DOMAIN"
    echo ""
    log_info "容器状态:"
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # 重要提示
    echo ""
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}  ⚠ 重要提示:${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}1. 请使用 Ctrl+Shift+R (硬刷新) 清理浏览器缓存${NC}"
    echo -e "${YELLOW}2. 或使用隐私/无痕模式访问验证${NC}"
    echo -e "${YELLOW}3. CDN缓存约需3-5分钟更新${NC}"
    echo -e "${YELLOW}4. 如发现问题，可快速回滚:${NC}"
    echo -e "${YELLOW}   ./blue-green-deploy-production.sh rollback $ACTIVE_ENV${NC}"
    echo ""
}

# 回滚函数
rollback() {
    local target_env=$1
    
    if [ -z "$target_env" ]; then
        log_error "请指定要回滚到的环境: blue 或 green"
        exit 1
    fi
    
    show_banner
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}  开始回滚到 $target_env 环境${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo ""
    
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
        echo ""
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}  ✓ 回滚成功${NC}"
        echo -e "${GREEN}============================================${NC}"
        echo ""
    else
        log_error "回滚失败: Nginx切换失败"
        exit 1
    fi
}

# 查看状态
show_status() {
    show_banner
    
    local active=$(get_active_env)
    
    echo "当前活跃环境: $active"
    echo ""
    echo "容器状态:"
    docker ps --filter "name=${PROJECT_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Docker 镜像:"
    docker images | grep -E "REPOSITORY|$IMAGE_NAME"
    echo ""
    echo "Nginx 配置:"
    grep "server 127.0.0.1:" /etc/nginx/sites-available/$DOMAIN | head -1
    echo ""
    echo "生产访问地址: https://$DOMAIN"
}

# 主程序入口
case "${1:-deploy}" in
    deploy)
        main
        ;;
    clean)
        show_banner
        clean_old_deployment
        ;;
    validate)
        show_banner
        validate_upload
        ;;
    rollback)
        rollback $2
        ;;
    status)
        show_status
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
        echo ""
        echo "示例:"
        echo "  $0 deploy              # 执行生产部署"
        echo "  $0 rollback blue       # 回滚到蓝环境"
        echo "  $0 status              # 查看当前状态"
        exit 1
        ;;
esac
