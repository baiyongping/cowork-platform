@echo off
chcp 65001 >nul
title 版本发布管理

echo ========================================
echo   际华系统 - 版本发布管理
echo ========================================
echo.

REM 检查是否有未提交的更改
git status --short > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 未初始化！请先运行: git init
    pause
    exit /b 1
)

REM 显示当前状态
echo 📊 当前状态:
git status --short
echo.

REM 输入版本号
set /p VERSION="请输入版本号 (例如: 2.0.0): "
if "%VERSION%"=="" (
    echo ❌ 版本号不能为空！
    pause
    exit /b 1
)

REM 输入版本说明
set /p MESSAGE="请输入版本说明 (例如: 主体功能完成): "
if "%MESSAGE%"=="" (
    set MESSAGE=版本 %VERSION% 发布
)

echo.
echo ========================================
echo   准备发布 v%VERSION%
echo ========================================
echo 版本号: v%VERSION%
echo 说明: %MESSAGE%
echo.
set /p CONFIRM="确认发布? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo ❌ 已取消发布
    pause
    exit /b 1
)

echo.
echo [1/5] 添加所有更改...
git add .

echo [2/5] 提交更改...
git commit -m "release: v%VERSION% - %MESSAGE%"

echo [3/5] 创建版本标签...
git tag -a v%VERSION% -m "版本 %VERSION% - %MESSAGE%"

echo [4/5] 创建备份分支...
git branch backup/v%VERSION%

echo [5/5] 推送到远程（如有配置）...
git push origin main 2>nul
git push origin v%VERSION% 2>nul
git push origin backup/v%VERSION% 2>nul

echo.
echo ========================================
echo   ✅ 版本 v%VERSION% 发布完成！
echo ========================================
echo.
echo 📦 已创建:
echo   - Git 标签: v%VERSION%
echo   - 备份分支: backup/v%VERSION%
echo   - 提交记录: %MESSAGE%
echo.
echo 💡 下一步:
echo   1. 运行 快速升级.bat 部署到服务器
echo   2. 访问 https://152.136.183.181 验证
echo.
pause
