// 临时脚本：移除populate调用
const fs = require('fs');
const path = require('path');

function removePopulateFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 使用正则表达式移除.populate()调用，保持链式调用
    content = content.replace(/\s*\.populate\([^)]+\)/g, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已处理: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ 处理失败 ${filePath}:`, error.message);
  }
}

// 处理文件
const files = [
  path.join(__dirname, 'src/controllers/userController.js'),
  path.join(__dirname, 'src/controllers/taskController.js')
];

console.log('🔧 开始移除populate调用...\n');
files.forEach(removePopulateFromFile);
console.log('\n✅ 完成！');
