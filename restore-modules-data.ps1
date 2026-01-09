# 恢复模块配置数据
# 修复被覆盖的模块数据

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  恢复模块配置数据" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  警告：此操作将恢复所有模块配置数据" -ForegroundColor Yellow
Write-Host "   确认要继续吗？(输入 YES 确认)" -ForegroundColor Yellow
$confirm = Read-Host "请输入"

if ($confirm -ne "YES") {
    Write-Host ""
    Write-Host "❌ 操作已取消" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "1️⃣  执行恢复..." -ForegroundColor Cyan

# 执行恢复脚本
node database/init/restore-modules-data.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ 恢复完成!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 下一步：" -ForegroundColor Yellow
    Write-Host "   1. 刷新功能模块管理页面" -ForegroundColor White
    Write-Host "   2. 检查所有模块是否显示正常" -ForegroundColor White
    Write-Host "   3. 点击模块查看详情" -ForegroundColor White
    Write-Host "   4. 验证元数据信息是否正确" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  ❌ 恢复失败!" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
}

Write-Host ""
