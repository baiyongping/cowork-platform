@echo off
chcp 65001 >nul
echo ======================================
echo    际华协同办公平台 - 环境配置脚本
echo ======================================
echo.

cd /d "%~dp0"

echo [1/5] 检查 Node.js...
node --version
if errorlevel 1 (
    echo ❌ Node.js 未安装
    exit /b 1
) else (
    echo ✅ Node.js 已安装
)
echo.

echo [2/5] 检查 npm...
npm --version
if errorlevel 1 (
    echo ❌ npm 未安装
    exit /b 1
) else (
    echo ✅ npm 已安装
)
echo.

echo [3/5] 检查 Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Git 未安装或未生效，请重启终端后再运行
    echo    如果 Git 正在安装，请等待安装完成
) else (
    echo ✅ Git 已安装
)
echo.

echo [4/5] 运行安全审计...
npm audit
echo.

echo [5/5] 修复安全漏洞...
npm audit fix
echo.

echo ======================================
echo 环境配置完成！
echo ======================================
echo.
echo 下一步操作：
echo 1. 如果 Git 未生效，请重启终端
echo 2. 运行 npm run dev 启动开发服务器
echo 3. 运行 npm run build 构建生产版本
echo.
pause
