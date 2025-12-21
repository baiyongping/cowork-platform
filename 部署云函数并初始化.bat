@echo off
chcp 65001 > nul
echo ========================================
echo   部署初始化云函数并执行
echo ========================================
echo.

echo [1/2] 部署云函数...
call cloudbase functions:deploy initDatabase --envId cowork-9gg9oocb516be5fb

if %errorlevel% neq 0 (
    echo ❌ 部署失败
    pause
    exit /b 1
)

echo.
echo ✅ 部署成功
echo.

echo [2/2] 调用云函数初始化数据库...
call cloudbase functions:invoke initDatabase --envId cowork-9gg9oocb516be5fb

if %errorlevel% neq 0 (
    echo ❌ 初始化失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   🎉 初始化完成！
echo ========================================
echo.
echo 📋 管理员账号:
echo    用户名: admin
echo    密码: admin123
echo.
echo 🌐 CloudBase 控制台:
echo    https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc
echo.
pause
