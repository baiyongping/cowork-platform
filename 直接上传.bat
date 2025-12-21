@echo off
chcp 65001 >nul
title 直接上传到服务器

echo ================================================
echo   际华系统 - 直接上传（跳过构建）
echo ================================================
echo.

cd /d E:\cowork

echo [1/3] 检查 dist 目录...
if not exist "dist" (
    echo ❌ dist 目录不存在！
    echo 请先运行: npm run build
    pause
    exit /b 1
)
if not exist "dist\index.html" (
    echo ❌ dist 目录中没有 index.html！
    echo 请先运行: npm run build
    pause
    exit /b 1
)
echo ✅ dist 目录检查通过

echo.
echo [2/3] 上传文件到服务器...
echo 目标: root@152.136.183.181:/var/www/jihua/
echo.

scp -r dist\* root@152.136.183.181:/var/www/jihua/

if %errorlevel% neq 0 (
    echo.
    echo ❌ 上传失败！
    echo.
    echo 可能的原因：
    echo   1. SSH 连接失败（网络问题）
    echo   2. 服务器密码错误
    echo   3. 服务器路径不存在
    echo.
    echo 💡 建议：
    echo   - 检查网络连接
    echo   - 确认服务器密码
    echo   - 尝试手动 SSH 登录测试
    echo.
    pause
    exit /b 1
)

echo ✅ 文件上传成功

echo.
echo [3/3] 设置文件权限...
ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua && chmod -R 755 /var/www/jihua && ls -la /var/www/jihua/"

if %errorlevel% neq 0 (
    echo ⚠️  权限设置可能失败
    echo 但文件已上传，可以尝试访问
) else (
    echo ✅ 权限设置完成
)

echo.
echo ================================================
echo   🎉 部署完成！
echo ================================================
echo.
echo 🌐 访问地址: http://jihuadz.xin
echo.
echo 💡 提示：
echo   - 使用 Ctrl+F5 强制刷新浏览器
echo   - 如果看到旧内容，清除浏览器缓存
echo   - 等待 1-2 分钟后再访问
echo.
echo 📊 部署信息：
echo   - 服务器: 152.136.183.181
echo   - 目录: /var/www/jihua
echo   - 时间: %date% %time%
echo.

pause
