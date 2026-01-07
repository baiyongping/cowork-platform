# 删除重复的handleSafeguard函数

$file = "d:\project\cowork12-21\components\pages\GoalManagement.tsx"

Write-Host "📖 读取文件..."
$lines = Get-Content $file

Write-Host "📋 原始行数: $($lines.Count)"

# 找到所有handleSaveSafeguard函数的行号  
$functionLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'const handleSaveSafeguard = async') {
        $functionLines += $i
    }
}

Write-Host "🔍 找到 $($functionLines.Count) 个handleSaveSafeguard函数"

if ($functionLines.Count -le 1) {
    Write-Host "✅ 没有重复,无需处理"
    exit 0
}

# 对于每个重复的函数(从第2个开始),找到并删除它
$newLines = @()
$skipUntil = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    # 如果当前在跳过区域内,继续
    if ($i -lt $skipUntil) {
        continue
    }
    
    # 检查是否是重复函数的开始(从第2个开始)
    $isDuplicate = $false
    for ($j = 1; $j -lt $functionLines.Count; $j++) {
        if ($i -eq $functionLines[$j]) {
            $isDuplicate = $true
            
            # 找到这个函数的结束位置(匹配的};)
            $braceCount = 0
            $inFunction = $false
            
            for ($k = $i; $k -lt $lines.Count; $k++) {
                $line = $lines[$k]
                $openBraces = ($line.ToCharArray() | Where-Object {$_ -eq '{'}).Count
                $closeBraces = ($line.ToCharArray() | Where-Object {$_ -eq '}'}).Count
                
                $braceCount += $openBraces
                $braceCount -= $closeBraces
                
                if ($openBraces -gt 0) {
                    $inFunction = $true
                }
                
                # 找到匹配的结束
                if ($inFunction -and $braceCount -eq 0 -and $line.Trim() -eq '};') {
                    $skipUntil = $k + 1
                    Write-Host "🗑️  删除重复函数: 行 $($i+1) 到 $($k+1)"
                    break
                }
            }
            break
        }
    }
    
    # 如果不是重复,则保留这行
    if (-not $isDuplicate) {
        $newLines += $lines[$i]
    }
}

Write-Host "📋 处理后行数: $($newLines.Count)"
Write-Host "🗑️  删除了 $($lines.Count - $newLines.Count) 行"

# 保存文件 - 使用正确的方法
[System.IO.File]::WriteAllLines($file, $newLines, [System.Text.Encoding]::UTF8)

Write-Host "✅ 文件已更新"

# 验证
$verifyCount = (Select-String -Path $file -Pattern 'const handleSaveSafeguard = async' | Measure-Object).Count
Write-Host "🔍 剩余handleSafeguard函数: $verifyCount"
