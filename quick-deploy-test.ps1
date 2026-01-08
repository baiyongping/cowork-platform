# 快速部署到测试环境
# 使用 rsync 增量同步（更快、更可靠）

param(
    [string]$ServerIP = "152.136.183.181",
    [string]$TargetPath = "/var/www/jihua-dev"
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "快速部署到测试环境" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 检查 rsync
if (-not (Get-Command rsync -ErrorAction SilentlyContinue)) {
    Write-Host "✗ 未找到 rsync 命令" -ForegroundColor Red
    Write-Host "请安装 Git Bash 或 WSL，或使用 scp 命令" -ForegroundColor Yellow
    Write-Host "`n备选方案（手动执行）：" -ForegroundColor Yellow
    Write-Host "scp -r dist/* root@${ServerIP}:${TargetPath}/" -ForegroundColor Cyan
    exit 1
}

# 使用 rsync 增量同步
Write-Host "`n正在同步文件到服务器..." -ForegroundColor Yellow
Write-Host "源: dist/" -ForegroundColor Cyan
Write-Host "目标: root@${ServerIP}:${TargetPath}/" -ForegroundColor Cyan

rsync -avz --delete `
    -e "ssh -o StrictHostKeyChecking=no" `
    dist/ root@${ServerIP}:${TargetPath}/

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ 部署成功！" -ForegroundColor Green
    Write-Host "`n访问地址（带缓存清除）：" -ForegroundColor Yellow
    $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    Write-Host "https://${ServerIP}:3443?v=$timestamp" -ForegroundColor Cyan
    Write-Host "`n提示：按 Ctrl+F5 强制刷新浏览器" -ForegroundColor Yellow
} else {
    Write-Host "`n✗ 部署失败" -ForegroundColor Red
    Write-Host "错误码: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
