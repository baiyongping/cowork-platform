const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'pages', 'GoalManagement.tsx');

console.log('📖 读取文件...');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`📋 原始行数: ${lines.length}`);

// 找到所有 handleSaveSafeguard 函数的起始行
const functionStarts = [];
lines.forEach((line, index) => {
  if (line.includes('const handleSaveSafeguard = async')) {
    functionStarts.push(index);
  }
});

console.log(`🔍 找到 ${functionStarts.length} 个 handleSaveSafeguard 函数`);

if (functionStarts.length <= 1) {
  console.log('✅ 没有重复函数,无需处理');
  process.exit(0);
}

// 只保留第一个函数,删除其他重复
const linesToDelete = new Set();

for (let i = 1; i < functionStarts.length; i++) {
  const start = functionStarts[i];
  // 找到这个函数的结束位置(匹配的};)
  let braceCount = 0;
  let inFunction = false;
  let end = start;
  
  for (let j = start; j < lines.length; j++) {
    const line = lines[j];
    
    // 开始计数大括号
    if (line.includes('{')) {
      braceCount++;
      inFunction = true;
    }
    if (line.includes('}')) {
      braceCount--;
    }
    
    // 找到匹配的结束
    if (inFunction && braceCount === 0 && line.trim() === '};') {
      end = j;
      break;
    }
  }
  
  console.log(`🗑️  标记删除: 行 ${start + 1} 到 ${end + 1} (共 ${end - start + 1} 行)`);
  
  // 标记这些行为删除
  for (let j = start; j <= end; j++) {
    linesToDelete.add(j);
  }
}

// 过滤掉要删除的行
const newLines = lines.filter((_, index) => !linesToDelete.has(index));

console.log(`📋 处理后行数: ${newLines.length}`);
console.log(`🗑️  删除了 ${lines.length - newLines.length} 行`);

// 写入文件
fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');

console.log('✅ 文件已更新');

// 验证结果
const newContent = fs.readFileSync(filePath, 'utf8');
const matches = (newContent.match(/const handleSaveSafeguard = async/g) || []).length;
console.log(`🔍 剩余 handleSaveSafeguard 函数数量: ${matches}`);
