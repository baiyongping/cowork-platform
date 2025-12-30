# PowerShell 部署脚本 - 蓝绿部署
# 用途：将项目文件上传到服务器并执行蓝绿部署

param(
    [string]$ServerIP = "152.136.183.181",
    [string]$ProjectName = "jihua-dev",
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Green
Write-Host "际华协同办公平台 - 蓝绿部署" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 1. 本地构建（如果未跳过）
if (-not $SkipBuild) {
    Write-Host "`n[1/4] 本地构建..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ 构建失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 构建完成" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] 跳过本地构建" -ForegroundColor Yellow
}

# 2. 创建部署包
Write-Host "`n[2/4] 创建部署包..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$deployDir = "deploy-$timestamp"
$deployPackage = "$deployDir.tar.gz"

# 创建临时目录
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# 复制必要文件
Copy-Item -Path "dist" -Destination "$deployDir\" -Recurse
Copy-Item -Path "Dockerfile" -Destination "$deployDir\"
Copy-Item -Path "nginx.conf" -Destination "$deployDir\"
Copy-Item -Path "blue-green-deploy.sh" -Destination "$deployDir\"

# 使用 tar（需要 Windows 10 1803+ 或安装 Git Bash）
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $deployPackage -C $deployDir .
    Write-Host "✓ 部署包创建完成: $deployPackage" -ForegroundColor Green
} else {
    Write-Host "✗ 未找到 tar 命令，请安装 Git Bash 或 WSL" -ForegroundColor Red
    exit 1
}

# 3. 使用 Lighthouse MCP 工具上传
Write-Host "`n[3/4] 上传部署包到服务器..." -ForegroundColor Yellow
Write-Host "提示：请在 AI 对话中使用 Lighthouse MCP 工具上传文件" -ForegroundColor Cyan
Write-Host "上传文件: $deployPackage" -ForegroundColor Cyan
Write-Host "目标路径: /tmp/" -ForegroundColor Cyan

# 4. 显示服务器端执行命令
Write-Host "`n[4/4] 服务器端部署命令：" -ForegroundColor Yellow
Write-Host @"
cd /tmp
tar -xzf $deployPackage -C /var/www/$ProjectName-new
cd /var/www/$ProjectName-new
chmod +x blue-green-deploy.sh
./blue-green-deploy.sh
"@ -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "本地准备完成！" -ForegroundColor Green
Write-Host "部署包: $deployPackage" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# 清理临时目录
Remove-Item -Path $deployDir -Recurse -Force
