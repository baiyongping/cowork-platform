#!/bin/bash

echo "=================================="
echo "检查 Nginx 和 HTTPS 配置"
echo "=================================="
echo ""

# 1. 检查 Nginx 状态
echo "1. Nginx 运行状态："
systemctl status nginx | grep -E "(Active|running|failed)"
echo ""

# 2. 检查监听端口
echo "2. 监听端口："
ss -tlnp | grep -E '(:80|:443)'
echo ""

# 3. 检查 Nginx 配置
echo "3. Nginx 配置测试："
nginx -t
echo ""

# 4. 检查 HTTPS 配置文件
echo "4. HTTPS 配置文件："
if [ -f /etc/nginx/conf.d/jihua-https.conf ]; then
    echo "✅ 配置文件存在"
    head -20 /etc/nginx/conf.d/jihua-https.conf
else
    echo "❌ 配置文件不存在！"
fi
echo ""

# 5. 检查 SSL 证书
echo "5. SSL 证书："
if [ -f /etc/nginx/ssl/ip-selfsigned.crt ]; then
    echo "✅ 自签名证书存在"
    openssl x509 -in /etc/nginx/ssl/ip-selfsigned.crt -noout -subject -dates
else
    echo "❌ 自签名证书不存在！"
fi
echo ""

# 6. 检查防火墙
echo "6. 防火墙端口："
firewall-cmd --list-ports
echo ""

# 7. 检查 Nginx 错误日志
echo "7. Nginx 错误日志（最近 10 条）："
tail -10 /var/log/nginx/error.log
echo ""

# 8. 本地测试 HTTPS
echo "8. 本地 HTTPS 测试："
curl -k -I https://localhost 2>&1 | head -5
echo ""

echo "=================================="
echo "检查完成！"
echo "=================================="
