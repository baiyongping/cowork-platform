import re

# 读取文件
with open('components/pages/GoalManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 定义要删除的重复模式（保存成果目标的三个函数）
pattern = r'  // 保存成果目标\s*\n  const handleSaveOutcome = async \(\) => \{[\s\S]*?  \};\s*\n\s*  // 编辑成果目标[\s\S]*?  \};\s*\n\s*  // 删除成果目标[\s\S]*?  \};\s*\n'

# 找到所有匹配
matches = list(re.finditer(pattern, content))
print(f"Found {len(matches)} blocks")

# 保留第一个，删除其余的
if len(matches) > 1:
    # 从后往前删除，避免索引变化
    for match in reversed(matches[1:]):
        print(f"Removing block at position {match.start()}-{match.end()}")
        content = content[:match.start()] + content[match.end():]
    
    # 写回文件
    with open('components/pages/GoalManagement.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Removed {len(matches) - 1} duplicate blocks. Kept 1.")
else:
    print("✅ No duplicates found or only 1 block exists.")
