# ========================================
# 文件归档脚本 - 整理项目文档和报告
# ========================================

Write-Host "=== 文件归档脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 设置项目根目录
$projectRoot = "e:\cowork"
Set-Location $projectRoot

# 创建归档目录结构
Write-Host "📁 创建归档目录结构..." -ForegroundColor Yellow

$archiveDirs = @(
    "docs\archived-reports",
    "docs\guides",
    "docs\deployment",
    "docs\releases",
    "scripts\archived",
    "scripts\tests"
)

foreach ($dir in $archiveDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ 创建: $dir" -ForegroundColor Green
    }
}

Write-Host ""

# ========================================
# 1. 归档完成报告
# ========================================

Write-Host "[1/6] 📦 归档完成报告..." -ForegroundColor Cyan

$reports = @(
    "版本2.0.0发布完成报告.md",
    "部门数据清理完成报告.md",
    "测试环境CORS修复完成报告.md",
    "测试环境TypeError修复报告.md",
    "登录认证失败问题修复报告.md",
    "废弃user角色修复报告_v2.2.0.md",
    "角色权限列表key警告修复报告.md",
    "阶段一需求变更同步更新报告.md",
    "类型设置重复数据修复报告_v2.2.5.md",
    "权限管理模块功能结构完善报告.md",
    "权限管理系统_阶段二_后端API适配完成报告.md",
    "权限管理系统_阶段三_前端权限控制完成报告.md",
    "权限管理系统修复报告_v2.2.0.md",
    "权限管理系统修复完成报告_v2.1.0.md",
    "权限管理系统优化完成报告.md",
    "权限管理系统字段名修复报告_v2.2.2.md",
    "任务公开权限功能完成报告.md",
    "任务管理模块v1.2.0版本归档完成报告.md",
    "任务回收站功能完成报告.md",
    "商机成交时间字段优化完成报告.md",
    "商机管理和系统设置优化报告.md",
    "商机阶段数据丢失问题排查报告.md",
    "商机阶段数据丢失问题修复报告.md",
    "商机模块问题修复报告.md",
    "商机模块优化测试报告.md",
    "商机目标季度卡片权限修复报告.md",
    "数据交接功能修复完成报告.md",
    "退出登录功能修复报告.md",
    "项目创建owner字段缺失问题修复报告.md",
    "项目模块优化_v1.3.0_完成报告.md",
    "项目清理完成报告.md",
    "新建商机责任人问题修复报告.md",
    "用户角色和职务显示修复完成报告_v2.2.1.md",
    "员工部门同步问题修复报告.md",
    "员工详情职务字段完成报告.md",
    "员工注册小程序功能开发完成.md",
    "员工注册页面扫码问题修复报告.md",
    "b05权限问题分析报告.md",
    "b05权限问题修复完成报告.md",
    "baiyp02权限问题诊断报告.md",
    "baiyp02权限修复完成报告.md",
    "短信验证码测试模式配置完成.md",
    "环境配置调整完成.md",
    "环境配置完成总结.md",
    "权限管理Tab显示控制完成报告_v2.2.3.md",
    "权限管理系统实现完成确认.md",
    "权限管理系统实现总结.md",
    "权限管理系统需求更新完成报告.md",
    "权限系统分步开发完成报告.md",
    "user角色废弃完成总结_v2.2.0.md",
    "userPermissions未定义问题修复报告.md",
    "v2.0.0更新完成总结.md",
    "verify-opportunity-stages-fix.md",
    "项目详情修订完成确认.md",
    "系统参数功能实现总结.md",
    "小程序员工注册功能实施完成报告.md",
    "生产环境匿名登录403问题修复报告.md"
)

$movedReports = 0
foreach ($file in $reports) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\archived-reports\" -Force
        $movedReports++
    }
}
Write-Host "  ✅ 已归档 $movedReports 个报告文件" -ForegroundColor Green

# ========================================
# 2. 归档功能说明文档
# ========================================

Write-Host ""
Write-Host "[2/6] 📚 归档功能说明文档..." -ForegroundColor Cyan

$guides = @(
    "个人信息页面团队功能说明.md",
    "功能模块名称配置说明.md",
    "类型设置使用说明.md",
    "离职人员自动回收站功能说明.md",
    "权限管理快速参考.md",
    "权限管理系统说明.md",
    "权限系统快速上手指南.md",
    "商机模块测试操作指南.md",
    "系统参数功能测试指南.md",
    "系统参数功能说明.md",
    "系统参数快速参考.md",
    "系统设置保存功能使用指南.md",
    "项目状态与销售业绩功能说明.md",
    "小程序码配置完整指南.md",
    "小程序注册流程说明.md",
    "员工列表搜索筛选功能说明.md",
    "员工上级管理功能说明.md",
    "员工职务功能说明.md",
    "cowork开发规则.md",
    "快速开始指南.md",
    "快速启动指南.md",
    "清除浏览器缓存指南.md",
    "问题排查手册.md",
    "权限系统测试清单.md",
    "权限系统测试方案.md",
    "测试服务器地址更新记录.md",
    "功能模块名称修改问题修复报告.md",
    "服务器连接测试报告.md"
)

$movedGuides = 0
foreach ($file in $guides) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\guides\" -Force
        $movedGuides++
    }
}
Write-Host "  ✅ 已归档 $movedGuides 个功能说明文档" -ForegroundColor Green

# ========================================
# 3. 归档部署和配置文档
# ========================================

Write-Host ""
Write-Host "[3/6] ⚙️  归档部署和配置文档..." -ForegroundColor Cyan

