Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "        Git 安装状态检查" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 命令
Write-Host "[1] 检查 Git 命令..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git 命令可用" -ForegroundColor Green
        Write-Host "   版本: $gitVersion" -ForegroundColor Green
        Write-Host ""
        
        # 检查配置
        Write-Host "[2] 检查 Git 配置..." -ForegroundColor Yellow
        $userName = git config --global user.name 2>&1
        $userEmail = git config --global user.email 2>&1
        
        if ($userName -and $userEmail) {
            Write-Host "✅ Git 已配置" -ForegroundColor Green
            Write-Host "   用户名: $userName" -ForegroundColor Green
            Write-Host "   邮箱: $userEmail" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Git 未配置" -ForegroundColor Yellow
            Write-Host "   请运行以下命令配置：" -ForegroundColor Yellow
            Write-Host "   git config --global user.name `"你的名字`"" -ForegroundColor White
            Write-Host "   git config --global user.email `"你的邮箱`"" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "===========================================" -ForegroundColor Cyan
        Write-Host "✅ Git 检查完成！" -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Cyan
        exit 0
    }
} catch {
    Write-Host "❌ Git 命令不可用" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] 检查 Git 安装路径..." -ForegroundColor Yellow

$gitPaths = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
)

$found = $false
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        Write-Host "✅ 找到 Git: $path" -ForegroundColor Green
        $found = $true
        break
    }
}

Write-Host ""

if ($found) {
    Write-Host "⚠️  Git 已安装但命令不可用" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 解决方案：" -ForegroundColor Cyan
    Write-Host "   1. 关闭当前终端" -ForegroundColor White
    Write-Host "   2. 重新打开终端" -ForegroundColor White
    Write-Host "   3. 运行: git --version" -ForegroundColor White
    Write-Host ""
    Write-Host "   如果仍不可用，请重启电脑" -ForegroundColor Yellow
} else {
    Write-Host "❌ 未找到 Git 安装" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 可能的情况：" -ForegroundColor Cyan
    Write-Host "   1. 🔄 winget 正在后台安装（等待1-2分钟）" -ForegroundColor White
    Write-Host "   2. ❌ 安装失败" -ForegroundColor White
    Write-Host "   3. ❌ 从未安装" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 建议操作：" -ForegroundColor Cyan
    Write-Host "   方案一：等待并重新检查" -ForegroundColor White
    Write-Host "           运行: .\检查Git.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   方案二：手动安装" -ForegroundColor White
    Write-Host "           下载: https://git-scm.com/download/win" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   方案三：使用 winget" -ForegroundColor White
    Write-Host "           运行: winget install -e --id Git.Git" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Read-Host "按 Enter 键退出"
