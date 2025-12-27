@echo off
chcp 65001 >nul
title Git 安装状态检查

echo.
echo ==========================================
echo         Git 安装状态检查
echo ==========================================
echo.

echo [1] 检查 Git 命令是否可用...
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git 命令不可用
    echo.
) else (
    echo ✅ Git 命令可用
    git --version
    echo.
    goto :configured
)

echo [2] 检查 Git 是否已安装（常见路径）...
if exist "C:\Program Files\Git\cmd\git.exe" (
    echo ✅ 找到 Git 安装文件：C:\Program Files\Git\cmd\git.exe
    echo.
    echo ⚠️  但命令行不可用，可能原因：
    echo    1. 需要重启终端
    echo    2. 环境变量未生效
    echo    3. 需要重新登录 Windows
    echo.
    goto :needrestart
) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    echo ✅ 找到 Git 安装文件：C:\Program Files (x86)\Git\cmd\git.exe
    echo.
    echo ⚠️  但命令行不可用，需要重启终端
    echo.
    goto :needrestart
) else (
    echo ❌ 未找到 Git 安装文件
    echo.
    goto :notinstalled
)

:notinstalled
echo [3] Git 未安装或安装中...
echo.
echo 📋 可能的情况：
echo    1. 🔄 winget 正在后台安装（需要等待）
echo    2. ❌ 安装失败
echo    3. ❌ 从未安装
echo.
echo 💡 建议操作：
echo    方案一：等待 2 分钟后重新检查
echo    方案二：手动安装 Git
echo           下载地址：https://git-scm.com/download/win
echo    方案三：使用 winget 安装
echo           命令：winget install -e --id Git.Git
echo.
goto :end

:needrestart
echo 💡 解决方案：
echo    1. ✅ 关闭当前终端窗口
echo    2. ✅ 重新打开终端（CMD 或 PowerShell）
echo    3. ✅ 再次运行：git --version
echo.
echo 📝 如果重启后仍不可用：
echo    - 重新启动电脑
echo    - 手动添加到 PATH：
echo      C:\Program Files\Git\cmd
echo.
goto :end

:configured
echo [3] 检查 Git 配置...
git config --global user.name >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Git 用户名未配置
    echo.
    echo 💡 请运行以下命令配置：
    echo    git config --global user.name "你的名字"
    echo    git config --global user.email "你的邮箱"
    echo.
) else (
    echo ✅ Git 已配置
    echo    用户名：
    git config --global user.name
    echo    邮箱：
    git config --global user.email
    echo.
)

echo ==========================================
echo ✅ Git 已完全安装并配置！
echo ==========================================
echo.
goto :end

:end
echo 按任意键退出...
pause >nul
