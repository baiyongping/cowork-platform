#!/bin/bash
# 配置测试环境Nginx - 在服务器上运行

echo "=========================================="
echo "  配置测试环境Nginx"
echo "=========================================="
echo

# 1. 创建Nginx配置文件
echo "[1/4] 创建Nginx配置..."
cat > /etc/nginx/conf.d/jihua-dev.conf << 'EOF'
server {
    listen 3000;
    server_name 152.136.183.181 dev.jihuadz.xin;
    
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

# 2. 测试配置
echo "[2/4] 测试Nginx配置..."
nginx -t

# 3. 重新加载Nginx
echo "[3/4] 重新加载Nginx..."
systemctl reload nginx

# 4. 检查端口监听
echo "[4/4] 检查端口监听..."
netstat -tlnp | grep -E ':(80|443|3000)'

echo
echo "=========================================="
echo "  ✅ 配置完成！"
echo "=========================================="
echo
echo "🌐 访问地址:"
echo "   HTTP: http://152.136.183.181:3000"
echo
echo "💡 提示: 使用 Ctrl+F5 强制刷新"
echo
