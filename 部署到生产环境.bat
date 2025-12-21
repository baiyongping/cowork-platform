@echo off
chcp 65001 >nul
title 部署到生产环境

echo ========================================
echo   际华系统 - 部署到生产环境
echo ========================================
echo.
echo ⚠️  警告: 即将部署到生产环境！
echo ⚠️  这将影响所有正在使用系统的用户
echo.
set /p CONFIRM="确认部署到生产环境? (输入 YES 继续): "
if not "%CONFIRM%"=="YES" (
    echo.
    echo ❌ 已取消部署
    pause
    exit /b 1
)

echo.
echo [1/4] 清理旧构建...
if exist dist rmdir /s /q dist

echo [2/4] 构建生产版本...
call npx vite build --mode production
if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

echo [3/4] 上传到生产服务器...
scp -r dist/* root@152.136.183.181:/var/www/jihua/
if %errorlevel% neq 0 (
    echo ❌ 上传失败！
    pause
    exit /b 1
)

echo [4/4] 设置权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua"

echo.
echo ========================================
echo   ✅ 生产环境部署完成！
echo ========================================
echo.
echo 🌐 访问地址:
echo    https://152.136.183.181
echo    或 https://jihuadz.xin
echo.
echo ⚠️  重要: 请立即进行以下验证:
echo    1. 登录功能是否正常
echo    2. 核心模块是否可用
echo    3. 数据显示是否正常
echo    4. 权限控制是否正确
echo.
echo 💡 提示: 使用 Ctrl+F5 强制刷新
echo.
pause
