@echo off
echo ========================================
echo 部署到测试环境 (Lighthouse)
echo ========================================
echo.

echo [1/2] 检查构建文件...
if not exist "dist\index.html" (
    echo ❌ 构建文件不存在，请先运行 npx vite build
    pause
    exit /b 1
)
echo ✅ 构建文件存在

echo.
echo [2/2] 上传到服务器...
scp -r dist\* root@152.136.183.181:/var/www/jihua-dev/

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 部署成功！
    echo ========================================
    echo.
    echo 测试环境地址: http://152.136.183.181:3000
    echo HTTPS地址: https://152.136.183.181:3443
    echo.
    echo 提示: 访问时请按 Ctrl + F5 强制刷新
    echo ========================================
) else (
    echo.
    echo ❌ 部署失败，请检查网络连接和服务器权限
)

echo.
pause
