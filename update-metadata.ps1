# 更新模块元数据信息
# 版本: v1.0
# 日期: 2026-01-09

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  更新模块元数据信息" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
Write-Host "1️⃣  检查环境..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未安装 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js 已安装: $(node --version)" -ForegroundColor Green

# 检查脚本文件是否存在
$scriptPath = "database/init/update-module-metadata.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ 脚本文件不存在: $scriptPath" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 脚本文件存在" -ForegroundColor Green

Write-Host ""
Write-Host "2️⃣  执行更新..." -ForegroundColor Cyan

# 执行脚本
node $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ 更新完成!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 下一步：" -ForegroundColor Yellow
    Write-Host "   1. 刷新模块管理页面" -ForegroundColor White
    Write-Host "   2. 点击任意模块查看详情" -ForegroundColor White
    Write-Host "   3. 检查元数据信息是否显示" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  ❌ 更新失败!" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 可能的原因：" -ForegroundColor Yellow
    Write-Host "   1. wx-server-sdk 未安装" -ForegroundColor White
    Write-Host "   2. 云环境未配置" -ForegroundColor White
    Write-Host "   3. 数据库连接失败" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 建议操作：" -ForegroundColor Yellow
    Write-Host "   1. 安装依赖: npm install wx-server-sdk" -ForegroundColor White
    Write-Host "   2. 检查 cloudfunctions 目录配置" -ForegroundColor White
    Write-Host "   3. 查看完整错误信息" -ForegroundColor White
}

Write-Host ""
