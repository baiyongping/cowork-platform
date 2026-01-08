// 直接部署云函数到开发环境
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log(' module-management 云函数部署工具');
console.log(' 目标环境: jihua-oa-dev-3goht9irae4d949f');
console.log('========================================');
console.log('');

// 读取云函数代码
const functionPath = path.join(__dirname, 'cloudfunctions', 'module-management');
const indexJsPath = path.join(functionPath, 'index.js');
const packageJsonPath = path.join(functionPath, 'package.json');
const configJsonPath = path.join(functionPath, 'config.json');

console.log('检查云函数文件...');
console.log('');

// 检查文件存在
const files = {
  'index.js': indexJsPath,
  'package.json': packageJsonPath,
  'config.json': configJsonPath
};

let allFilesExist = true;
for (const [name, filepath] of Object.entries(files)) {
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    console.log(`✓ ${name} (${stats.size} 字节)`);
  } else {
    console.log(`✗ ${name} 不存在`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('');
  console.log('错误: 缺少必要文件');
  process.exit(1);
}

console.log('');
console.log('读取代码内容...');

// 读取代码
const indexJs = fs.readFileSync(indexJsPath, 'utf-8');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

console.log(`✓ index.js (${indexJs.split('\n').length} 行)`);
console.log(`✓ package.json`);
console.log('');

console.log('========================================');
console.log('部署信息:');
console.log('========================================');
console.log(`函数名称: module-management`);
console.log(`环境 ID: jihua-oa-dev-3goht9irae4d949f`);
console.log(`代码行数: ${indexJs.split('\n').length}`);
console.log(`依赖包: ${Object.keys(packageJson.dependencies || {}).join(', ')}`);
console.log('');

console.log('========================================');
console.log('部署方式:');
console.log('========================================');
console.log('');
console.log('由于 CloudBase CLI 需要登录认证，');
console.log('建议使用以下方式部署:');
console.log('');
console.log('方式 1: 控制台部署（推荐）');
console.log('----------------------------------------');
console.log('1. 访问: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf');
console.log('2. 点击【新建】按钮');
console.log('3. 函数名称: module-management');
console.log('4. 运行环境: Nodejs 16.13');
console.log('5. 选择【在线编辑】');
console.log('6. 复制代码文件内容（已在记事本打开）');
console.log('7. 配置 package.json 依赖');
console.log('8. 保存并部署');
console.log('');

console.log('方式 2: CloudBase CLI 部署');
console.log('----------------------------------------');
console.log('前提: 已安装并登录 @cloudbase/cli');
console.log('');
console.log('命令:');
console.log('  cd cloudfunctions/module-management');
console.log('  tcb fn deploy module-management --env jihua-oa-dev-3goht9irae4d949f');
console.log('');

console.log('========================================');
console.log('');
console.log('正在打开相关文件和页面...');
console.log('');

// 打开控制台
const { spawn } = require('child_process');
spawn('cmd', ['/c', 'start', 'https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf']);

// 打开代码文件
setTimeout(() => {
  spawn('notepad.exe', [indexJsPath]);
}, 1000);

// 打开部署指南
setTimeout(() => {
  const guidePath = path.join(__dirname, 'module-management-deploy-guide-dev.md');
  if (fs.existsSync(guidePath)) {
    spawn('cmd', ['/c', 'start', guidePath]);
  }
}, 2000);

console.log('✓ 已打开控制台');
console.log('✓ 已打开代码文件（记事本）');
console.log('✓ 已打开部署指南');
console.log('');
console.log('========================================');
console.log('');
console.log('请按照控制台步骤完成部署！');
console.log('');
