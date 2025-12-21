@echo off
chcp 65001 >nul
echo ========================================
echo 际华协同办公平台 - 测试环境部署
echo ========================================
echo.
echo 目标: http://152.136.183.81:3000
echo 路径: /var/www/jihua-dev/
echo CloudBase环境: jihua-oa-dev-3goht9irae4d949f
echo.

echo [1/3] 清理旧的dist目录...
if exist dist (
    rmdir /s /q dist
    echo ✓ 已清理
) else (
    echo ✓ 无需清理
)
echo.

echo [2/3] 构建项目...
call npx vite build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✓ 构建成功
echo.

echo [3/3] 上传到测试服务器...
echo 正在上传到 152.136.183.81:/var/www/jihua-dev/ ...
scp -o StrictHostKeyChecking=no -r dist\* root@152.136.183.81:/var/www/jihua-dev/
if errorlevel 1 (
    echo ❌ 上传失败
    pause
    exit /b 1
)
echo ✓ 上传成功
echo.

echo ========================================
echo ✅ 部署完成！
echo ========================================
echo.
echo 访问地址: http://152.136.183.81:3000
echo.
echo 提示:
echo - 首次访问请使用 Ctrl+F5 强制刷新
echo - CloudBase环境: jihua-oa-dev-3goht9irae4d949f
echo - 如需查看日志，请按F12打开浏览器控制台
echo.
pause
