#!/usr/bin/env pwsh

Write-Host "=== 初始化缺失的模块配置 ===" -ForegroundColor Cyan

# 1. 进入数据库目录
Set-Location "d:/project/cowork12-21"

# 2. 执行初始化脚本
Write-Host "`n正在执行初始化脚本..." -ForegroundColor Yellow
node database/init-missing-modules.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 模块初始化完成！" -ForegroundColor Green
} else {
    Write-Host "`n❌ 模块初始化失败！" -ForegroundColor Red
    exit 1
}
