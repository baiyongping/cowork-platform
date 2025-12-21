@echo off
chcp 65001 >nul
echo.
echo ===================================
echo   快速部署到 Parasaga 生产环境
echo ===================================
echo.
echo 🔧 服务器: 152.136.183.181:8010
echo 🔧 环境ID: parasaga-5g6ibiua4b9422eb
echo.

echo 📦 第1步: 构建项目...
call npx vite build
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

echo 🚀 第2步: 上传到服务器...
scp -i "C:\Users\Administrator\.ssh\id_rsa" -r dist\* root@152.136.183.181:/tmp/dist-parasaga-new/
if %errorlevel% neq 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)
echo ✅ 上传完成
echo.

echo 📂 第3步: 部署到 Web 目录...
ssh -i "C:\Users\Administrator\.ssh\id_rsa" root@152.136.183.181 "rm -rf /var/www/jihua-parasaga/* && cp -r /tmp/dist-parasaga-new/* /var/www/jihua-parasaga/ && chown -R nginx:nginx /var/www/jihua-parasaga && chmod -R 755 /var/www/jihua-parasaga && echo '✅ 部署完成' && ls -la /var/www/jihua-parasaga/ | head -10"
if %errorlevel% neq 0 (
    echo ❌ 部署失败！
    pause
    exit /b 1
)
echo.

echo 🎉 部署成功！
echo.
echo 访问地址: https://152.136.183.181:8010
echo 请按 Ctrl+F5 强制刷新浏览器
echo.
pause
