# 修复构建 - 确保 dist 目录干净
# 问题: vite build 的 emptyOutDir 配置失效，dist包含了整个项目副本

Write-Host "========================================" -ForegroundColor Green
Write-Host "清理并重新构建" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 1. 完全删除 dist 目录
Write-Host "`n[1/3] 清理旧的 dist 目录..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ 已删除 dist" -ForegroundColor Green
} else {
    Write-Host "✓ dist 不存在，无需清理" -ForegroundColor Green
}

# 2. 运行 vite build
Write-Host "`n[2/3] 执行 vite build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 构建完成" -ForegroundColor Green

# 3. 验证构建产物
Write-Host "`n[3/3] 验证构建产物..." -ForegroundColor Yellow

$distFiles = Get-ChildItem "dist" -Exclude "assets" | Measure-Object
$assetsFiles = Get-ChildItem "dist/assets" -ErrorAction SilentlyContinue | Measure-Object

Write-Host "dist 根目录文件数: $($distFiles.Count)" -ForegroundColor Cyan
Write-Host "assets 目录文件数: $($assetsFiles.Count)" -ForegroundColor Cyan

# 检查是否有异常文件（应该只有 index.html 和 assets/）
$unexpectedFiles = Get-ChildItem "dist" -Exclude "index.html","assets" |  Select-Object -ExpandProperty Name

if ($unexpectedFiles.Count -gt 0) {
    Write-Host "`n⚠️ 警告: dist 目录包含异常文件:" -ForegroundColor Yellow
    $unexpectedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host "`n这可能导致部署文件过多。建议检查 vite.config.ts 配置。" -ForegroundColor Yellow
}

Write-Host "`n✓ 构建验证完成" -ForegroundColor Green

# 4. 显示部署命令
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "后续部署命令:" -ForegroundColor Green
Write-Host "powershell -File quick-deploy-test.ps1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