$deployDocs = @(
    "版本管理和备份方案.md",
    "版本管理指南.md",
    "本地开发环境配置指南.md",
    "本地开发切换cowork数据库方案.md",
    "测试服务器配置.md",
    "测试环境CORS配置指南.md",
    "生产环境CORS问题修复指南.md",
    "微信登录配置总结.md",
    "小程序码生成问题排查及解决方案.md",
    "域名解析测试报告.md",
    "DEPLOY.md",
    "DEPLOYMENT_GUIDE.md",
    "UnionID方案快速参考.md",
    "VERSION_ARCHIVE_GUIDE.md"
)

$movedDeploy = 0
foreach ($file in $deployDocs) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\deployment\" -Force
        $movedDeploy++
    }
}
Write-Host "  ✅ 已归档 $movedDeploy 个部署文档" -ForegroundColor Green

# ========================================
# 4. 归档版本发布文档
# ========================================

Write-Host ""
Write-Host "[4/6] 🚀 归档版本发布文档..." -ForegroundColor Cyan

$releases = @(
    "RELEASE_NOTES_v1.1.0.md",
    "RELEASE_NOTES_v1.1.1.md",
    "RELEASE_NOTES_v2.0.0.md",
    "RELEASE_NOTES_v3.0.0.md",
    "TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md",
    "TASK_MODULE_v1.2.0_QUICK_ACCESS.md",
    "TASK_MODULE_VERSION_v1.2.0.md",
    "智能工作台到期提醒系统开发总结_v3.0.0.md"
)

$movedReleases = 0
foreach ($file in $releases) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\releases\" -Force
        $movedReleases++
    }
}
Write-Host "  ✅ 已归档 $movedReleases 个版本发布文档" -ForegroundColor Green

# ========================================
# 5. 归档旧的部署脚本
# ========================================

Write-Host ""
Write-Host "[5/6] 📜 归档旧的部署脚本..." -ForegroundColor Cyan

$oldScripts = @(
    "本地构建上传脚本.bat",
    "部署到测试环境.bat",
    "部署Parasaga.ps1",
    "部署Parasaga到服务器.sh",
    "发布新版本.bat",
    "快速部署Parasaga.bat",
    "快速初始化.ps1",
    "快速配置测试环境.bat",
    "快速配置HTTPS.bat",
    "快速升级.bat",
    "快速修复baiyp02权限问题.md",
    "快速验证baiyp02权限.bat",
    "配置测试环境HTTPS.sh",
    "配置测试环境Nginx.sh",
    "上传到服务器.bat",
    "修复生产环境CORS.bat",
    "验证并初始化数据库.bat",
    "验证权限修复.bat",
    "一键配置HTTPS.bat",
    "移除user角色.bat",
    "直接上传.bat",
    "PowerShell自动部署.ps1",
    "SSL证书申请脚本.sh",
    "环境管理.bat",
    "初始化权限系统.bat",
    "初始化数据库.bat",
    "init.bat"
)

$movedScripts = 0
foreach ($file in $oldScripts) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "scripts\archived\" -Force
        $movedScripts++
    }
}
Write-Host "  ✅ 已归档 $movedScripts 个旧脚本" -ForegroundColor Green

# ========================================
# 6. 归档测试文件
# ========================================

Write-Host ""
Write-Host "[6/6] 🧪 归档测试文件..." -ForegroundColor Cyan

$testFiles = @(
    "test-fixed-hash.cjs",
    "test-hash.cjs",
    "test-hash.js",
    "test-login-server.sh",
    "test-permissions.js",
    "test-textencoder-hash.cjs"
)

$movedTests = 0
foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "scripts\tests\" -Force
        $movedTests++
    }
}
Write-Host "  ✅ 已归档 $movedTests 个测试文件" -ForegroundColor Green

# ========================================
# 归档完成总结
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 归档完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 归档统计:" -ForegroundColor Yellow
Write-Host "  - 完成报告: $movedReports 个" -ForegroundColor White
Write-Host "  - 功能说明: $movedGuides 个" -ForegroundColor White
Write-Host "  - 部署文档: $movedDeploy 个" -ForegroundColor White
Write-Host "  - 版本发布: $movedReleases 个" -ForegroundColor White
Write-Host "  - 旧脚本: $movedScripts 个" -ForegroundColor White
Write-Host "  - 测试文件: $movedTests 个" -ForegroundColor White
Write-Host ""
$total = $movedReports + $movedGuides + $movedDeploy + $movedReleases + $movedScripts + $movedTests
Write-Host "  总计: $total 个文件已归档" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "  - 归档的文件仍然保留在项目中,只是移到了 docs/ 和 scripts/ 目录下" -ForegroundColor White
Write-Host "  - 如需删除垃圾文件,请运行: .\clean-project.bat" -ForegroundColor White
Write-Host "  - 快速清理: .\quick-clean.bat" -ForegroundColor White
Write-Host ""
Write-Host "📁 归档目录结构:" -ForegroundColor Yellow
Write-Host "  docs/" -ForegroundColor White
Write-Host "    ├─ archived-reports/  (完成报告)" -ForegroundColor Gray
Write-Host "    ├─ guides/            (功能说明)" -ForegroundColor Gray
Write-Host "    ├─ deployment/        (部署文档)" -ForegroundColor Gray
Write-Host "    └─ releases/          (版本发布)" -ForegroundColor Gray
Write-Host "  scripts/" -ForegroundColor White
Write-Host "    ├─ archived/          (旧脚本)" -ForegroundColor Gray
Write-Host "    └─ tests/             (测试文件)" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 键退出"
