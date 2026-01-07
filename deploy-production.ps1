# 生产环境自动部署脚本
# 目标: 部署到 Lighthouse 服务器 (152.136.183.181:443)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  际华协同办公平台 - 生产环境部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 构建生产版本
Write-Host "[1/3] 开始构建生产版本..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败！" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 构建成功！" -ForegroundColor Green
Write-Host ""

# 步骤 2: 检查构建产物
if (-not (Test-Path "dist")) {
    Write-Host "❌ dist 目录不存在！" -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] 检查构建产物..." -ForegroundColor Yellow
$fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
Write-Host "✅ 发现 $fileCount 个文件" -ForegroundColor Green
Write-Host ""

# 步骤 3: 提示手动部署
Write-Host "[3/3] 准备部署到生产服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "部署信息:" -ForegroundColor Cyan
Write-Host "  服务器: 152.136.183.181 (lhins-pnt984h2)" -ForegroundColor White
Write-Host "  域名: https://jihuadz.xin" -ForegroundColor White
Write-Host "  端口: 443 (HTTPS)" -ForegroundColor White
Write-Host "  路径: /var/www/jihua/" -ForegroundColor White
Write-Host "  CloudBase: cowork-9gg9oocb516be5fb" -ForegroundColor White
Write-Host ""
Write-Host "✅ 构建完成！请使用以下命令部署:" -ForegroundColor Green
Write-Host ""
Write-Host "使用 AI 工具部署:" -ForegroundColor Yellow
Write-Host "  call_lighthouse_integration(deploy_project_preparation, {" -ForegroundColor Gray
Write-Host "    FolderPath: 'd:\project\cowork12-21\dist'," -ForegroundColor Gray
Write-Host "    InstanceId: 'lhins-pnt984h2'," -ForegroundColor Gray
Write-Host "    Region: 'ap-beijing'," -ForegroundColor Gray
Write-Host "    ProjectName: 'jihua'" -ForegroundColor Gray
Write-Host "  })" -ForegroundColor Gray
Write-Host ""
Write-Host "或者使用 SCP 手动部署:" -ForegroundColor Yellow
Write-Host "  scp -r dist/* root@152.136.183.181:/var/www/jihua/" -ForegroundColor Gray
Write-Host ""
