#!/bin/bash

################################################################################
# 际华协同办公管理平台 - OpenCloudOS 8.10 自动化部署脚本
# 服务器IP: 152.136.183.181
# 操作系统: OpenCloudOS 8.10 (类似 RHEL 8)
# 部署方式: Nginx + 静态文件
################################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本必须以root用户运行"
        echo "请使用: sudo bash $0"
        exit 1
    fi
    log_info "Root权限检查通过"
}

# 显示系统信息
show_system_info() {
    log_step "=== 系统信息 ==="
    echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "内核版本: $(uname -r)"
    echo "CPU核心: $(nproc)"
    echo "内存大小: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "磁盘空间: $(df -h / | awk 'NR==2 {print $4}' | sed 's/G/GB/')"
    echo ""
}

# 更新系统
update_system() {
    log_step "步骤1: 更新系统软件包"
    log_info "正在更新软件源..."
    dnf update -y
    log_info "系统更新完成"
}

# 安装基础工具
install_basic_tools() {
    log_step "步骤2: 安装基础工具"
    log_info "安装常用工具..."
    dnf install -y \
        wget \
        curl \
        vim \
        git \
        net-tools \
        htop \
        tar \
        unzip
    log_info "基础工具安装完成"
}

# 配置防火墙
setup_firewall() {
    log_step "步骤3: 配置防火墙"
    
    # 检查firewalld状态
    if ! systemctl is-active --quiet firewalld; then
        log_info "启动firewalld..."
        systemctl start firewalld
        systemctl enable firewalld
    fi
    
    log_info "开放SSH端口(22)..."
    firewall-cmd --permanent --add-service=ssh
    
    log_info "开放HTTP端口(80)..."
    firewall-cmd --permanent --add-service=http
    
    log_info "开放HTTPS端口(443)..."
    firewall-cmd --permanent --add-service=https
    
    log_info "重载防火墙规则..."
    firewall-cmd --reload
    
    log_info "防火墙配置完成"
    echo "开放的端口:"
    firewall-cmd --list-all
}

# 安装Nginx
install_nginx() {
    log_step "步骤4: 安装Nginx"
    
    log_info "安装Nginx..."
    dnf install -y nginx
    
    log_info "启动Nginx服务..."
    systemctl start nginx
    systemctl enable nginx
    
    # 检查Nginx状态
    if systemctl is-active --quiet nginx; then
        log_info "Nginx安装并启动成功"
    else
        log_error "Nginx启动失败"
        exit 1
    fi
    
    log_info "Nginx版本: $(nginx -v 2>&1)"
}

# 创建部署目录
setup_deploy_directory() {
    log_step "步骤5: 创建部署目录"
    
    DEPLOY_DIR="/data/jihua-oa"
    BACKUP_DIR="/data/backups"
    
    log_info "创建部署目录: $DEPLOY_DIR"
    mkdir -p $DEPLOY_DIR
    
    log_info "创建备份目录: $BACKUP_DIR"
    mkdir -p $BACKUP_DIR
    
    log_info "设置目录权限..."
    chown -R nginx:nginx $DEPLOY_DIR
    chmod -R 755 $DEPLOY_DIR
    
    echo "部署目录: $DEPLOY_DIR"
    echo "备份目录: $BACKUP_DIR"
}

# 配置Nginx
configure_nginx() {
    log_step "步骤6: 配置Nginx"
    
    NGINX_CONF="/etc/nginx/conf.d/jihua-oa.conf"
    
    log_info "备份原有配置..."
    if [ -f "$NGINX_CONF" ]; then
        cp $NGINX_CONF ${NGINX_CONF}.bak.$(date +%Y%m%d%H%M%S)
    fi
    
    log_info "创建Nginx配置文件..."
    cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name 152.136.183.181;
    
    root /data/jihua-oa;
    index index.html;
    
    # 日志配置
    access_log /var/log/nginx/jihua-oa-access.log;
    error_log /var/log/nginx/jihua-oa-error.log;
    
    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    
    # 处理 React Router（SPA）路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
EOF
    
    log_info "测试Nginx配置..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        log_info "Nginx配置测试通过"
        log_info "重载Nginx..."
        systemctl reload nginx
        log_info "Nginx重载完成"
    else
        log_error "Nginx配置有误"
        exit 1
    fi
    
    echo "Nginx配置文件: $NGINX_CONF"
}

