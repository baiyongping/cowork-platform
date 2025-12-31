# ============================================
# 际华协同办公平台 - 清理构建脚本 (Windows)
# 版本: v1.0
# 用途: 彻底清理旧构建文件并重新构建
# ============================================

Write-Host "=====================================" -ForegroundColor Green
Write-Host "际华协同办公平台 - 清理构建" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 1. 强制删除 dist 目录
Write-Host "[1/5] 删除旧的 dist 目录..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    
    if (Test-Path "dist") {
        Write-Host "✗ dist 目录删除失败,可能被占用" -ForegroundColor Red
        Write-Host "  请关闭所有开发服务器和文件浏览器后重试" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "✓ dist 目录已删除" -ForegroundColor Green
    }
} else {
    Write-Host "✓ dist 目录不存在,跳过" -ForegroundColor Green
}

# 2. 清理 node_modules/.vite 缓存
Write-Host "[2/5] 清理 Vite 缓存..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Path "node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Vite 缓存已清理" -ForegroundColor Green
} else {
    Write-Host "✓ Vite 缓存不存在,跳过" -ForegroundColor Green
}

# 3. 检查 package-lock.json 是否变更
Write-Host "[3/5] 检查依赖变更..." -ForegroundColor Yellow
$needInstall = $false

if (Test-Path ".last-build-hash") {
    $lastHash = Get-Content ".last-build-hash" -ErrorAction SilentlyContinue
    $currentHash = (Get-FileHash "package-lock.json" -Algorithm SHA256).Hash
    
    if ($lastHash -ne $currentHash) {
        Write-Host "⚠ 检测到依赖变更,将重新安装" -ForegroundColor Yellow
        $needInstall = $true
    }
} else {
    Write-Host "⚠ 首次构建,将安装依赖" -ForegroundColor Yellow
    $needInstall = $true
}

if ($needInstall) {
    Write-Host "执行 npm ci (清理安装)..." -ForegroundColor Yellow
    npm ci
    
    if ($LASTEXITCODE -eq 0) {
        (Get-FileHash "package-lock.json" -Algorithm SHA256).Hash | Out-File -FilePath ".last-build-hash" -Encoding utf8
        Write-Host "✓ 依赖安装完成" -ForegroundColor Green
    } else {
        Write-Host "✗ 依赖安装失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ 依赖无变更,跳过安装" -ForegroundColor Green
}

# 4. 验证环境变量
Write-Host "[4/5] 验证环境变量..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    if ($envContent -match "VITE_CLOUDBASE_ENV_ID=(\S+)") {
        $envId = $matches[1]
        Write-Host "✓ CloudBase 环境ID: $envId" -ForegroundColor Green
    } else {
        Write-Host "⚠ 未找到 VITE_CLOUDBASE_ENV_ID" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ .env.production 文件不存在" -ForegroundColor Yellow
}

# 5. 执行构建
Write-Host "[5/5] 开始构建..." -ForegroundColor Yellow
Write-Host ""
npx vite build --mode production

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "✓ 构建完成!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    
    # 显示构建产物大小
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "📦 dist 目录大小: $([math]::Round($distSize, 2)) MB" -ForegroundColor Cyan
    
    # 显示文件统计
    $fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
    Write-Host "📄 文件总数: $fileCount" -ForegroundColor Cyan
    
    # 生成版本标记
    $version = (Get-Date -Format "yyyyMMdd-HHmmss")
    $version | Out-File -FilePath "dist\.build-version" -Encoding utf8 -NoNewline
    Write-Host "🏷️  构建版本: $version" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "主要文件:" -ForegroundColor Cyan
    Get-ChildItem -Path "dist" -Recurse -Include *.html,*.js,*.css | 
        Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB, 2)}} |
        Sort-Object -Property Name |
        Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "✅ 下一步操作:" -ForegroundColor Green
    Write-Host "1. 使用 Lighthouse MCP 工具上传到服务器" -ForegroundColor White
    Write-Host "2. 或使用 SCP 命令上传: scp -r dist root@152.136.183.181:/var/www/jihua-deploy/" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "✗ 构建失败!" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "常见问题:" -ForegroundColor Yellow
    Write-Host "1. 检查 TypeScript 类型错误" -ForegroundColor White
    Write-Host "2. 检查 ESLint 报错" -ForegroundColor White
    Write-Host "3. 检查环境变量配置" -ForegroundColor White
    Write-Host "4. 查看上方具体错误信息" -ForegroundColor White
    Write-Host ""
    exit 1
}
