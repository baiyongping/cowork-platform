# 快速初始化脚本
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  际华协同办公平台 - 快速初始化" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$envId = "cowork-9gg9oocb516be5fb"

# 步骤 1: 部署云函数
Write-Host "[1/2] 部署初始化云函数..." -ForegroundColor Yellow
try {
    & cloudbase functions:deploy initDatabase --envId $envId
    Write-Host "✅ 云函数部署成功`n" -ForegroundColor Green
} catch {
    Write-Host "❌ 云函数部署失败: $_`n" -ForegroundColor Red
    exit 1
}

# 步骤 2: 调用云函数初始化数据库
Write-Host "[2/2] 初始化数据库..." -ForegroundColor Yellow
try {
    & cloudbase functions:invoke initDatabase --envId $envId
    Write-Host "✅ 数据库初始化成功`n" -ForegroundColor Green
} catch {
    Write-Host "❌ 数据库初始化失败: $_`n" -ForegroundColor Red
    exit 1
}

# 完成
Write-Host "========================================" -ForegroundColor Green
Write-Host "  🎉 初始化完成！" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "📋 管理员账号:" -ForegroundColor Cyan
Write-Host "   用户名: admin" -ForegroundColor White
Write-Host "   密码: admin123`n" -ForegroundColor White

Write-Host "🌐 CloudBase 控制台:" -ForegroundColor Cyan
Write-Host "   https://tcb.cloud.tencent.com/dev?envId=$envId#/db/doc`n" -ForegroundColor White

Write-Host "🚀 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. npm run dev" -ForegroundColor White
Write-Host "   2. 访问 http://localhost:5173" -ForegroundColor White
Write-Host "   3. 使用 admin/admin123 登录`n" -ForegroundColor White

Read-Host "Press Enter to exit"
