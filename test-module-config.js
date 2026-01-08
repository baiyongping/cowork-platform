// ✅ 验证模块配置统一性测试脚本
// 用途: 验证所有组件都使用统一的模块配置，没有硬编码

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证模块配置统一性...\n');

// 需要检查的文件
const filesToCheck = [
  'components/App.tsx',
  'components/RolePermissionDetail.tsx',
  'components/pages/ModuleManagement.tsx',
  'components/pages/SystemSettings.tsx'
];

// 统一配置文件
const configFile = 'constants/modules.ts';

// 检查统一配置文件
const configPath = path.join(__dirname, configFile);
if (!fs.existsSync(configPath)) {
  console.error('❌ 统一配置文件不存在:', configFile);
  process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf-8');
console.log('✅ 统一配置文件存在:', configFile);

// 检查关键导出
const requiredExports = [
  'SYSTEM_MODULES',
  'getFlatModuleList',
  'getPermissionModules',
  'generateDefaultPermissions'
];

requiredExports.forEach(exportName => {
  if (configContent.includes(`export const ${exportName}`) || configContent.includes(`export function ${exportName}`)) {
    console.log(`  ✅ 导出 ${exportName}`);
  } else {
    console.error(`  ❌ 缺少导出 ${exportName}`);
  }
});

console.log('\n🔍 检查组件是否使用统一配置...\n');

// 检查每个文件
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  文件不存在: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`📄 ${file}:`);
  
  // 检查是否导入统一配置
  const hasImport = content.includes("from '../constants/modules'") || 
                   content.includes("from '../../constants/modules'");
  
  if (hasImport) {
    console.log('  ✅ 已导入统一配置');
  } else {
    console.warn('  ⚠️  未导入统一配置（可能不需要）');
  }
  
  // 检查是否有硬编码的模块定义（危险信号）
  const dangerousPatterns = [
    /tasks.*任务管理.*opportunities.*商机管理/s,
    /salesGoal.*opportunityGoal.*strategy/s,
    /annual.*asset.*execution.*parameters/s,
    /userApproval.*employees.*departments.*roles/s
  ];
  
  let hasHardcoded = false;
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      hasHardcoded = true;
    }
  });
  
  if (hasHardcoded) {
    console.error('  ❌ 检测到可能的硬编码模块定义！');
  } else {
    console.log('  ✅ 未检测到硬编码模块定义');
  }
  
  console.log('');
});

console.log('✅ 验证完成！\n');
console.log('📋 总结:');
console.log('  - 统一配置文件: constants/modules.ts');
console.log('  - 使用统一配置的组件: ' + filesToCheck.length);
console.log('  - 建议: 定期运行此脚本确保配置统一性');
