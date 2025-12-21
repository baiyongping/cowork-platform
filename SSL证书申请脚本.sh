#!/bin/bash
# SSL 证书配置脚本

echo "=== 步骤 1: 开放防火墙 443 端口 ==="
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
firewall-cmd --list-ports

echo -e "\n=== 步骤 2: 检查 Nginx 配置 ==="
nginx -t

echo -e "\n=== 步骤 3: 检查 Nginx 运行状态 ==="
systemctl status nginx --no-pager

echo -e "\n=== 步骤 4: 重启 Nginx ==="
systemctl restart nginx

echo -e "\n=== 步骤 5: 检查端口监听 ==="
ss -tlnp | grep nginx

echo -e "\n=== 步骤 6: 检查 SSL 证书文件 ==="
ls -lh /etc/nginx/ssl/

echo -e "\n=== 配置完成! ==="
echo "HTTP 访问: http://152.136.183.181"
echo "HTTPS 访问: https://152.136.183.181"
echo ""
echo "⚠️ 注意: 如果 HTTPS 仍无法访问，请在腾讯云控制台检查:"
echo "1. 安全组是否开放 443 端口"
echo "2. 轻量应用服务器防火墙规则"
