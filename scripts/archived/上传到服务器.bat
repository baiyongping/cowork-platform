@echo off
chcp 65001 >nul
title 际华系统 - 自动构建上传

echo ================================================
echo   际华定制协同办公系统 - 自动部署
echo ================================================
echo.

cd /d E:\cowork

echo [1/5] 检查环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未安装 Node.js，请先安装！
    pause
    exit /b 1
)
echo ✅ Node.js 环境正常

echo.
echo [2/5] 询问操作...
set /p BUILD_CONFIRM="是否需要重新构建项目？(Y/N，默认Y): "
if /i "%BUILD_CONFIRM%"=="" set BUILD_CONFIRM=Y
if /i "%BUILD_CONFIRM%"=="N" goto SKIP_BUILD

echo.
echo [3/5] 检查依赖...
if not exist "node_modules" (
    echo ⚠️  未发现 node_modules 目录
    set /p INSTALL_DEPS="是否安装依赖？(Y/N): "
    if /i "!INSTALL_DEPS!"=="Y" (
        echo 正在安装依赖...
        call npm install
        if %errorlevel% neq 0 (
            echo ❌ 依赖安装失败！
            pause
            exit /b 1
        )
    )
) else (
    echo ✅ 依赖已存在
)

echo.
echo [4/5] 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败！请检查错误信息
    pause
    exit /b 1
)
echo ✅ 构建完成

:SKIP_BUILD
echo.
echo [5/5] 上传到服务器...

if not exist "dist" (
    echo ❌ dist 目录不存在，请先构建项目！
    pause
    exit /b 1
)

echo 正在上传文件到服务器 152.136.183.181...
scp -r dist\* root@152.136.183.181:/var/www/jihua/

if %errorlevel% neq 0 (
    echo ❌ 上传失败！请检查：
    echo   1. SSH 连接是否正常
    echo   2. 服务器密码是否正确
    echo   3. 网络连接是否正常
    pause
    exit /b 1
)

echo ✅ 文件上传成功

echo.
echo 正在设置服务器文件权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua"

if %errorlevel% neq 0 (
    echo ⚠️  权限设置可能失败，但不影响访问
) else (
    echo ✅ 权限设置完成
)

echo.
echo ================================================
echo   🎉 部署完成！
echo ================================================
echo.
echo 访问地址: http://jihuadz.xin
echo.
echo 💡 提示：
echo   - CDN 可能有 3-5 分钟缓存
echo   - 首次访问可使用 Ctrl+F5 强制刷新
echo   - 如果看到旧版本，等待几分钟后再试
echo.

pause
