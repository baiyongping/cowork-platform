@echo off
chcp 65001 >nul
echo === 手动归档脚本 ===
echo.

REM 创建归档目录
echo [1/6] 创建归档目录...
mkdir "docs\archived-reports" 2>nul
mkdir "docs\guides" 2>nul
mkdir "docs\deployment" 2>nul
mkdir "docs\releases" 2>nul
mkdir "scripts\archived" 2>nul
mkdir "scripts\tests" 2>nul
echo ✅ 目录已创建

echo.
echo [2/6] 归档完成报告 (50+ 文件)...
move /Y "*完成报告*.md" "docs\archived-reports\" 2>nul
move /Y "*修复报告*.md" "docs\archived-reports\" 2>nul
move /Y "*问题*.md" "docs\archived-reports\" 2>nul
move /Y "b05权限*.md" "docs\archived-reports\" 2>nul
move /Y "baiyp02*.md" "docs\archived-reports\" 2>nul
echo ✅ 完成报告已归档

echo.
echo [3/6] 归档功能说明文档 (25+ 文件)...
move /Y "*功能说明*.md" "docs\guides\" 2>nul
move /Y "*使用指南*.md" "docs\guides\" 2>nul
move /Y "*快速参考*.md" "docs\guides\" 2>nul
move /Y "系统参数*.md" "docs\guides\" 2>nul
move /Y "权限系统*.md" "docs\guides\" 2>nul
move /Y "权限管理*.md" "docs\guides\" 2>nul
move /Y "员工*.md" "docs\guides\" 2>nul
move /Y "商机*.md" "docs\guides\" 2>nul
move /Y "项目*.md" "docs\guides\" 2>nul
move /Y "类型设置*.md" "docs\guides\" 2>nul
move /Y "离职人员*.md" "docs\guides\" 2>nul
move /Y "个人信息*.md" "docs\guides\" 2>nul
move /Y "小程序*.md" "docs\guides\" 2>nul
move /Y "cowork开发规则.md" "docs\guides\" 2>nul
move /Y "清除浏览器缓存指南.md" "docs\guides\" 2>nul
move /Y "问题排查手册.md" "docs\guides\" 2>nul
echo ✅ 功能说明已归档

echo.
echo [4/6] 归档部署文档 (14+ 文件)...
move /Y "版本*.md" "docs\deployment\" 2>nul
move /Y "本地*.md" "docs\deployment\" 2>nul
move /Y "*环境*.md" "docs\deployment\" 2>nul
move /Y "*服务器*.md" "docs\deployment\" 2>nul
move /Y "*部署*.md" "docs\deployment\" 2>nul
move /Y "生产*.md" "docs\deployment\" 2>nul
move /Y "测试*.md" "docs\deployment\" 2>nul
move /Y "微信登录配置总结.md" "docs\deployment\" 2>nul
move /Y "域名解析测试报告.md" "docs\deployment\" 2>nul
move /Y "UnionID方案快速参考.md" "docs\deployment\" 2>nul
move /Y "DEPLOY.md" "docs\deployment\" 2>nul
move /Y "DEPLOYMENT_GUIDE.md" "docs\deployment\" 2>nul
echo ✅ 部署文档已归档

echo.
echo [5/6] 归档版本发布文档 (8+ 文件)...
move /Y "RELEASE_NOTES_*.md" "docs\releases\" 2>nul
move /Y "TASK_MODULE_*.md" "docs\releases\" 2>nul
move /Y "智能工作台*.md" "docs\releases\" 2>nul
move /Y "v2.0.0*.md" "docs\releases\" 2>nul
move /Y "user角色*.md" "docs\releases\" 2>nul
move /Y "VERSION_ARCHIVE_GUIDE.md" "docs\releases\" 2>nul
echo ✅ 版本文档已归档

echo.
echo [6/6] 归档旧脚本 (30+ 文件)...
move /Y "*.bat" "scripts\archived\" 2>nul
move /Y "*.ps1" "scripts\archived\" 2>nul
move /Y "*.sh" "scripts\archived\" 2>nul
REM 恢复常用脚本
move /Y "scripts\archived\clean-project.bat" . 2>nul
move /Y "scripts\archived\quick-clean.bat" . 2>nul
echo ✅ 旧脚本已归档

echo.
echo [7/7] 归档测试文件...
move /Y "test-*.cjs" "scripts\tests\" 2>nul
move /Y "test-*.js" "scripts\tests\" 2>nul
move /Y "test-*.sh" "scripts\tests\" 2>nul
echo ✅ 测试文件已归档

echo.
echo ========================================
echo 🎉 归档完成!
echo ========================================
echo.
pause
