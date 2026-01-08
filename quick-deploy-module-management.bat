@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   module-management 云函数快速部署工具
echo ==========================================
echo.
echo 📦 云函数信息:
echo    名称: module-management
echo    位置: cloudfunctions\module-management
echo    环境: cowork-9gg9oocb516be5fb
echo.
echo ==========================================
echo.
echo 🚀 请选择部署方式:
echo.
echo   [1] 打开 CloudBase 控制台（推荐）
echo   [2] 打开部署工具页面
echo   [3] 查看部署指南文档
echo   [4] 退出
echo.
echo ==========================================
echo.

set /p choice=请输入选项 (1-4): 

if "%choice%"=="1" (
    echo.
    echo ✅ 正在打开 CloudBase 控制台...
    start https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/scf
    echo.
    echo 📋 部署步骤提示:
    echo    1. 点击"新建云函数"
    echo    2. 函数名称: module-management
    echo    3. 运行环境: Nodejs 16.13
    echo    4. 上传代码: cloudfunctions\module-management\
    echo    5. 点击"确定"完成部署
    echo.
    pause
) else if "%choice%"=="2" (
    echo.
    echo ✅ 正在打开部署工具页面...
    start http://localhost:5173/deploy-module-function.html
    echo.
    echo 💡 提示: 请先确保开发服务器正在运行
    echo.
    pause
) else if "%choice%"=="3" (
    echo.
    echo ✅ 正在打开部署指南文档...
    start notepad module-management-deploy-guide.md
    echo.
    pause
) else if "%choice%"=="4" (
    echo.
    echo 👋 再见！
    echo.
    exit
) else (
    echo.
    echo ❌ 无效选项，请重新运行脚本
    echo.
    pause
)
