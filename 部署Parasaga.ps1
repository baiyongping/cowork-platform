Write-Host "=== 部署 Parasaga 生产环境到服务器 ===" -ForegroundColor Green
Write-Host ""

$SERVER = "152.136.183.181"
$WEB_DIR = "/var/www/jihua-parasaga"

# 1. 上传 Nginx 配置
Write-Host "1. 上传 Nginx 配置文件..." -ForegroundColor Cyan
scp nginx-parasaga.conf root@${SERVER}:/etc/nginx/sites-available/jihua-parasaga.conf

# 2. 创建软链接
Write-Host "2. 创建 Nginx 软链接..." -ForegroundColor Cyan
ssh root@${SERVER} "ln -sf /etc/nginx/sites-available/jihua-parasaga.conf /etc/nginx/sites-enabled/jihua-parasaga.conf"

# 3. 创建 Web 目录
Write-Host "3. 创建 Web 目录..." -ForegroundColor Cyan
ssh root@${SERVER} "mkdir -p ${WEB_DIR}"

# 4. 上传 dist 文件
Write-Host "4. 上传 Web 文件..." -ForegroundColor Cyan
scp -r dist/* root@${SERVER}:${WEB_DIR}/

# 5. 设置权限
Write-Host "5. 设置文件权限..." -ForegroundColor Cyan
ssh root@${SERVER} "chown -R nginx:nginx ${WEB_DIR}; chmod -R 755 ${WEB_DIR}"

# 6. 测试 Nginx 配置
Write-Host "6. 测试 Nginx 配置..." -ForegroundColor Cyan
ssh root@${SERVER} "nginx -t"

# 7. 重启 Nginx
Write-Host "7. 重启 Nginx..." -ForegroundColor Cyan
ssh root@${SERVER} "systemctl reload nginx"

# 8. 检查端口监听
Write-Host "8. 检查 8010 端口..." -ForegroundColor Cyan
ssh root@${SERVER} "netstat -tlnp | grep :8010"

Write-Host ""
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址: https://152.136.183.181:8010" -ForegroundColor Yellow
