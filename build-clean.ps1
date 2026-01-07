# 清理并构建生产环境
Write-Host "🧹 清理 dist 目录..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "✅ dist 目录已清除" -ForegroundColor Green
}

Write-Host "🔨 开始构建生产版本..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 构建成功！" -ForegroundColor Green
    Write-Host "📁 构建产物在 dist/ 目录" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "❌ 构建失败！" -ForegroundColor Red
    exit 1
}
