@echo off
chcp 65001 >nul
title 际华协同办公平台 - 环境检查

echo.
echo ==========================================
echo    际华协同办公平台 - 环境快速检查
echo ==========================================
echo.

cd /d "%~dp0"

echo 【Node.js】
node --version 2>nul && echo ✅ 已安装 || echo ❌ 未安装
echo.

echo 【npm】
npm --version 2>nul && echo ✅ 已安装 || echo ❌ 未安装
echo.

echo 【Git】
git --version 2>nul && echo ✅ 已安装 || echo ⚠️  未安装或需重启终端
echo.

echo 【项目依赖】
if exist "node_modules\" (
    echo ✅ 已安装
) else (
    echo ❌ 未安装，请运行: npm install
)
echo.

echo ==========================================
echo 检查完成！
echo.
echo 配置帮助：
echo   查看 环境配置指南.md 了解详细说明
echo   运行 环境配置.ps1 自动配置环境
echo ==========================================
echo.
pause
