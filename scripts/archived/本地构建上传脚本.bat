@echo off
chcp 65001 >nul
title 部署到测试环境

echo ========================================
echo   际华系统 - 部署到测试环境
echo ========================================
echo.

REM 1. 确认dist目录存在
if not exist dist (
    echo ❌ dist目录不存在，请先构建项目
    echo 运行: npx vite build
    pause
    exit /b 1
)

echo [1/2] 上传文件到测试服务器...
echo 目标: /var/www/jihua-dev/
echo.
scp -r dist/* root@152.136.183.181:/var/www/jihua-dev/

echo.
echo [2/2] 设置权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua-dev && chmod -R 755 /var/www/jihua-dev"

echo.
echo ========================================
echo   ✅ 测试环境部署完成！
echo ========================================
echo.
echo 🌐 访问地址:
echo    HTTP:  http://152.136.183.181:3000
echo    备用:  http://dev.jihuadz.xin:3000
echo.
echo 💡 提示: 使用 Ctrl+F5 强制刷新
echo ℹ️  这是测试环境，可以随意测试
echo.
pause
