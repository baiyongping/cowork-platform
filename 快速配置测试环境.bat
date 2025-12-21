@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ========================================
echo   际华协同办公平台 - 测试环境快速配置
echo ========================================
echo.

REM 检查 CloudBase CLI
where cloudbase >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ CloudBase CLI 未安装，正在安装...
    npm install -g @cloudbase/cli
) else (
    echo ✅ CloudBase CLI 已安装
)

echo.
echo 📊 当前配置:
echo    - 测试环境 ID: cowork-9gg9oocb516be5fb
echo    - 本地开发端口: 5173
echo.

:MENU
echo 请选择操作:
echo.
echo 1. 登录 CloudBase
echo 2. 部署初始化云函数
echo 3. 调用云函数初始化数据库
echo 4. 配置安全域名
echo 5. 启动本地开发服务器
echo 6. 执行全部操作 (1-5)
echo 7. 退出
echo.
set /p choice="请输入选项 (1-7): "

if "%choice%"=="1" goto LOGIN
if "%choice%"=="2" goto DEPLOY
if "%choice%"=="3" goto INIT_DB
if "%choice%"=="4" goto CONFIG_DOMAIN
if "%choice%"=="5" goto START_DEV
if "%choice%"=="6" goto ALL
if "%choice%"=="7" goto END
echo ❌ 无效选项，请重新选择
goto MENU

:LOGIN
echo.
echo ⏳ 正在登录 CloudBase...
cloudbase login
if %errorlevel% neq 0 (
    echo ❌ 登录失败
    goto MENU
)
echo ✅ 登录成功
goto MENU

:DEPLOY
echo.
echo ⏳ 正在部署初始化云函数...
cloudbase functions:deploy initDatabase --envId cowork-9gg9oocb516be5fb
if %errorlevel% neq 0 (
    echo ❌ 部署失败
    goto MENU
)
echo ✅ 部署成功
goto MENU

:INIT_DB
echo.
echo ⏳ 正在初始化数据库...
cloudbase functions:invoke initDatabase --envId cowork-9gg9oocb516be5fb
if %errorlevel% neq 0 (
    echo ❌ 初始化失败
    goto MENU
)
echo ✅ 数据库初始化成功
echo.
echo 📋 管理员账号:
echo    用户名: admin
echo    密码: admin123
goto MENU

:CONFIG_DOMAIN
echo.
echo ⏳ 正在配置安全域名...
cloudbase env:domain:create localhost:5173 --envId cowork-9gg9oocb516be5fb
cloudbase env:domain:create 127.0.0.1:5173 --envId cowork-9gg9oocb516be5fb
echo ✅ 安全域名配置完成
goto MENU

:START_DEV
echo.
echo ⏳ 正在启动开发服务器...
echo.
echo 访问地址: http://localhost:5173
echo 管理员: admin / admin123
echo.
start http://localhost:5173
npm run dev
goto END

:ALL
echo.
echo 🚀 开始执行全部操作...
echo.

echo [1/5] 登录 CloudBase...
cloudbase login
if %errorlevel% neq 0 (
    echo ❌ 登录失败，请手动登录
    pause
    goto END
)
echo ✅ 登录成功
echo.

echo [2/5] 部署初始化云函数...
cloudbase functions:deploy initDatabase --envId cowork-9gg9oocb516be5fb
if %errorlevel% neq 0 (
    echo ❌ 部署失败
    pause
    goto END
)
echo ✅ 部署成功
echo.

echo [3/5] 初始化数据库...
cloudbase functions:invoke initDatabase --envId cowork-9gg9oocb516be5fb
if %errorlevel% neq 0 (
    echo ❌ 初始化失败
    pause
    goto END
)
echo ✅ 数据库初始化成功
echo.

echo [4/5] 配置安全域名...
cloudbase env:domain:create localhost:5173 --envId cowork-9gg9oocb516be5fb 2>nul
cloudbase env:domain:create 127.0.0.1:5173 --envId cowork-9gg9oocb516be5fb 2>nul
echo ✅ 安全域名配置完成
echo.

echo [5/5] 启动开发服务器...
echo.
echo ========================================
echo   🎉 配置完成！
echo ========================================
echo.
echo 📋 访问信息:
echo    地址: http://localhost:5173
echo    用户名: admin
echo    密码: admin123
echo.
echo 正在打开浏览器...
start http://localhost:5173
npm run dev
goto END

:END
endlocal
