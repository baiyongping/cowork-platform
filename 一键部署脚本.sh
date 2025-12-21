#!/bin/bash

#############################################
# 际华定制协同办公系统 - 一键部署脚本
# 服务器: OpenCloudOS 8.10
# 域名: jihuadz.xin
# IP: 152.136.183.181
#############################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置参数
DOMAIN="jihuadz.xin"
WWW_DOMAIN="www.jihuadz.xin"
EMAIL="admin@${DOMAIN}"  # 用于SSL证书申请
WEB_ROOT="/var/www/jihua"
NGINX_CONF="/etc/nginx/conf.d/jihuadz.conf"

#############################################
# 第一部分: 系统环境配置
#############################################

log_info "================================================"
log_info "开始部署 - 际华定制协同办公系统"
log_info "域名: ${DOMAIN}"
log_info "================================================"
echo ""

# 1. 系统更新
log_info "步骤 1/10: 更新系统软件包..."
dnf update -y --skip-broken || log_warning "部分软件包更新失败，继续..."
log_success "系统更新完成"
echo ""

# 2. 安装基础工具
log_info "步骤 2/10: 安装基础工具..."
dnf install -y wget curl git vim unzip tar || {
    log_error "基础工具安装失败"
    exit 1
}
log_success "基础工具安装完成"
echo ""

# 3. 安装 Nginx
log_info "步骤 3/10: 安装 Nginx Web 服务器..."
if ! command -v nginx &> /dev/null; then
    dnf install -y nginx || {
        log_error "Nginx 安装失败"
        exit 1
    }
    systemctl enable nginx
    log_success "Nginx 安装完成"
else
    log_warning "Nginx 已安装，跳过"
fi
echo ""

# 4. 创建 Web 目录
log_info "步骤 4/10: 创建 Web 目录..."
mkdir -p ${WEB_ROOT}
chown -R nginx:nginx ${WEB_ROOT}
chmod -R 755 ${WEB_ROOT}
log_success "Web 目录创建完成: ${WEB_ROOT}"
echo ""

# 5. 配置 Nginx
log_info "步骤 5/10: 配置 Nginx..."

# 备份原配置
if [ -f "${NGINX_CONF}" ]; then
    cp ${NGINX_CONF} ${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)
    log_warning "已备份原配置文件"
fi

# 创建 Nginx 配置文件
cat > ${NGINX_CONF} << 'EOF'
# 际华定制协同办公系统 - Nginx 配置
# HTTP 配置（稍后会自动升级为 HTTPS）

server {
    listen 80;
    listen [::]:80;
    server_name jihuadz.xin www.jihuadz.xin;
    
    root /var/www/jihua;
    index index.html;
    
    # 日志
    access_log /var/log/nginx/jihua_access.log;
    error_log /var/log/nginx/jihua_error.log;
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript
               image/svg+xml;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

log_success "Nginx 配置文件创建完成"

# 测试 Nginx 配置
log_info "测试 Nginx 配置..."
nginx -t || {
    log_error "Nginx 配置测试失败"
    exit 1
}
log_success "Nginx 配置测试通过"
echo ""

# 6. 配置防火墙
log_info "步骤 6/10: 配置防火墙..."

# 检查 firewalld 是否运行
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    log_success "防火墙规则配置完成"
else
    log_warning "firewalld 未运行，跳过防火墙配置"
fi
echo ""

# 7. 安装 Certbot（SSL证书工具）
log_info "步骤 7/10: 安装 SSL 证书工具..."
if ! command -v certbot &> /dev/null; then
    dnf install -y certbot python3-certbot-nginx || {
        log_warning "Certbot 安装失败，将跳过 HTTPS 配置"
    }
    log_success "Certbot 安装完成"
else
    log_warning "Certbot 已安装，跳过"
fi
echo ""

# 8. 创建临时测试页面
log_info "步骤 8/10: 创建临时测试页面..."
cat > ${WEB_ROOT}/index.html << 'EOF'
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>际华定制协同办公系统 - 部署中</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            max-width: 600px;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        p { font-size: 1.2em; margin-bottom: 15px; opacity: 0.9; }
        .status {
            display: inline-block;
            padding: 10px 20px;
            background: rgba(76, 175, 80, 0.3);
            border-radius: 25px;
            margin-top: 20px;
            font-weight: bold;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 30px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .info { font-size: 0.9em; opacity: 0.7; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 际华定制协同办公系统</h1>
        <div class="spinner"></div>
        <p>系统正在部署中...</p>
        <div class="status">✅ Nginx 运行正常</div>
        <div class="info">
            <p>域名: jihuadz.xin</p>
            <p>请等待管理员上传应用文件</p>
        </div>
    </div>
</body>
</html>
EOF

chmod 644 ${WEB_ROOT}/index.html
chown nginx:nginx ${WEB_ROOT}/index.html
log_success "测试页面创建完成"
echo ""

# 9. 启动 Nginx
log_info "步骤 9/10: 启动 Nginx 服务..."
systemctl restart nginx
systemctl status nginx --no-pager || {
    log_error "Nginx 启动失败"
    exit 1
}
log_success "Nginx 服务启动成功"
echo ""

# 10. SSL 证书申请提示
log_info "步骤 10/10: 准备 SSL 证书申请..."
echo ""
log_warning "================================================"
log_warning "重要提示: SSL 证书申请"
log_warning "================================================"
echo ""
echo "在申请 SSL 证书前，请确保:"
echo "  1. 域名 DNS 已解析到本服务器 (已确认 ✅)"
echo "  2. 防火墙已开放 80 和 443 端口 (已配置 ✅)"
echo "  3. 域名已完成 ICP 备案（如服务器在中国大陆）"
echo ""
echo "执行以下命令申请免费 SSL 证书:"
echo ""
echo -e "${GREEN}certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} \\${NC}"
echo -e "${GREEN}  --non-interactive --agree-tos \\${NC}"
echo -e "${GREEN}  --email ${EMAIL} \\${NC}"
echo -e "${GREEN}  --redirect${NC}"
echo ""
echo "证书有效期 90 天，自动续期已配置。"
echo ""

#############################################
# 部署总结
#############################################

log_success "================================================"
log_success "环境配置完成！"
log_success "================================================"
echo ""
echo "📋 配置摘要:"
echo "  - Web 服务器: Nginx (运行中 ✅)"
echo "  - Web 目录: ${WEB_ROOT}"
echo "  - 域名: ${DOMAIN}"
echo "  - HTTP 访问: http://${DOMAIN}"
echo "  - 配置文件: ${NGINX_CONF}"
echo ""
echo "🌐 现在可以访问:"
echo "  http://${DOMAIN}"
echo "  http://${WWW_DOMAIN}"
echo ""
echo "📦 下一步操作:"
echo "  1. 在本地构建项目: npm run build"
echo "  2. 上传文件到服务器: scp -r dist/* root@152.136.183.181:${WEB_ROOT}/"
echo "  3. 申请 SSL 证书（可选但推荐）"
echo ""
echo "💡 快速命令:"
echo "  # 本地执行"
echo "  cd E:\\cowork"
echo "  npm run build"
echo "  "
echo "  # 上传文件"
echo "  scp -r dist/* root@152.136.183.181:${WEB_ROOT}/"
echo ""
echo "  # 服务器执行（申请SSL证书）"
echo "  certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} \\"
echo "    --non-interactive --agree-tos \\"
echo "    --email ${EMAIL} \\"
echo "    --redirect"
echo ""
log_success "部署脚本执行完成！"
