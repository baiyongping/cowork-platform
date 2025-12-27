# Git 配置脚本
# 用户: baiyongping
# 邮箱: baiypa@126.com

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "        Git 用户信息配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "正在配置 Git 用户信息..." -ForegroundColor Yellow
Write-Host ""

# 配置用户名
Write-Host "[1/3] 配置用户名: baiyongping" -ForegroundColor Yellow
try {
    git config --global user.name "baiyongping"
    Write-Host "✅ 配置成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 配置失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 配置邮箱
Write-Host "[2/3] 配置邮箱: baiypa@126.com" -ForegroundColor Yellow
try {
    git config --global user.email "baiypa@126.com"
    Write-Host "✅ 配置成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 配置失败: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 验证配置
Write-Host "[3/3] 验证配置..." -ForegroundColor Yellow
Write-Host ""
Write-Host "当前 Git 配置信息：" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

try {
    $userName = git config --global user.name
    $userEmail = git config --global user.email
    
    Write-Host "  用户名: $userName" -ForegroundColor White
    Write-Host "  邮箱: $userEmail" -ForegroundColor White
} catch {
    Write-Host "❌ 无法读取配置" -ForegroundColor Red
}

Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# 设置其他推荐配置
Write-Host "正在设置推荐配置..." -ForegroundColor Yellow
Write-Host ""

# 设置默认分支名为 main
Write-Host "• 设置默认分支名为 main" -ForegroundColor Gray
git config --global init.defaultBranch main 2>$null

# 设置自动换行符转换（Windows）
Write-Host "• 设置换行符自动转换（Windows）" -ForegroundColor Gray
git config --global core.autocrlf true 2>$null

# 设置中文文件名显示
Write-Host "• 设置中文文件名正确显示" -ForegroundColor Gray
git config --global core.quotepath false 2>$null

# 设置颜色输出
Write-Host "• 启用彩色输出" -ForegroundColor Gray
git config --global color.ui auto 2>$null

Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Git 配置完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 配置内容：" -ForegroundColor Cyan
Write-Host "  • 用户名: baiyongping" -ForegroundColor White
Write-Host "  • 邮箱: baiypa@126.com" -ForegroundColor White
Write-Host "  • 默认分支: main" -ForegroundColor White
Write-Host "  • 换行符转换: 已启用（Windows）" -ForegroundColor White
Write-Host "  • 中文支持: 已启用" -ForegroundColor White
Write-Host ""

Write-Host "💡 你现在可以使用 Git 进行版本控制了！" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 常用 Git 命令：" -ForegroundColor Cyan
Write-Host "  git init              # 初始化仓库" -ForegroundColor White
Write-Host "  git status            # 查看状态" -ForegroundColor White
Write-Host "  git add .             # 添加所有文件" -ForegroundColor White
Write-Host "  git commit -m '说明'  # 提交更改" -ForegroundColor White
Write-Host "  git log               # 查看历史" -ForegroundColor White
Write-Host "  git branch            # 查看分支" -ForegroundColor White
Write-Host "  git checkout -b dev   # 创建并切换分支" -ForegroundColor White
Write-Host ""

Write-Host "🔍 查看所有配置：" -ForegroundColor Cyan
Write-Host "  git config --global --list" -ForegroundColor White
Write-Host ""

Read-Host "按 Enter 键退出"
