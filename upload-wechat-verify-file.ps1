# 上传微信验证文件到服务器

# 配置
$SERVER_IP = "152.136.183.181"
$SERVER_PATH = "/var/www/jihua/"
$LOCAL_FILE = "MP_verify_*.txt"  # 验证文件名

Write-Host "📤 准备上传微信验证文件..." -ForegroundColor Cyan

# 检查文件是否存在
$verifyFiles = Get-ChildItem -Path $LOCAL_FILE -ErrorAction SilentlyContinue
if ($verifyFiles.Count -eq 0) {
    Write-Host "❌ 错误：找不到验证文件 $LOCAL_FILE" -ForegroundColor Red
    Write-Host "" -ForegroundColor Yellow
    Write-Host "请先从微信公众平台下载验证文件，并放到当前目录。" -ForegroundColor Yellow
    Write-Host "验证文件名类似：MP_verify_xxxxxx.txt" -ForegroundColor Yellow
    exit 1
}

# 获取第一个匹配的文件
$verifyFile = $verifyFiles[0].Name
Write-Host "✓ 找到验证文件: $verifyFile" -ForegroundColor Green

# 上传到测试环境（152.136.183.181）
Write-Host ""
Write-Host "📤 上传到测试环境..." -ForegroundColor Cyan
scp $verifyFile "root@${SERVER_IP}:${SERVER_PATH}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 测试环境上传成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "验证地址: https://152.136.183.181:3443/$verifyFile" -ForegroundColor Yellow
} else {
    Write-Host "❌ 测试环境上传失败" -ForegroundColor Red
    exit 1
}

# 上传到生产环境（jihuadz.xin）
Write-Host ""
Write-Host "📤 上传到生产环境..." -ForegroundColor Cyan
scp $verifyFile "root@${SERVER_IP}:/var/www/jihua/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 生产环境上传成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "验证地址: https://jihuadz.xin/$verifyFile" -ForegroundColor Yellow
} else {
    Write-Host "❌ 生产环境上传失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 验证文件上传完成！" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. 在微信公众平台验证域名" -ForegroundColor White
Write-Host "2. 保存配置" -ForegroundColor White
Write-Host "3. 测试微信登录功能" -ForegroundColor White
