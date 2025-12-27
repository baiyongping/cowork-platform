@echo off
chcp 65001 >nul
echo ====================================
echo    际华协同办公平台 - Git 仓库初始化
echo ====================================
echo.

cd /d "%~dp0"

echo [1/5] 初始化 Git 仓库...
git init
if errorlevel 1 (
    echo ❌ 初始化失败！请检查 Git 是否已安装
    pause
    exit /b 1
)
echo ✅ Git 仓库初始化成功

echo.
echo [2/5] 查看仓库状态...
git status
echo.

echo [3/5] 添加所有文件到暂存区...
git add .
echo ✅ 文件已添加到暂存区

echo.
echo [4/5] 创建初始提交...
git commit -m "初始提交：际华协同办公平台基础框架"
if errorlevel 1 (
    echo ⚠️ 提交失败，可能是没有文件变更
) else (
    echo ✅ 初始提交成功
)

echo.
echo [5/5] 查看提交历史...
git log --oneline -n 5
echo.

echo ====================================
echo ✅ Git 仓库初始化完成！
echo ====================================
echo.
echo 📋 下一步操作：
echo   1. 查看状态：git status
echo   2. 查看历史：git log
echo   3. 创建分支：git branch dev
echo   4. 切换分支：git checkout dev
echo.
echo 📚 更多帮助请查看：Git配置说明.md
echo.
pause
