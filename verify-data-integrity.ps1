#!/usr/bin/env pwsh
# 模块数据完整性验证脚本
# 版本: v1.0

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   模块数据完整性验证工具" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未安装 Node.js" -ForegroundColor Red
    Write-Host "请先安装 Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js 已安装" -ForegroundColor Green
Write-Host ""

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️ 未安装依赖，正在安装..." -ForegroundColor Yellow
    npm install
}

Write-Host "🔍 开始验证模块数据完整性..." -ForegroundColor Cyan
Write-Host ""

# 执行验证脚本
try {
    node scripts/verify-module-data-integrity.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 验证完成！" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 建议操作:" -ForegroundColor Yellow
        Write-Host "   1. 如果发现问题，脚本已自动修复" -ForegroundColor White
        Write-Host "   2. 刷新前端页面，查看是否正常显示" -ForegroundColor White
        Write-Host "   3. 检查一级模块和子模块的层级关系" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ 验证失败！" -ForegroundColor Red
        Write-Host "请检查错误信息并手动修复" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ 执行失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
