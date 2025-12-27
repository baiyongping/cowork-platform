@echo off
chcp 65001 > nul
echo ========================================
echo Git 故障排查脚本
echo ========================================
echo.

echo [步骤1] 检查Git是否安装...
where git
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到Git命令
    echo.
    echo 可能的原因：
    echo 1. Git未安装
    echo 2. Git安装路径未添加到环境变量
    echo.
    echo 请访问 https://git-scm.com/download/win 下载安装Git
    pause
    exit /b 1
) else (
    echo ✅ 找到Git命令
)
echo.

echo [步骤2] 检查Git版本...
git --version
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git命令执行失败
    pause
    exit /b 1
) else (
    echo ✅ Git命令执行成功
)
echo.

echo [步骤3] 检查当前目录...
cd
echo.

echo [步骤4] 检查Git仓库状态...
if exist .git (
    echo ✅ 找到.git目录，仓库已初始化
    git status
) else (
    echo ❌ 未找到.git目录
    echo.
    set /p choice="是否初始化Git仓库? (Y/N): "
    if /i "%choice%"=="Y" (
        git init
        echo ✅ Git仓库初始化成功
    )
)
echo.

echo [步骤5] 检查Git配置...
echo 用户名:
git config user.name
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ 未配置用户名
    set /p username="请输入你的名字: "
    git config --global user.name "%username%"
    echo ✅ 用户名配置成功
)
echo.

echo 邮箱:
git config user.email
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ 未配置邮箱
    set /p email="请输入你的邮箱: "
    git config --global user.email "%email%"
    echo ✅ 邮箱配置成功
)
echo.

echo ========================================
echo 故障排查完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 查看当前修改: git status
echo 2. 添加所有文件: git add .
echo 3. 提交修改: git commit -m "你的提交信息"
echo 4. 推送到远程: git push
echo.
pause
