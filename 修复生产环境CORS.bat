@echo off
chcp 65001 >nul
echo ========================================
echo   生产环境 CORS 问题修复部署
echo ========================================
echo.
echo 📋 修复内容:
echo   1. 匿名登录失败不再阻止系统运行
echo   2. 提供明确的 CORS 错误提示
echo   3. 允许用户登录后正常使用系统
echo.
echo ⚠️  注意: 仍需在 CloudBase 控制台配置安全域名
echo 🔗 控制台: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/settings
echo.
pause

echo.
echo [1/3] 构建项目...
call npx vite build
if errorlevel 1 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)
echo ✅ 构建成功

echo.
echo [2/3] 上传到生产服务器...
echo 目标: root@152.136.183.81:/var/www/jihua/
scp -r dist/* root@152.136.183.81:/var/www/jihua/
if errorlevel 1 (
    echo ❌ 上传失败！
    echo 💡 提示: 确保已配置 SSH 密钥或输入密码
    pause
    exit /b 1
)
echo ✅ 上传成功

echo.
echo [3/3] 验证部署...
echo 🌐 生产地址: https://jihuadz.xin
echo 🌐 备用地址: http://152.136.183.81
echo.
echo ✅ 部署完成！
echo.
echo 📋 接下来请:
echo   1. 访问 https://jihuadz.xin
echo   2. 强制刷新 (Ctrl + F5)
echo   3. 打开控制台 (F12)
echo   4. 观察日志 (应该看到 CORS 警告但无错误弹窗)
echo   5. 测试登录功能
echo.
echo ⚠️  重要: 请尽快在 CloudBase 控制台添加安全域名:
echo   - http://152.136.183.81
echo   - https://152.136.183.81
echo   - http://jihuadz.xin
echo   - https://jihuadz.xin
echo.
pause
