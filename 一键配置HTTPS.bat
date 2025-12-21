@echo off
chcp 65001 >nul
echo ════════════════════════════════════════
echo 一键配置测试环境 HTTPS
echo ════════════════════════════════════════
echo.
echo 本脚本将自动完成以下操作：
echo 1. 生成自签名 SSL 证书
echo 2. 配置 Nginx HTTPS (端口 3443)
echo 3. HTTP (3000) 自动重定向到 HTTPS
echo 4. 重启 Nginx 服务
echo.
echo 请输入服务器 SSH 密码完成配置...
echo.

REM 使用 SSH 直接执行所有命令
ssh root@152.136.183.181 "bash -s" << 'ENDSSH'
#!/bin/bash
set -e

echo "════════════════════════════════════════"
echo "开始配置 HTTPS..."
echo "════════════════════════════════════════"
echo ""

# 1. 生成 SSL 证书
echo "【步骤 1/5】生成 SSL 证书..."
mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

if [ -f jihua-dev.crt ]; then
    echo "⚠️  证书已存在，跳过生成"
else
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout jihua-dev.key \
      -out jihua-dev.crt \
      -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Jihua/CN=152.136.183.181" 2>/dev/null
    echo "✅ SSL 证书生成完成"
fi
echo ""

# 2. 配置 Nginx
echo "【步骤 2/5】配置 Nginx HTTPS..."
cat > /etc/nginx/conf.d/jihua-dev.conf << 'EOF'
# HTTP 重定向到 HTTPS
server {
    listen 3000;
    server_name 152.136.183.181 dev.jihuadz.xin;
    return 301 https://$host:3443$request_uri;
}

# HTTPS 主配置
server {
    listen 3443 ssl;
    server_name 152.136.183.181 dev.jihuadz.xin;
    
    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/jihua-dev.crt;
    ssl_certificate_key /etc/nginx/ssl/jihua-dev.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 网站根目录
    root /var/www/jihua-dev;
    index index.html;
    
    # 日志
    access_log /var/log/nginx/jihua-dev-access.log;
    error_log /var/log/nginx/jihua-dev-error.log;
    
    # SPA 路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # index.html 不缓存
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;
}
EOF
echo "✅ Nginx 配置文件已创建"
echo ""

# 3. 测试配置
echo "【步骤 3/5】测试 Nginx 配置..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败"
    nginx -t
    exit 1
fi
echo ""

# 4. 重启 Nginx
echo "【步骤 4/5】重启 Nginx 服务..."
systemctl restart nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx 服务已重启"
else
    echo "❌ Nginx 服务重启失败"
    systemctl status nginx
    exit 1
fi
echo ""

# 5. 验证端口
echo "【步骤 5/5】验证端口监听..."
sleep 2
if netstat -tlnp | grep -q ":3443"; then
    echo "✅ HTTPS 端口 3443 已监听"
else
    echo "⚠️  端口 3443 未检测到，可能需要等待几秒"
fi

if netstat -tlnp | grep -q ":3000"; then
    echo "✅ HTTP 端口 3000 已监听（重定向）"
else
    echo "⚠️  端口 3000 未检测到"
fi
echo ""

echo "════════════════════════════════════════"
echo "✅ 配置完成！"
echo "════════════════════════════════════════"
echo ""
echo "访问地址："
echo "  HTTPS: https://152.136.183.181:3443"
echo "  HTTP:  http://152.136.183.181:3000 (自动重定向)"
echo ""
echo "⚠️  浏览器提示："
echo "  - 这是自签名证书，会显示'不安全'警告"
echo "  - 点击 '高级' -> '继续访问' 即可"
echo ""

ENDSSH

if [ $? -eq 0 ]; then
    echo.
    echo ════════════════════════════════════════
    echo ✅ HTTPS 配置完成！
    echo ════════════════════════════════════════
    echo.
    echo 🌐 访问地址: https://152.136.183.181:3443
    echo.
    echo 📝 注意事项:
    echo   1. 浏览器会显示证书警告（自签名证书）
    echo   2. 点击 "高级" -^> "继续访问" 即可
    echo   3. 访问 http://152.136.183.181:3000 会自动跳转到 HTTPS
    echo.
else
    echo.
    echo ❌ 配置失败，请检查错误信息
    echo.
fi

pause
