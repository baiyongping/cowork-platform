#!/usr/bin/env pwsh

# 执行数据库字段重命名脚本

Write-Host "🚀 开始执行字段重命名..." -ForegroundColor Cyan
Write-Host ""

# 执行 Node.js 脚本
node database/init/rename-displayname-to-name.cjs

Write-Host ""
Write-Host "✅ 脚本执行完成" -ForegroundColor Green