# 安装SSL证书工具
install_ssl_tools() {
    log_step "步骤7: 安装SSL证书工具"
    
    log_info "安装Certbot..."
    dnf install -y certbot python3-certbot-nginx
    
    log_info "Certbot安装完成"
    log_warn "SSL证书需要域名才能申请"
    log_warn "当前使用IP访问，暂不配置SSL"
    echo ""
    echo "如果您有域名，可以执行以下命令申请免费SSL证书:"
    echo "  sudo certbot --nginx -d your-domain.com"
}

# 创建部署说明文件
create_deploy_guide() {
    log_step "步骤8: 创建部署说明文件"
    
    GUIDE_FILE="/root/部署说明.txt"
    
    cat > $GUIDE_FILE << 'EOF'
=======================================================================
际华协同办公管理平台 - 部署说明
=======================================================================

服务器IP: 152.136.183.181
操作系统: OpenCloudOS 8.10
部署目录: /data/jihua-oa
备份目录: /data/backups
Nginx配置: /etc/nginx/conf.d/jihua-oa.conf

=======================================================================
一、文件上传方式
=======================================================================

方式1: 使用SCP上传 (从本地Windows)
------------------------------------
# 上传构建产物(dist目录)
scp -r E:\cowork\dist\* root@152.136.183.181:/data/jihua-oa/

方式2: 使用SFTP工具
------------------------------------
推荐工具: FileZilla, WinSCP
主机: 152.136.183.181
端口: 22
用户: root
远程目录: /data/jihua-oa

方式3: 使用Git (推荐)
------------------------------------
1. 在本地构建项目
   cd E:\cowork
   npm run build

2. 将dist目录打包
   tar -czf jihua-oa-dist.tar.gz dist/*

3. 上传到服务器
   scp jihua-oa-dist.tar.gz root@152.136.183.181:/tmp/

4. 在服务器上解压
   cd /data/jihua-oa
   tar -xzf /tmp/jihua-oa-dist.tar.gz --strip-components=1

=======================================================================
二、常用管理命令
=======================================================================

Nginx服务管理
------------------------------------
启动Nginx:     systemctl start nginx
停止Nginx:     systemctl stop nginx
重启Nginx:     systemctl restart nginx
重载配置:      systemctl reload nginx
查看状态:      systemctl status nginx
测试配置:      nginx -t

查看日志
------------------------------------
访问日志:      tail -f /var/log/nginx/jihua-oa-access.log
错误日志:      tail -f /var/log/nginx/jihua-oa-error.log

防火墙管理
------------------------------------
查看状态:      firewall-cmd --list-all
开放端口:      firewall-cmd --permanent --add-port=端口号/tcp
               firewall-cmd --reload
关闭端口:      firewall-cmd --permanent --remove-port=端口号/tcp
               firewall-cmd --reload

文件权限
------------------------------------
修复权限:      chown -R nginx:nginx /data/jihua-oa
               chmod -R 755 /data/jihua-oa

=======================================================================
三、部署更新流程
=======================================================================

1. 备份当前版本
   cd /data/jihua-oa
   tar -czf /data/backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz *

2. 清空部署目录
   rm -rf /data/jihua-oa/*

3. 上传新版本文件
   (使用上述上传方式之一)

4. 修复权限
   chown -R nginx:nginx /data/jihua-oa
   chmod -R 755 /data/jihua-oa

5. 重载Nginx (清除缓存)
   systemctl reload nginx

6. 测试访问
   curl http://152.136.183.181

=======================================================================
四、SSL证书配置 (有域名后执行)
=======================================================================

1. 将域名解析到服务器IP
   类型: A记录
   主机: @ 或 oa
   记录值: 152.136.183.181

2. 修改Nginx配置中的server_name
   vim /etc/nginx/conf.d/jihua-oa.conf
   将 server_name 152.136.183.181; 
   改为 server_name your-domain.com;

3. 申请Let's Encrypt证书
   certbot --nginx -d your-domain.com

4. 测试自动续期
   certbot renew --dry-run

=======================================================================
五、故障排查
=======================================================================

网站无法访问
------------------------------------
1. 检查Nginx状态
   systemctl status nginx

2. 检查防火墙
   firewall-cmd --list-all

3. 检查文件是否存在
   ls -lh /data/jihua-oa

4. 检查Nginx配置
   nginx -t

5. 查看错误日志
   tail -50 /var/log/nginx/jihua-oa-error.log

页面显示404
------------------------------------
1. 确认文件已上传
   ls /data/jihua-oa/index.html

2. 确认权限正确
   ls -l /data/jihua-oa

3. 清空浏览器缓存

页面样式错误
------------------------------------
1. 检查静态资源是否完整
   ls /data/jihua-oa/assets/

2. 清空CDN缓存
   systemctl reload nginx

3. 使用Ctrl+F5强制刷新浏览器

=======================================================================
六、性能优化建议
=======================================================================

1. 启用HTTP/2 (需要HTTPS)
2. 配置CDN加速
3. 调整Nginx工作进程数
4. 优化Gzip压缩级别
5. 启用浏览器缓存

=======================================================================
七、安全建议
=======================================================================

1. 修改SSH默认端口
2. 禁用root密码登录，使用密钥认证
3. 安装fail2ban防暴力破解
4. 定期更新系统补丁
5. 配置自动备份计划

=======================================================================
八、联系信息
=======================================================================

技术支持: 项目维护团队
文档更新: 2025-12-13

=======================================================================
EOF
    
    log_info "部署说明已创建: $GUIDE_FILE"
    echo ""
    cat $GUIDE_FILE
}

# 测试访问
test_access() {
    log_step "步骤9: 测试服务访问"
    
    log_info "等待Nginx完全启动..."
    sleep 2
    
    log_info "测试本地HTTP访问..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
    
    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "403" ]; then
        log_info "本地访问测试: 成功 (HTTP $HTTP_CODE)"
    else
        log_warn "本地访问测试: HTTP $HTTP_CODE"
    fi
    
    echo ""
    log_info "服务器环境配置完成！"
    echo ""
    echo "================================================================"
    echo "  🎉 际华协同办公管理平台 - 服务器环境配置成功！"
    echo "================================================================"
    echo ""
    echo "📌 当前状态:"
    echo "   • Nginx已安装并运行"
    echo "   • 防火墙已配置 (22/80/443端口已开放)"
    echo "   • 部署目录已创建: /data/jihua-oa"
    echo "   • SSL工具已安装"
    echo ""
    echo "🌐 访问地址:"
    echo "   • HTTP:  http://152.136.183.181"
    echo "   • 状态:  等待上传网站文件"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 在本地构建项目: npm run build"
    echo "   2. 上传dist目录到: /data/jihua-oa"
    echo "   3. 浏览器访问测试: http://152.136.183.181"
    echo ""
    echo "📖 详细说明请查看: /root/部署说明.txt"
    echo ""
    echo "================================================================"
}

# 主函数
main() {
    echo ""
    echo "================================================================"
    echo "  际华协同办公管理平台 - OpenCloudOS 自动化部署脚本"
    echo "================================================================"
    echo ""
    
    check_root
    show_system_info
    
    read -p "是否继续安装? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        log_info "安装已取消"
        exit 0
    fi
    
    echo ""
    log_info "开始配置服务器环境..."
    echo ""
    
    update_system
    install_basic_tools
    setup_firewall
    install_nginx
    setup_deploy_directory
    configure_nginx
    install_ssl_tools
    create_deploy_guide
    test_access
    
    echo ""
    log_info "脚本执行完成！"
}

# 执行主函数
main
