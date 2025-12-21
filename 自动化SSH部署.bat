@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ================================================
echo 际华定制协同办公系统 - 自动化部署
echo ================================================
echo.

set SERVER=152.136.183.181
set USER=root
set PASSWORD=Lenovo1680!

echo [INFO] 正在连接到服务器 %SERVER%...
echo.

REM 使用 plink 自动化 SSH（需要安装 PuTTY）
where plink >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未找到 plink 工具
    echo.
    echo 请使用以下方式之一:
    echo.
    echo 方式1: 安装 PuTTY
    echo   下载地址: https://www.putty.org/
    echo.
    echo 方式2: 手动执行
    echo   1. 打开 PowerShell
    echo   2. 执行: ssh root@152.136.183.181
    echo   3. 输入密码: Lenovo1680!
    echo   4. 执行以下命令...
    echo.
    pause
    
    echo.
    echo ================================================
    echo 手动执行命令列表
    echo ================================================
    echo.
    echo # 1. 更新系统
    echo dnf update -y --skip-broken
    echo.
    echo # 2. 安装软件
    echo dnf install -y wget curl git vim unzip tar nginx certbot python3-certbot-nginx
    echo.
    echo # 3. 创建目录
    echo mkdir -p /var/www/jihua
    echo chown -R nginx:nginx /var/www/jihua
    echo chmod -R 755 /var/www/jihua
    echo.
    echo # 4. 配置 Nginx
    echo cat ^> /etc/nginx/conf.d/jihuadz.conf ^<^< 'EOF'
    echo server {
    echo     listen 80;
    echo     server_name jihuadz.xin www.jihuadz.xin;
    echo     root /var/www/jihua;
    echo     index index.html;
    echo     location / {
    echo         try_files $uri $uri/ /index.html;
    echo     }
    echo     gzip on;
    echo }
    echo EOF
    echo.
    echo # 5. 配置防火墙
    echo firewall-cmd --permanent --add-service=http
    echo firewall-cmd --permanent --add-service=https
    echo firewall-cmd --reload
    echo.
    echo # 6. 创建测试页面
    echo echo "^<h1^>测试页面^</h1^>" ^> /var/www/jihua/index.html
    echo.
    echo # 7. 启动服务
    echo systemctl enable nginx
    echo systemctl restart nginx
    echo nginx -t
    echo systemctl status nginx
    echo.
    echo ================================================
    echo.
    pause
    exit /b 0
)

echo [INFO] 找到 plink 工具，开始自动部署...
echo.

REM 使用 plink 执行命令
echo [1/7] 更新系统...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "dnf update -y --skip-broken"

echo.
echo [2/7] 安装软件...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "dnf install -y wget curl git vim nginx certbot python3-certbot-nginx"

echo.
echo [3/7] 创建目录...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "mkdir -p /var/www/jihua && chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua"

echo.
echo [4/7] 配置 Nginx...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "cat > /etc/nginx/conf.d/jihuadz.conf << 'EOF'
server {
    listen 80;
    server_name jihuadz.xin www.jihuadz.xin;
    root /var/www/jihua;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
}
EOF"

echo.
echo [5/7] 配置防火墙...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "firewall-cmd --permanent --add-service=http && firewall-cmd --permanent --add-service=https && firewall-cmd --reload"

echo.
echo [6/7] 创建测试页面...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "echo '<h1>测试成功</h1>' > /var/www/jihua/index.html"

echo.
echo [7/7] 启动 Nginx...
echo yes | plink -ssh %USER%@%SERVER% -pw %PASSWORD% "systemctl enable nginx && systemctl restart nginx && nginx -t"

echo.
echo ================================================
echo 部署完成！
echo ================================================
echo.
echo 访问地址: http://jihuadz.xin
echo.
pause
