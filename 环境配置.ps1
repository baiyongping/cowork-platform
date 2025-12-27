# 际华协同办公平台 - 环境配置脚本
# 用途：检查和配置开发环境

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "际华协同办公平台 - 环境配置"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   际华协同办公平台 - 环境配置脚本" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 切换到项目目录
Set-Location $PSScriptRoot

# 检查函数
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# 1. 检查 Node.js
Write-Host "[1/6] 检查 Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. 检查 npm
Write-Host "[2/6] 检查 npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm 已安装: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm 未安装" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. 检查 Git
Write-Host "[3/6] 检查 Git..." -ForegroundColor Yellow
if (Test-Command "git") {
    $gitVersion = git --version
    Write-Host "✅ Git 已安装: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Git 未安装或未生效" -ForegroundColor Yellow
    Write-Host "   请检查：" -ForegroundColor Yellow
    Write-Host "   1. Git 是否正在安装（需要等待1-2分钟）" -ForegroundColor Yellow
    Write-Host "   2. 是否需要重启终端使 Git 生效" -ForegroundColor Yellow
    Write-Host "   3. 可以手动从 https://git-scm.com 下载安装" -ForegroundColor Yellow
}
Write-Host ""

# 4. 检查项目依赖
Write-Host "[4/6] 检查项目依赖..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules 已存在" -ForegroundColor Green
} else {
    Write-Host "⚠️  node_modules 不存在，正在安装..." -ForegroundColor Yellow
    npm install
}
Write-Host ""

# 5. 运行安全审计
Write-Host "[5/6] 运行安全审计..." -ForegroundColor Yellow
npm audit
Write-Host ""

# 6. 修复安全漏洞
Write-Host "[6/6] 修复安全漏洞..." -ForegroundColor Yellow
Write-Host "正在尝试自动修复..." -ForegroundColor Cyan
$auditResult = npm audit fix 2>&1
Write-Host $auditResult
Write-Host ""

# 再次审计
Write-Host "修复后的审计结果：" -ForegroundColor Cyan
npm audit
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "环境配置完成！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 环境状态总结：" -ForegroundColor Cyan
Write-Host "  • Node.js: ✅" -ForegroundColor Green
Write-Host "  • npm: ✅" -ForegroundColor Green
if (Test-Command "git") {
    Write-Host "  • Git: ✅" -ForegroundColor Green
} else {
    Write-Host "  • Git: ⚠️  需要重启终端" -ForegroundColor Yellow
}
Write-Host "  • 项目依赖: ✅" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 下一步操作：" -ForegroundColor Cyan
Write-Host "  1. npm run dev      - 启动开发服务器" -ForegroundColor White
Write-Host "  2. npm run build    - 构建生产版本" -ForegroundColor White
Write-Host "  3. npm run preview  - 预览生产版本" -ForegroundColor White
Write-Host ""

if (-not (Test-Command "git")) {
    Write-Host "⚠️  提醒：Git 安装后需要重启终端才能生效" -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "按 Enter 键退出"
