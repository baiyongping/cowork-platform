@echo off
chcp 65001 >nul
echo ========================================
echo 🏥 项目健康度检查
echo ========================================
echo.

echo [1/6] 📁 检查根目录文件数量...
echo.
set /a md_count=0
set /a bat_count=0
set /a log_count=0
set /a html_count=0

for /f %%i in ('dir /b "e:\cowork\*.md" 2^>nul ^| find /c /v ""') do set md_count=%%i
for /f %%i in ('dir /b "e:\cowork\*.bat" 2^>nul ^| find /c /v ""') do set bat_count=%%i
for /f %%i in ('dir /b "e:\cowork\*.log" 2^>nul ^| find /c /v ""') do set log_count=%%i
for /f %%i in ('dir /b "e:\cowork\*.html" 2^>nul ^| find /c /v ""') do set html_count=%%i

echo   📝 MD 文件: %md_count% 个
if %md_count% LEQ 10 (
    echo      ✅ 优秀 (≤10)
) else if %md_count% LEQ 15 (
    echo      ⚠️  良好 (≤15)
) else (
    echo      ❌ 需要清理 (>15)
)

echo   📜 BAT 脚本: %bat_count% 个
if %bat_count% LEQ 5 (
    echo      ✅ 优秀 (≤5)
) else if %bat_count% LEQ 8 (
    echo      ⚠️  良好 (≤8)
) else (
    echo      ❌ 需要清理 (>8)
)

echo   📋 LOG 日志: %log_count% 个
if %log_count% EQU 0 (
    echo      ✅ 优秀 (0)
) else if %log_count% LEQ 3 (
    echo      ⚠️  良好 (≤3)
) else (
    echo      ❌ 需要清理 (>3)
)

echo   🌐 HTML 文件: %html_count% 个
if %html_count% EQU 0 (
    echo      ✅ 优秀 (0)
) else if %html_count% LEQ 5 (
    echo      ⚠️  良好 (≤5)
) else (
    echo      ❌ 需要清理 (>5)
)

echo.
echo [2/6] 📦 检查归档目录...
echo.

if exist "e:\cowork\docs\archived-reports\" (
    for /f %%i in ('dir /b "e:\cowork\docs\archived-reports\*.md" 2^>nul ^| find /c /v ""') do (
        echo   ✅ 完成报告: %%i 个已归档
    )
) else (
    echo   ⚠️  归档目录不存在
)

if exist "e:\cowork\docs\guides\" (
    for /f %%i in ('dir /b "e:\cowork\docs\guides\*.md" 2^>nul ^| find /c /v ""') do (
        echo   ✅ 功能说明: %%i 个已归档
    )
) else (
    echo   ⚠️  功能说明目录不存在
)

if exist "e:\cowork\scripts\archived\" (
    for /f %%i in ('dir /b "e:\cowork\scripts\archived\*.bat" 2^>nul ^| find /c /v ""') do (
        echo   ✅ 旧脚本: %%i 个已归档
    )
) else (
    echo   ⚠️  脚本归档目录不存在
)

echo.
echo [3/6] 🗑️  检查垃圾文件...
echo.

set found_garbage=0

dir "e:\cowork\build*.log" >nul 2>&1
if not errorlevel 1 (
    echo   ❌ 发现构建日志文件
    set found_garbage=1
) else (
    echo   ✅ 无构建日志
)

dir "e:\cowork\*test*.html" >nul 2>&1
if not errorlevel 1 (
    echo   ❌ 发现临时测试文件
    set found_garbage=1
) else (
    echo   ✅ 无临时测试文件
)

dir "e:\cowork\nginx*.conf" >nul 2>&1
if not errorlevel 1 (
    echo   ❌ 发现 Nginx 配置文件
    set found_garbage=1
) else (
    echo   ✅ 无 Nginx 配置
)

dir "e:\cowork\*.tmp" >nul 2>&1
if not errorlevel 1 (
    echo   ❌ 发现临时文件
    set found_garbage=1
) else (
    echo   ✅ 无临时文件
)

echo.
echo [4/6] 🔍 检查 Git 状态...
echo.

cd /d "e:\cowork"
git status --short | find /c /v "" >nul 2>&1
if errorlevel 1 (
    echo   ✅ 工作目录干净
) else (
    echo   ⚠️  有未提交的修改
    git status --short | head -5
)

echo.
echo [5/6] 📊 检查项目大小...
echo.

for /f "tokens=3" %%i in ('dir "e:\cowork" /s /-c ^| find "个文件"') do (
    echo   📁 总文件数: %%i
)

echo.
echo [6/6] 🎯 综合评分...
echo.

set /a score=100
if %md_count% GTR 15 set /a score-=20
if %bat_count% GTR 8 set /a score-=15
if %log_count% GTR 0 set /a score-=10
if %html_count% GTR 0 set /a score-=10
if %found_garbage% EQU 1 set /a score-=15

echo   项目健康度: %score% 分
echo.

if %score% GEQ 90 (
    echo   ⭐⭐⭐⭐⭐ 优秀！项目非常整洁
) else if %score% GEQ 70 (
    echo   ⭐⭐⭐⭐ 良好！轻微改进即可
) else if %score% GEQ 50 (
    echo   ⭐⭐⭐ 一般，建议执行清理
) else (
    echo   ⭐⭐ 需要清理！请立即执行
)

echo.
echo ========================================
echo 💡 改进建议:
echo ========================================
echo.

if %md_count% GTR 10 (
    echo   📝 根目录文档过多，建议归档
    echo      运行: powershell -File .\scripts\archive-old-files.ps1
    echo.
)

if %log_count% GTR 0 (
    echo   📋 发现构建日志，建议删除
    echo      运行: del /q build*.log
    echo.
)

if %found_garbage% EQU 1 (
    echo   🗑️  发现垃圾文件，建议清理
    echo      运行: .\scripts\clean-project.bat
    echo.
)

echo ========================================
echo 📖 更多信息:
echo   - 清理计划: FILE_CLEANUP_PLAN.md
echo   - 维护指南: docs\cleanup-archives\PROJECT_MAINTENANCE_GUIDE.md
echo   - 查看归档: .\scripts\view-archives.bat
echo ========================================
echo.
pause
