@echo off
chcp 65001 >nul
title 一键升级部署 v2.0

echo ========================================
echo   际华系统 - 一键升级部署
echo ========================================
echo.

REM 1. 构建
echo [1/3] 正在构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

REM 2. 上传
echo [2/3] 正在上传到服务器...
scp -r dist/* root@152.136.183.181:/var/www/jihua/
if %errorlevel% neq 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)
echo ✅ 上传完成
echo.

REM 3. 重启服务
echo [3/3] 正在重启服务...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua && systemctl restart nginx"
if %errorlevel% neq 0 (
    echo ❌ 重启失败！
    pause
    exit /b 1
)
echo ✅ 服务重启完成
echo.

echo ========================================
echo   🎉 部署完成！
echo ========================================
echo.
echo 🌐 访问地址:
echo    HTTPS: https://152.136.183.181
echo    HTTP:  http://jihuadz.xin
echo.
echo 💡 提示: 请使用 Ctrl+F5 强制刷新浏览器
echo.
pause
