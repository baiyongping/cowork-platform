# 功能模块管理 - 自动化部署脚本
# 用途：部署 module-management 云函数

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  功能模块管理 - 自动化部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 错误：请在项目根目录执行此脚本" -ForegroundColor Red
    exit 1
}

# 检查云函数目录
$functionPath = "cloudfunctions\module-management"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ 错误：未找到云函数目录 $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "📦 步骤1: 检查云函数文件" -ForegroundColor Yellow
Write-Host "   云函数路径: $functionPath" -ForegroundColor Gray

$files = @("index.js", "config.json", "package.json")
foreach ($file in $files) {
    $filePath = Join-Path $functionPath $file
    if (Test-Path $filePath) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file 不存在" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🚀 步骤2: 准备部署云函数" -ForegroundColor Yellow
Write-Host ""

# 提示用户确认
Write-Host "即将部署以下云函数:" -ForegroundColor Cyan
Write-Host "  - 名称: module-management" -ForegroundColor White
Write-Host "  - 路径: $functionPath" -ForegroundColor White
Write-Host "  - 功能: 功能模块管理CRUD + 元数据同步" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "确认部署? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "❌ 已取消部署" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "📤 正在部署云函数..." -ForegroundColor Yellow
Write-Host "   请在 IDE 中使用 CloudBase 工具部署" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 部署步骤:" -ForegroundColor Cyan
Write-Host "   1. 在 IDE 中调用 updateFunctionCode 或 createFunction 工具" -ForegroundColor White
Write-Host "   2. 参数:" -ForegroundColor White
Write-Host "      - name: module-management" -ForegroundColor White
Write-Host "      - functionRootPath: $(Resolve-Path 'cloudfunctions')" -ForegroundColor White
Write-Host ""
Write-Host "✅ 脚本执行完成" -ForegroundColor Green
Write-Host ""
Write-Host "📋 后续步骤:" -ForegroundColor Cyan
Write-Host "   1. 使用浏览器访问: http://localhost:5173/database/init/import-modules-data-web.html" -ForegroundColor White
Write-Host "   2. 点击 '导入模块配置' 按钮" -ForegroundColor White
Write-Host "   3. 等待导入完成（约41条记录）" -ForegroundColor White
Write-Host "   4. 访问 http://localhost:5173 并登录" -ForegroundColor White
Write-Host "   5. 在侧边栏点击 '功能模块' 菜单" -ForegroundColor White
Write-Host ""
