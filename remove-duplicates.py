#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""删除GoalManagement.tsx中重复的handleSaveSafeguard函数"""

file_path = r"d:\project\cowork12-21\components\pages\GoalManagement.tsx"

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 要删除的重复函数起始行(0-based,所以减1)
duplicate_starts = [
    479,   # 第2个重复(行480) - 1
    581,   # 第3个重复(行582) - 1
    775,   # 第4个重复(行776) - 1
    896,   # 第5个重复(行897) - 1
    973,   # 第6个重复(行974) - 1
    1201,  # 第7个重复(行1202) - 1
    1645,  # 第8个重复(行1646) - 1
    1768,  # 第9个重复(行1769) - 1
    1928,  # 第10个重复(行1929) - 1
    2008,  # 第11个重复(行2009) - 1
    2099   # 第12个重复(行2100) - 1
]

# 标记要删除的行
lines_to_remove = set()
for start_line in duplicate_starts:
    # 每个重复函数58行(从  // 保存保障措施 开始到 }; 结束,再加一个空行)
    for i in range(start_line, min(start_line + 59, len(lines))):
        lines_to_remove.add(i)

print(f"📊 原文件共{len(lines)}行")
print(f"🗑️  将删除{len(lines_to_remove)}行重复代码")

# 创建新内容
new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]

print(f"✅ 新文件共{len(new_lines)}行")

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✨ 成功删除所有重复的handleSaveSafeguard函数定义!")
