#!/bin/bash

echo "=== 部署 Parasaga 生产环境到服务器 ==="
echo ""

SERVER="152.136.183.181"
WEB_DIR="/var/www/jihua-parasaga"

# 1. 上传 Nginx 配置
echo "1. 上传 Nginx 配置文件..."
scp nginx-parasaga.conf root@${SERVER}:/etc/nginx/sites-available/jihua-parasaga.conf

# 2. 创建软链接
echo "2. 创建 Nginx 软链接..."
ssh root@${SERVER} "ln -sf /etc/nginx/sites-available/jihua-parasaga.conf /etc/nginx/sites-enabled/jihua-parasaga.conf"

# 3. 创建 Web 目录
echo "3. 创建 Web 目录..."
ssh root@${SERVER} "mkdir -p ${WEB_DIR}"

# 4. 上传 dist 文件
echo "4. 上传 Web 文件..."
scp -r dist/* root@${SERVER}:${WEB_DIR}/

# 5. 设置权限
echo "5. 设置文件权限..."
ssh root@${SERVER} "chown -R nginx:nginx ${WEB_DIR} && chmod -R 755 ${WEB_DIR}"

# 6. 测试 Nginx 配置
echo "6. 测试 Nginx 配置..."
ssh root@${SERVER} "nginx -t"

# 7. 重启 Nginx
echo "7. 重启 Nginx..."
ssh root@${SERVER} "systemctl reload nginx"

# 8. 检查端口监听
echo "8. 检查 8010 端口..."
ssh root@${SERVER} "netstat -tlnp | grep :8010"

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问地址: https://152.136.183.181:8010"
