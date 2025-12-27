# 际华协同办公平台 - Git 仓库初始化脚本（PowerShell）

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  际华协同办公平台 - Git 仓库初始化" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本所在目录
Set-Location $PSScriptRoot

# 1. 检查 Git 是否已安装
Write-Host "[0/5] 检查 Git 环境..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git 已安装：$gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git 未安装或未配置到 PATH" -ForegroundColor Red
    Write-Host "请先运行：.\配置Git.ps1" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# 2. 初始化仓库
Write-Host "[1/5] 初始化 Git 仓库..." -ForegroundColor Yellow
try {
    git init 2>&1 | Out-Null
    Write-Host "✅ Git 仓库初始化成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 初始化失败" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# 3. 查看状态
Write-Host "[2/5] 查看仓库状态..." -ForegroundColor Yellow
git status
Write-Host ""

# 4. 添加文件
Write-Host "[3/5] 添加所有文件到暂存区..." -ForegroundColor Yellow
try {
    git add .
    $addedFiles = (git status --short | Measure-Object).Count
    Write-Host "✅ 已添加 $addedFiles 个文件到暂存区" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 添加文件时出现问题" -ForegroundColor Yellow
}
Write-Host ""

# 5. 创建初始提交
Write-Host "[4/5] 创建初始提交..." -ForegroundColor Yellow
try {
    git commit -m "初始提交：际华协同办公平台基础框架

项目说明：
- 前端：React + TypeScript + Vite
- 后端：CloudBase 云函数
- 数据库：CloudBase NoSQL
- 部署：混合部署（Lighthouse + CloudBase）

开发环境配置完成，包括：
✅ Node.js v24.12.0
✅ npm 11.6.2  
✅ Git 配置
✅ 项目依赖安装" 2>&1 | Out-Null
    
    Write-Host "✅ 初始提交成功" -ForegroundColor Green
} catch {
    Write-Host "⚠️ 提交失败（可能没有文件变更）" -ForegroundColor Yellow
}
Write-Host ""

# 6. 查看提交历史
Write-Host "[5/5] 查看提交历史..." -ForegroundColor Yellow
try {
    git log --oneline -n 5
} catch {
    Write-Host "⚠️ 暂无提交历史" -ForegroundColor Yellow
}
Write-Host ""

# 7. 显示完成信息
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ Git 仓库初始化完成！" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 当前状态：" -ForegroundColor Cyan
Write-Host "  • 仓库路径：$PWD" -ForegroundColor White
Write-Host "  • 默认分支：main" -ForegroundColor White
Write-Host "  • 远程仓库：未配置" -ForegroundColor White
Write-Host ""
Write-Host "📋 常用命令：" -ForegroundColor Cyan
Write-Host "  git status              # 查看状态" -ForegroundColor White
Write-Host "  git log                 # 查看历史" -ForegroundColor White
Write-Host "  git branch dev          # 创建开发分支" -ForegroundColor White
Write-Host "  git checkout dev        # 切换到开发分支" -ForegroundColor White
Write-Host "  git add .               # 添加所有更改" -ForegroundColor White
Write-Host "  git commit -m '说明'    # 提交更改" -ForegroundColor White
Write-Host ""
Write-Host "🔗 添加远程仓库：" -ForegroundColor Cyan
Write-Host "  git remote add origin <仓库地址>" -ForegroundColor White
Write-Host "  git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "📚 更多帮助请查看：Git配置说明.md" -ForegroundColor Yellow
Write-Host ""

pause
