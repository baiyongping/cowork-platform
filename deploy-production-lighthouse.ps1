# ========================================
# 际华协同办公平台 - 生产环境自动化部署脚本
# 使用 Lighthouse SSH 直接部署
# ========================================

param(
    [string]$Version = "v3.11.0"
)

# 颜色输出函数
function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor White
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# 服务器信息
$SERVER_IP = "152.136.183.181"
$SERVER_USER = "root"
$DEPLOY_DIR = "/var/www/jihua-deploy"
$DOMAIN = "https://jihuadz.xin"

# ========================================
# 步骤 1: 环境检查
# ========================================
Write-Step "步骤 1: 环境检查"

Write-Info "检查 Git 状态..."
$gitBranch = git branch --show-current
if ($gitBranch -ne "master") {
    Write-Error-Message "当前分支不是 master: $gitBranch"
    Write-Warning "是否继续部署? (Y/N)"
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}
Write-Success "Git 分支: $gitBranch"

Write-Info "检查 SSH 连接..."
$sshTest = ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH连接正常'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "SSH 连接失败: $sshTest"
    exit 1
}
Write-Success "SSH 连接正常"

Write-Info "检查构建产物..."
if (-not (Test-Path "dist/index.html")) {
    Write-Error-Message "dist/index.html 不存在,请先构建项目"
    Write-Warning "是否现在执行构建? (Y/N)"
    $build = Read-Host
    if ($build -eq "Y" -or $build -eq "y") {
        Write-Info "执行构建..."
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Message "构建失败"
            exit 1
        }
    } else {
        exit 1
    }
}

$fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
$distSize = [math]::Round((Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Success "构建产物验证通过"
Write-Info "  文件总数: $fileCount"
Write-Info "  总大小: ${distSize} MB"

# ========================================
# 步骤 2: 创建压缩包
# ========================================
Write-Step "步骤 2: 创建压缩包"

$timestamp = Get-Date -Format "yyyyMMdd"
$archiveName = "jihua-prod-dist_${Version}_${timestamp}.tar.gz"
$archivePath = Join-Path $PWD $archiveName

Write-Info "压缩文件: $archiveName"
if (Test-Path $archivePath) {
    Write-Warning "压缩包已存在,是否覆盖? (Y/N)"
    $overwrite = Read-Host
    if ($overwrite -eq "Y" -or $overwrite -eq "y") {
        Remove-Item $archivePath -Force
    } else {
        Write-Info "使用已存在的压缩包"
    }
}

if (-not (Test-Path $archivePath)) {
    tar -czf $archivePath -C dist .
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "压缩失败"
        exit 1
    }
}

$archiveSize = [math]::Round((Get-Item $archivePath).Length / 1MB, 2)
Write-Success "压缩包创建成功: ${archiveSize} MB"

# ========================================
# 步骤 3: 上传到服务器
# ========================================
Write-Step "步骤 3: 上传到服务器"

Write-Info "上传到 ${SERVER_IP}:/root/"
scp $archivePath ${SERVER_USER}@${SERVER_IP}:/root/
if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "上传失败"
    exit 1
}
Write-Success "上传完成"

Write-Info "验证上传文件..."
$remoteFileSize = ssh ${SERVER_USER}@${SERVER_IP} "ls -lh /root/$archiveName | awk '{print \`$5}'"
Write-Success "远程文件大小: $remoteFileSize"

# ========================================
# 步骤 4: 执行服务器端部署
# ========================================
Write-Step "步骤 4: 执行服务器端部署"

Write-Warning "`n⚠️ 即将在生产环境执行蓝绿部署!"
Write-Warning "  域名: $DOMAIN"
Write-Warning "  版本: $Version"
Write-Warning "  时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Warning "`n请最后确认是否继续? (输入 YES 继续)"
$finalConfirm = Read-Host
if ($finalConfirm -ne "YES") {
    Write-Warning "部署已取消"
    exit 0
}

Write-Info "开始远程部署..."

$deployScript = @"
#!/bin/bash
set -e

echo '=========================================='
echo '移动压缩包到部署目录'
echo '=========================================='
cd $DEPLOY_DIR
mv /root/$archiveName ./jihua-prod-dist.tar.gz

echo '=========================================='
echo '解压文件'
echo '=========================================='
rm -rf dist
mkdir dist
tar -xzf jihua-prod-dist.tar.gz -C ./dist/

echo '=========================================='
echo '验证文件'
echo '=========================================='
file_count=\$(find dist/ -type f | wc -l)
dist_size=\$(du -sh dist/ | awk '{print \$1}')
echo "文件总数: \$file_count"
echo "总大小: \$dist_size"

if [ \$file_count -lt 10 ]; then
    echo '✗ 文件数量异常: '\$file_count
    exit 1
fi

echo '=========================================='
echo '执行蓝绿部署'
echo '=========================================='
chmod +x blue-green-deploy-production.sh
./blue-green-deploy-production.sh deploy

echo '=========================================='
echo '部署完成!'
echo '=========================================='
"@

Write-Info "执行远程部署脚本..."
$deployScript | ssh ${SERVER_USER}@${SERVER_IP} "bash -s"

if ($LASTEXITCODE -ne 0) {
    Write-Error-Message "部署失败"
    Write-Warning "请登录服务器查看详细日志"
    exit 1
}

Write-Success "服务器端部署完成"

# ========================================
# 步骤 5: 健康检查
# ========================================
Write-Step "步骤 5: 健康检查"

Write-Info "等待 10 秒让服务稳定..."
Start-Sleep -Seconds 10

Write-Info "检查容器状态..."
$containerStatus = ssh ${SERVER_USER}@${SERVER_IP} "docker ps | grep jihua-prod"
Write-Success "容器运行正常:`n$containerStatus"

Write-Info "检查 Nginx 配置..."
$nginxConfig = ssh ${SERVER_USER}@${SERVER_IP} "cat /etc/nginx/conf.d/jihua.conf | grep proxy_pass"
Write-Success "Nginx 配置:`n$nginxConfig"

Write-Info "检查网站访问..."
try {
    $response = Invoke-WebRequest -Uri $DOMAIN -Method Head -TimeoutSec 10
    Write-Success "网站访问正常: HTTP $($response.StatusCode)"
} catch {
    Write-Error-Message "网站访问失败: $_"
}

# ========================================
# 步骤 6: 部署总结
# ========================================
Write-Step "部署总结"

Write-Success "✅ 生产环境部署完成!"
Write-Info ""
Write-Info "部署信息:"
Write-Info "  版本: $Version"
Write-Info "  时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Info "  域名: $DOMAIN"
Write-Info "  压缩包: $archiveName"
Write-Info ""
Write-Warning "⚠️ 重要提示:"
Write-Warning "1. 请使用 Ctrl+Shift+R (硬刷新) 清理浏览器缓存"
Write-Warning "2. 或使用无痕/隐私模式访问验证"
Write-Warning "3. CDN缓存约需3-5分钟更新"
Write-Info ""
Write-Info "验证地址: $DOMAIN"
Write-Info ""
Write-Info "如需回滚,请执行:"
Write-Info "  ssh ${SERVER_USER}@${SERVER_IP}"
Write-Info "  cd $DEPLOY_DIR"
Write-Info "  ./blue-green-deploy-production.sh rollback blue"
Write-Info ""
Write-Success "✅ 部署流程完成!"
