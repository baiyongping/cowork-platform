# 生产环境构建脚本
Write-Host "🚀 开始构建生产版本..." -ForegroundColor Cyan

# 清理旧的构建
if (Test-Path "dist") {
    Write-Host "🧹 清理旧的 dist 目录..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "dist"
}

# 执行构建
Write-Host "📦 执行 Vite 构建..." -ForegroundColor Cyan
npm run build

# 检查构建结果
if ($LASTEXITCODE -eq 0) {
    if (Test-Path "dist") {
        Write-Host "✅ 构建成功完成！" -ForegroundColor Green
        Write-Host "📂 构建产物目录: dist/" -ForegroundColor Green
        
        # 显示构建产物大小
        $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "📊 构建大小: $([math]::Round($distSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "❌ 构建失败：dist 目录未生成" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 构建命令执行失败" -ForegroundColor Red
    exit 1
}
