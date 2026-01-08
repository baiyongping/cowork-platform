# module-management 云函数部署脚本（开发环境）
# 环境: jihua-oa-dev-3goht9irae4d949f

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " module-management 云函数部署" -ForegroundColor Cyan
Write-Host " 目标环境: jihua-oa-dev (开发环境)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查云函数目录
$functionPath = "d:\project\cowork12-21\cloudfunctions\module-management"
if (!(Test-Path $functionPath)) {
    Write-Host "错误: 云函数目录不存在" -ForegroundColor Red
    Write-Host "路径: $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 云函数目录存在" -ForegroundColor Green

# 检查关键文件
$files = @("index.js", "package.json", "config.json")
foreach ($file in $files) {
    $filePath = Join-Path $functionPath $file
    if (!(Test-Path $filePath)) {
        Write-Host "警告: $file 不存在" -ForegroundColor Yellow
    } else {
        Write-Host "✓ $file 存在" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "云函数信息:" -ForegroundColor Cyan
Write-Host "  函数名称: module-management"
Write-Host "  环境 ID: jihua-oa-dev-3goht9irae4d949f"
Write-Host "  代码路径: $functionPath"
Write-Host ""

# 统计代码行数
$indexJs = Join-Path $functionPath "index.js"
if (Test-Path $indexJs) {
    $lines = (Get-Content $indexJs).Count
    Write-Host "  代码行数: $lines 行" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "部署方式选择:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 自动部署（推荐）" -ForegroundColor Green
Write-Host "   - 使用 CloudBase CLI 自动部署"
Write-Host "   - 需要已安装 @cloudbase/cli"
Write-Host ""
Write-Host "2. 手动部署" -ForegroundColor Yellow
Write-Host "   - 打开控制台手动创建"
Write-Host "   - 复制粘贴代码"
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "请选择部署方式 (1/2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "检查 CloudBase CLI..." -ForegroundColor Cyan
    
    try {
        $tcbVersion = tcb --version 2>&1
        Write-Host "✓ CloudBase CLI 已安装: $tcbVersion" -ForegroundColor Green
        Write-Host ""
        Write-Host "开始部署..." -ForegroundColor Cyan
        
        # 切换到云函数目录
        Set-Location $functionPath
        
        # 部署云函数
        Write-Host ""
        Write-Host "执行命令: tcb fn deploy module-management --env jihua-oa-dev-3goht9irae4d949f" -ForegroundColor Yellow
        Write-Host ""
        
        tcb fn deploy module-management --env jihua-oa-dev-3goht9irae4d949f
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ 部署成功！" -ForegroundColor Green
            Write-Host ""
            Write-Host "下一步:" -ForegroundColor Cyan
            Write-Host "1. 访问控制台验证: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf"
            Write-Host "2. 导入模块数据: http://localhost:5173/database/init/import-modules-data-web.html"
            Write-Host "3. 测试功能: http://localhost:5173"
        } else {
            Write-Host ""
            Write-Host "✗ 部署失败" -ForegroundColor Red
            Write-Host "请使用手动部署方式" -ForegroundColor Yellow
        }
        
        # 返回原目录
        Set-Location "d:\project\cowork12-21"
        
    } catch {
        Write-Host ""
        Write-Host "✗ CloudBase CLI 未安装" -ForegroundColor Red
        Write-Host ""
        Write-Host "安装方法:" -ForegroundColor Yellow
        Write-Host "  npm install -g @cloudbase/cli"
        Write-Host ""
        Write-Host "或使用手动部署方式（选项 2）" -ForegroundColor Yellow
    }
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "手动部署步骤:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 打开控制台"
    Write-Host "   https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf"
    Write-Host ""
    Write-Host "2. 点击【新建】按钮"
    Write-Host ""
    Write-Host "3. 填写配置:"
    Write-Host "   - 函数名称: module-management"
    Write-Host "   - 运行环境: Nodejs 16.13"
    Write-Host "   - 内存: 256MB"
    Write-Host "   - 超时: 15秒"
    Write-Host ""
    Write-Host "4. 选择【在线编辑】"
    Write-Host ""
    Write-Host "5. 复制代码文件内容:"
    Write-Host "   $indexJs"
    Write-Host ""
    Write-Host "6. 配置 package.json:"
    $packageJson = Join-Path $functionPath "package.json"
    if (Test-Path $packageJson) {
        Write-Host ""
        Get-Content $packageJson | Write-Host -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "7. 保存并部署"
    Write-Host ""
    Write-Host "正在打开控制台和代码文件..." -ForegroundColor Green
    Start-Sleep -Seconds 1
    
    # 打开控制台
    Start-Process "https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf"
    
    # 打开代码文件
    Start-Process "notepad.exe" -ArgumentList $indexJs
    
    # 打开部署指南
    $guidePath = "d:\project\cowork12-21\module-management-deploy-guide-dev.md"
    if (Test-Path $guidePath) {
        Start-Process $guidePath
    }
    
    Write-Host ""
    Write-Host "✓ 已打开相关文件和页面" -ForegroundColor Green
    
} else {
    Write-Host ""
    Write-Host "无效选择，退出" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
