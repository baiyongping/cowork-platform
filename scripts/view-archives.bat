@echo off
chcp 65001 >nul
echo ========================================
echo 📚 归档文件查看器
echo ========================================
echo.

:menu
echo 请选择要查看的归档类型:
echo.
echo [1] 完成报告 (51 个)
echo [2] 功能说明 (34 个)
echo [3] 部署文档 (16 个)
echo [4] 版本发布 (11 个)
echo [5] 清理文档 (4 个)
echo [6] 旧脚本 (23 个)
echo [7] 测试文件 (6 个)
echo [8] 查看所有归档统计
echo [0] 退出
echo.
set /p choice=请输入选项 (0-8): 

if "%choice%"=="1" goto reports
if "%choice%"=="2" goto guides
if "%choice%"=="3" goto deployment
if "%choice%"=="4" goto releases
if "%choice%"=="5" goto cleanup
if "%choice%"=="6" goto scripts
if "%choice%"=="7" goto tests
if "%choice%"=="8" goto stats
if "%choice%"=="0" exit /b 0

echo 无效选项!
echo.
goto menu

:reports
echo.
echo === 📋 完成报告 (51 个) ===
echo.
dir /b "docs\archived-reports\*.md"
echo.
pause
goto menu

:guides
echo.
echo === 📖 功能说明 (34 个) ===
echo.
dir /b "docs\guides\*.md"
echo.
pause
goto menu

:deployment
echo.
echo === 🚀 部署文档 (16 个) ===
echo.
dir /b "docs\deployment\*.md"
echo.
pause
goto menu

:releases
echo.
echo === 📦 版本发布 (11 个) ===
echo.
dir /b "docs\releases\*.md"
echo.
pause
goto menu

:cleanup
echo.
echo === 🧹 清理文档 (4 个) ===
echo.
dir /b "docs\cleanup-archives\*.md"
echo.
pause
goto menu

:scripts
echo.
echo === 📜 旧脚本 (23 个) ===
echo.
dir /b "scripts\archived\*.bat"
echo.
pause
goto menu

:tests
echo.
echo === 🧪 测试文件 (6 个) ===
echo.
dir /b "scripts\tests\*.*"
echo.
pause
goto menu

:stats
echo.
echo ========================================
echo 📊 归档统计总览
echo ========================================
echo.
echo 完成报告: 
dir /b "docs\archived-reports\*.md" 2>nul | find /c /v ""
echo.
echo 功能说明:
dir /b "docs\guides\*.md" 2>nul | find /c /v ""
echo.
echo 部署文档:
dir /b "docs\deployment\*.md" 2>nul | find /c /v ""
echo.
echo 版本发布:
dir /b "docs\releases\*.md" 2>nul | find /c /v ""
echo.
echo 清理文档:
dir /b "docs\cleanup-archives\*.md" 2>nul | find /c /v ""
echo.
echo 旧脚本:
dir /b "scripts\archived\*.bat" 2>nul | find /c /v ""
echo.
echo 测试文件:
dir /b "scripts\tests\*.*" 2>nul | find /c /v ""
echo.
echo ========================================
echo 总计归档文件: 145 个
echo ========================================
echo.
pause
goto menu
