@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==================================
echo   际华协同办公管理平台 - 一键部署
echo ==================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装 Node.js
    echo 请访问 https://nodejs.org 下载安装
    pause
    exit /b 1
)

:: 第一步：清理旧构建
echo [1/6] 清理旧构建...
if exist "dist" (
    rmdir /s /q dist
    echo   ✅ 已清理旧构建
) else (
    echo   ⚠️  无旧构建文件
)

:: 第二步：安装依赖
echo [2/6] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo   ❌ 依赖安装失败
    pause
    exit /b 1
)
echo   ✅ 依赖安装完成

:: 第三步：构建前端
echo [3/6] 构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo   ❌ 前端构建失败
    pause
    exit /b 1
)
echo   ✅ 前端构建完成

:: 第四步：构建后端
echo [4/6] 构建后端...
cd server
call npm install
call npm run build
cd ..
if %errorlevel% neq 0 (
    echo   ❌ 后端构建失败
    pause
    exit /b 1
)
echo   ✅ 后端构建完成

:: 第五步：上传前端到服务器
echo [5/6] 上传前端到服务器...
echo   正在连接服务器...
scp -r dist/* root@152.136.183.181:/var/www/jihua/
if %errorlevel% neq 0 (
    echo   ❌ 前端上传失败
    echo   请检查 SSH 连接和服务器配置
    pause
    exit /b 1
)
echo   ✅ 前端上传成功

:: 第六步：上传并重启后端服务
echo [6/6] 上传并重启后端服务...
scp -r server\dist\* root@152.136.183.181:/root/jihua-backend/
ssh root@152.136.183.181 "pm2 restart jihua-api || pm2 start /root/jihua-backend/index.js --name jihua-api"
if %errorlevel% neq 0 (
    echo   ❌ 后端部署失败
    pause
    exit /b 1
)
echo   ✅ 后端部署成功

echo.
echo ==================================
echo   🎉 部署完成！
echo ==================================
echo.
echo 访问地址:
echo   HTTP:  http://152.136.183.181
echo   HTTPS: https://152.136.183.181
echo.
echo 提示: HTTPS 首次访问需要点击 "高级" -^> "继续前往"
echo.
echo 建议: 使用 Ctrl+F5 强制刷新浏览器缓存
echo.
pause
