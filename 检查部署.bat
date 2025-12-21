@echo off
chcp 65001 >nul
title 检查部署状态

echo ================================================
echo   际华系统 - 部署状态检查
echo ================================================
echo.

echo [1/4] 检查本地构建文件...
if exist "dist\index.html" (
    echo ✅ 本地构建文件存在
) else (
    echo ❌ 本地构建文件不存在
)

echo.
echo [2/4] 检查服务器连接...
ping -n 1 152.136.183.181 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 服务器连接正常
) else (
    echo ❌ 服务器连接失败
)

echo.
echo [3/4] 检查服务器文件...
echo 正在连接服务器...
ssh root@152.136.183.181 "ls -lh /var/www/jihua/index.html 2>/dev/null"
if %errorlevel% equ 0 (
    echo ✅ 服务器文件存在
) else (
    echo ❌ 服务器文件不存在或无法访问
)

echo.
echo [4/4] 访问地址信息...
echo.
echo 🌐 生产环境:
echo    http://jihuadz.xin
echo    http://152.136.183.181
echo.
echo 💡 提示:
echo    - 使用 Ctrl+F5 强制刷新
echo    - 清除浏览器缓存
echo    - 等待 1-2 分钟后访问
echo.

pause
