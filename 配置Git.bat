@echo off
chcp 65001 >nul
title Git 配置脚本

echo.
echo ==========================================
echo         Git 用户信息配置
echo ==========================================
echo.

echo 正在配置 Git 用户信息...
echo.

echo [1/3] 配置用户名: baiyongping
git config --global user.name "baiyongping"
if errorlevel 1 (
    echo ❌ 配置失败
    pause
    exit /b 1
) else (
    echo ✅ 配置成功
)
echo.

echo [2/3] 配置邮箱: baiypa@126.com
git config --global user.email "baiypa@126.com"
if errorlevel 1 (
    echo ❌ 配置失败
    pause
    exit /b 1
) else (
    echo ✅ 配置成功
)
echo.

echo [3/3] 验证配置...
echo.
echo 当前 Git 配置信息：
echo ----------------------------------------
git config --global user.name
git config --global user.email
echo ----------------------------------------
echo.

echo ==========================================
echo ✅ Git 配置完成！
echo ==========================================
echo.

echo 📋 配置内容：
echo    用户名: baiyongping
echo    邮箱: baiypa@126.com
echo.

echo 💡 你现在可以使用 Git 进行版本控制了！
echo.

echo 常用 Git 命令：
echo    git init              # 初始化仓库
echo    git status            # 查看状态
echo    git add .             # 添加所有文件
echo    git commit -m "说明"  # 提交更改
echo    git log               # 查看历史
echo.

pause
