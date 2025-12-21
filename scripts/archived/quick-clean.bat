@echo off
chcp 65001 >nul
echo ========================================
echo 快速清理垃圾文件 (不归档)
echo ========================================
echo.
echo 将删除以下文件:
echo.
echo 📝 构建日志 (3个):
echo    - build.log
echo    - build-output.log
echo    - build-test.log
echo.
echo 🧪 临时测试 HTML (8个):
echo    - check-user-role.html
echo    - fix-baiyp02-simple.html
echo    - quick-fix-baiyp02.html
echo    - reset-admin.html
echo    - update-users-role.html
echo    - 创建测试角色和用户.html
echo    - 测试CORS.html
echo    - 重置管理员密码.html
echo.
echo ⚙️  Nginx 配置 (3个):
echo    - nginx.conf
echo    - nginx-https.conf
echo    - nginx-parasaga.conf
echo.
echo 📄 临时文本文件 (2个):
echo    - UnionID部署报告.txt
echo    - 服务器部署命令集.txt
echo.
echo ⚠️  注意: 此操作不可撤销!
echo.

set /p confirm=确认删除? (输入 YES 继续): 

if /i not "%confirm%"=="YES" (
    echo.
    echo ❌ 已取消操作
    pause
    exit /b 0
)

echo.
echo 🗑️  开始清理...
echo.

REM 删除构建日志
echo [1/4] 删除构建日志...
del /Q build.log 2>nul
del /Q build-output.log 2>nul
del /Q build-test.log 2>nul
echo ✅ 完成

REM 删除临时测试 HTML
echo.
echo [2/4] 删除临时测试 HTML...
del /Q check-user-role.html 2>nul
del /Q fix-baiyp02-simple.html 2>nul
del /Q quick-fix-baiyp02.html 2>nul
del /Q reset-admin.html 2>nul
del /Q update-users-role.html 2>nul
del /Q 创建测试角色和用户.html 2>nul
del /Q 测试CORS.html 2>nul
del /Q 重置管理员密码.html 2>nul
echo ✅ 完成

REM 删除 Nginx 配置
echo.
echo [3/4] 删除 Nginx 配置...
del /Q nginx.conf 2>nul
del /Q nginx-https.conf 2>nul
del /Q nginx-parasaga.conf 2>nul
echo ✅ 完成

REM 删除临时文本文件
echo.
echo [4/4] 删除临时文本文件...
del /Q UnionID部署报告.txt 2>nul
del /Q 服务器部署命令集.txt 2>nul
echo ✅ 完成

echo.
echo ========================================
echo 🎉 清理完成!
echo ========================================
echo.
echo 已删除 16 个垃圾文件
echo.
echo 💡 提示: 
echo    - 如需归档旧文档,运行: clean-project.bat
echo    - 如需查看详细清理方案,查看: FILE_CLEANUP_PLAN.md
echo.
pause
