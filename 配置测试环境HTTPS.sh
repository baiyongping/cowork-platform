#!/bin/bash

echo "════════════════════════════════════════"
echo "配置测试环境 HTTPS（自签名证书）"
echo "════════════════════════════════════════"
echo ""

# 1. 生成自签名证书
echo "【步骤 1/4】生成自签名 SSL 证书..."
mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout jihua-dev.key \
  -out jihua-dev.crt \
  -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Jihua/CN=152.136.183.181"

echo "✅ SSL 证书已生成"
echo ""

# 2. 修改 Nginx 配置支持 HTTPS
echo "【步骤 2/4】配置 Nginx HTTPS..."
cat > /etc/nginx/conf.d/jihua-dev.conf << 'EOF'
# HTTP (重定向到 HTTPS)
server {
    listen 3000;
    server_name 152.136.183.181 dev.jihuadz.xin;
    return 301 https://$host:3443$request_uri;
}

# HTTPS
server {
    listen 3443 ssl;
    server_name 152.136.183.181 dev.jihuadz.xin;
    
    ssl_certificate /etc/nginx/ssl/jihua-dev.crt;
    ssl_certificate_key /etc/nginx/ssl/jihua-dev.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    root /var/www/jihua-dev;
    index index.html;
    
    access_log /var/log/nginx/jihua-dev-access.log;
    error_log /var/log/nginx/jihua-dev-error.log;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    gzip on;
    gzip_types text/css application/javascript application/json;
}
EOF

echo "✅ Nginx HTTPS 配置已创建"
echo ""

# 3. 测试配置
echo "【步骤 3/4】测试 Nginx 配置..."
nginx -t

# 4. 重新加载
echo ""
echo "【步骤 4/4】重新加载 Nginx..."
systemctl reload nginx

echo ""
echo "════════════════════════════════════════"
echo "✅ 配置完成！"
echo "════════════════════════════════════════"
echo ""
echo "访问地址: https://152.136.183.181:3443"
echo ""
echo "⚠️  注意："
echo "1. 这是自签名证书，浏览器会显示警告"
echo "2. 点击'高级' -> '继续访问'即可"
echo "3. HTTP (3000) 会自动重定向到 HTTPS (3443)"
echo ""
