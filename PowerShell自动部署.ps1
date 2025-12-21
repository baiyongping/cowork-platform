# ================================================
# 际华定制协同办公系统 - PowerShell 自动部署脚本
# ================================================

$ErrorActionPreference = "Continue"

$SERVER = "152.136.183.181"
$USER = "root"
$PASSWORD = "Lenovo1680!"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "际华定制协同办公系统 - 自动化部署" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 创建部署脚本
$deployScript = @'
#!/bin/bash
set -e
echo "====== 开始部署 ======"
echo "[1/7] 更新系统..."
dnf update -y --skip-broken 2>&1 | tail -5
echo "[2/7] 安装软件..."
dnf install -y wget curl git vim nginx certbot python3-certbot-nginx 2>&1 | tail -5
echo "[3/7] 创建目录..."
mkdir -p /var/www/jihua
chown -R nginx:nginx /var/www/jihua
chmod -R 755 /var/www/jihua
echo "[4/7] 配置 Nginx..."
cat > /etc/nginx/conf.d/jihuadz.conf << 'EOF'
server {
    listen 80;
    server_name jihuadz.xin www.jihuadz.xin;
    root /var/www/jihua;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
}
EOF
echo "[5/7] 配置防火墙..."
firewall-cmd --permanent --add-service=http 2>&1
firewall-cmd --permanent --add-service=https 2>&1
firewall-cmd --reload 2>&1
echo "[6/7] 创建测试页面..."
cat > /var/www/jihua/index.html << 'HTML'
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>部署成功</title>
<style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;
background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-family:sans-serif;}
.container{text-align:center;padding:40px;background:rgba(255,255,255,0.1);
border-radius:20px;}</style></head><body><div class="container">
<h1>🚀 部署成功！</h1><p>际华定制协同办公系统</p><p>域名: jihuadz.xin</p>
</div></body></html>
HTML
echo "[7/7] 启动 Nginx..."
systemctl enable nginx 2>&1
systemctl restart nginx 2>&1
nginx -t 2>&1
echo "====== 部署完成 ======"
'@

# 保存脚本到本地
$deployScript | Out-File -FilePath "E:\cowork\temp_deploy.sh" -Encoding UTF8 -NoNewline

Write-Host "[INFO] 正在连接服务器..." -ForegroundColor Green
Write-Host ""

# 上传并执行脚本
try {
    Write-Host "[步骤 1/3] 上传部署脚本..." -ForegroundColor Yellow
    & scp "E:\cowork\temp_deploy.sh" "${USER}@${SERVER}:/root/deploy.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 脚本上传成功" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "[步骤 2/3] 执行部署脚本（这将需要几分钟）..." -ForegroundColor Yellow
        & ssh "${USER}@${SERVER}" "chmod +x /root/deploy.sh && bash /root/deploy.sh"
        
        Write-Host ""
        Write-Host "[步骤 3/3] 验证部署..." -ForegroundColor Yellow
        & ssh "${USER}@${SERVER}" "systemctl status nginx --no-pager | head -5"
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "部署完成！" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 访问地址: http://jihuadz.xin" -ForegroundColor Cyan
        Write-Host ""
    } else {
        throw "SCP 上传失败"
    }
} catch {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "自动部署失败，请手动操作" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请执行以下命令:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ssh ${USER}@${SERVER}" -ForegroundColor Cyan
    Write-Host "密码: ${PASSWORD}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "然后在服务器上执行:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $deployScript -ForegroundColor Gray
}

# 清理临时文件
if (Test-Path "E:\cowork\temp_deploy.sh") {
    Remove-Item "E:\cowork\temp_deploy.sh" -Force
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
