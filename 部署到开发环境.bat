@echo off
chcp 65001 >nul
title 部署到开发环境

echo ========================================
echo   际华系统 - 部署到开发环境
echo ========================================
echo.

echo [1/4] 清理旧构建...
if exist dist-dev rmdir /s /q dist-dev

echo [2/4] 构建开发版本...
call npx vite build --mode development
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

echo [3/4] 上传到开发服务器...
scp -r dist-dev/* root@152.136.183.181:/var/www/jihua-dev/
if %errorlevel% neq 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)

echo [4/4] 设置权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua-dev && chmod -R 755 /var/www/jihua-dev"

echo.
echo ========================================
echo   ✅ 开发环境部署完成！
echo ========================================
echo.
echo 🌐 访问地址:
echo    http://152.136.183.181:3000
echo    或 http://dev.jihuadz.xin:3000
echo.
echo 💡 提示: 使用 Ctrl+F5 强制刷新
echo ℹ️  这是开发环境，可以随意测试
echo.
pause
