@echo off
chcp 65001 >nul
title 快速升级部署

echo ========================================
echo   际华系统 - 快速升级部署
echo ========================================
echo.

REM 1. 构建（跳过类型检查加快速度）
echo [1/3] 构建中（跳过类型检查）...
call npx vite build
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo ✅ 构建完成
echo.

REM 2. 上传
echo [2/3] 上传中...
scp -r dist/* root@152.136.183.181:/var/www/jihua/
if %errorlevel% neq 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)
echo ✅ 上传完成
echo.

REM 3. 设置权限（静态文件无需重启Nginx）
echo [3/3] 设置文件权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua"
echo ✅ 完成（静态文件已生效，无需重启Nginx）
echo.

echo ========================================
echo   🎉 升级完成！
echo ========================================
echo.
echo 🌐 访问: https://152.136.183.181
echo 💡 请按 Ctrl+F5 强制刷新浏览器
echo.
pause
