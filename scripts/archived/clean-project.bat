@echo off
chcp 65001 >nul
echo ========================================
echo 项目文件清理和归档工具
echo ========================================
echo.

REM 创建归档目录
echo [1/5] 创建归档目录...
if not exist "docs\archived-reports" mkdir "docs\archived-reports"
if not exist "docs\guides" mkdir "docs\guides"
if not exist "docs\deployment" mkdir "docs\deployment"
if not exist "docs\releases" mkdir "docs\releases"
if not exist "scripts\archived" mkdir "scripts\archived"
if not exist "scripts\tests" mkdir "scripts\tests"
echo ✓ 归档目录已创建

echo.
echo [2/5] 删除构建日志文件...
del /Q build.log build-output.log build-test.log 2>nul
echo ✓ 构建日志已清理

echo.
echo [3/5] 删除临时测试 HTML 文件...
del /Q check-user-role.html 2>nul
del /Q fix-baiyp02-simple.html 2>nul
del /Q quick-fix-baiyp02.html 2>nul
del /Q reset-admin.html 2>nul
del /Q update-users-role.html 2>nul
del /Q 创建测试角色和用户.html 2>nul
del /Q 测试CORS.html 2>nul
del /Q 重置管理员密码.html 2>nul
echo ✓ 临时测试文件已清理

echo.
echo [4/5] 归档完成报告...
move "*完成报告*.md" "docs\archived-reports\" 2>nul
move "*问题修复*.md" "docs\archived-reports\" 2>nul
move "*问题排查*.md" "docs\archived-reports\" 2>nul
move "*问题诊断*.md" "docs\archived-reports\" 2>nul
move "*问题分析*.md" "docs\archived-reports\" 2>nul
move "b05*.md" "docs\archived-reports\" 2>nul
move "baiyp02*.md" "docs\archived-reports\" 2>nul
echo ✓ 完成报告已归档

echo.
echo [5/5] 归档功能说明文档...
move "*功能说明*.md" "docs\guides\" 2>nul
move "*使用指南*.md" "docs\guides\" 2>nul
move "*快速参考*.md" "docs\guides\" 2>nul
move "*测试操作指南*.md" "docs\guides\" 2>nul
move "*流程说明*.md" "docs\guides\" 2>nul
move "清除浏览器缓存指南.md" "docs\guides\" 2>nul
move "问题排查手册.md" "docs\guides\" 2>nul
echo ✓ 功能说明文档已归档

echo.
echo [归档] 部署和配置文档...
move "*配置*.md" "docs\deployment\" 2>nul
move "*部署*.md" "docs\deployment\" 2>nul
move "*服务器*.md" "docs\deployment\" 2>nul
move "*环境*.md" "docs\deployment\" 2>nul
move "DEPLOY.md" "docs\deployment\" 2>nul
move "DEPLOYMENT_GUIDE.md" "docs\deployment\" 2>nul
move "UnionID*.md" "docs\deployment\" 2>nul
move "UnionID*.txt" "docs\deployment\" 2>nul
echo ✓ 部署文档已归档

echo.
echo [归档] 版本发布文档...
move "RELEASE_NOTES*.md" "docs\releases\" 2>nul
move "TASK_MODULE*.md" "docs\releases\" 2>nul
move "*总结*.md" "docs\releases\" 2>nul
move "VERSION.md" "docs\releases\" 2>nul
echo ✓ 版本文档已归档

echo.
echo [归档] 部署脚本...
move "本地构建上传脚本.bat" "scripts\archived\" 2>nul
move "部署到测试环境.bat" "scripts\archived\" 2>nul
move "部署Parasaga.ps1" "scripts\archived\" 2>nul
move "部署Parasaga到服务器.sh" "scripts\archived\" 2>nul
move "发布新版本.bat" "scripts\archived\" 2>nul
move "快速*.bat" "scripts\archived\" 2>nul
move "快速*.ps1" "scripts\archived\" 2>nul
move "配置*.sh" "scripts\archived\" 2>nul
move "上传到服务器.bat" "scripts\archived\" 2>nul
move "修复*.bat" "scripts\archived\" 2>nul
move "验证*.bat" "scripts\archived\" 2>nul
move "一键*.bat" "scripts\archived\" 2>nul
move "移除*.bat" "scripts\archived\" 2>nul
move "直接上传.bat" "scripts\archived\" 2>nul
move "PowerShell*.ps1" "scripts\archived\" 2>nul
move "SSL*.sh" "scripts\archived\" 2>nul
move "环境管理.bat" "scripts\archived\" 2>nul
move "init.bat" "scripts\archived\" 2>nul
echo ✓ 部署脚本已归档

echo.
echo [归档] 测试脚本...
move "test-*.cjs" "scripts\tests\" 2>nul
move "test-*.js" "scripts\tests\" 2>nul
move "test-*.sh" "scripts\tests\" 2>nul
echo ✓ 测试脚本已归档

echo.
echo [归档] Nginx 配置...
move "nginx*.conf" "docs\deployment\" 2>nul
echo ✓ Nginx 配置已归档

echo.
echo ========================================
echo ✅ 清理和归档完成！
echo ========================================
echo.
echo 清理结果:
echo   - 构建日志: 已删除
echo   - 临时测试文件: 已删除  
echo   - 完成报告: 已归档到 docs\archived-reports\
echo   - 功能说明: 已归档到 docs\guides\
echo   - 部署文档: 已归档到 docs\deployment\
echo   - 版本文档: 已归档到 docs\releases\
echo   - 部署脚本: 已归档到 scripts\archived\
echo   - 测试脚本: 已归档到 scripts\tests\
echo.
echo 请检查归档目录确认无误后,可以提交到 Git。
echo.
pause
