/**
 * 测试模块权限配置
 * 验证新模块是否正确纳入权限管理范围
 */

const { SYSTEM_MODULES, generateDefaultPermissions, getAllModuleIds, getModuleName } = require('./constants/modules.ts');

console.log('========================================');
console.log('📋 模块权限配置测试');
console.log('========================================\n');

// 1. 测试模块总数
console.log('1️⃣ 模块总数统计:');
console.log('-------------------');
const simpleModules = SYSTEM_MODULES.filter(m => !m.hasChildren);
const complexModules = SYSTEM_MODULES.filter(m => m.hasChildren);
const totalSubModules = complexModules.reduce((sum, m) => sum + (m.children?.length || 0), 0);

console.log(`✅ 一级模块总数: ${SYSTEM_MODULES.length}`);
console.log(`   - 简单模块: ${simpleModules.length}`);
console.log(`   - 复杂模块: ${complexModules.length}`);
console.log(`✅ 子模块总数: ${totalSubModules}`);
console.log(`✅ 功能点总数: ${SYSTEM_MODULES.length + totalSubModules}\n`);

// 2. 验证目标管理子模块
console.log('2️⃣ 目标管理子模块验证:');
console.log('-------------------');
const goalModule = SYSTEM_MODULES.find(m => m.id === 'goal');
if (goalModule?.children) {
  console.log(`✅ 子模块数量: ${goalModule.children.length}`);
  goalModule.children.forEach((child, index) => {
    console.log(`   ${index + 1}. ${child.name} (${child.id})`);
  });
  
  // 检查是否删除了 opportunityGoal
  const hasOpportunityGoal = goalModule.children.some(c => c.id === 'opportunityGoal');
  console.log(`${hasOpportunityGoal ? '❌' : '✅'} opportunityGoal 已删除: ${!hasOpportunityGoal}`);
  
  // 检查新增的模块
  const newModules = ['outcome', 'decomposition', 'executionMap', 'dimensionSettings'];
  newModules.forEach(moduleId => {
    const exists = goalModule.children.some(c => c.id === moduleId);
    console.log(`${exists ? '✅' : '❌'} ${moduleId} 已新增: ${exists}`);
  });
} else {
  console.log('❌ 目标管理模块未找到或无子模块');
}
console.log('');

// 3. 验证预算管理子模块
console.log('3️⃣ 预算管理子模块验证:');
console.log('-------------------');
const budgetModule = SYSTEM_MODULES.find(m => m.id === 'budget');
if (budgetModule?.children) {
  console.log(`✅ 子模块数量: ${budgetModule.children.length}`);
  budgetModule.children.forEach((child, index) => {
    console.log(`   ${index + 1}. ${child.name} (${child.id})`);
  });
  
  // 检查 cashFlow 是否新增
  const hasCashFlow = budgetModule.children.some(c => c.id === 'cashFlow');
  console.log(`${hasCashFlow ? '✅' : '❌'} cashFlow 已新增: ${hasCashFlow}`);
  
  // 检查 hr 名称是否更新
  const hrModule = budgetModule.children.find(c => c.id === 'hr');
  if (hrModule) {
    const isRenamed = hrModule.name === '薪酬预算';
    console.log(`${isRenamed ? '✅' : '❌'} hr 已改名为"薪酬预算": ${isRenamed} (当前: ${hrModule.name})`);
  }
} else {
  console.log('❌ 预算管理模块未找到或无子模块');
}
console.log('');

// 4. 验证个人信息模块
console.log('4️⃣ 个人信息模块验证:');
console.log('-------------------');
const profileModule = SYSTEM_MODULES.find(m => m.id === 'profile');
if (profileModule) {
  console.log(`✅ 个人信息模块已创建`);
  if (profileModule.children) {
    console.log(`✅ 子模块数量: ${profileModule.children.length}`);
    profileModule.children.forEach((child, index) => {
      console.log(`   ${index + 1}. ${child.name} (${child.id})`);
    });
  }
} else {
  console.log('❌ 个人信息模块未找到');
}
console.log('');

// 5. 测试权限生成函数
console.log('5️⃣ 权限生成函数测试:');
console.log('-------------------');
try {
  const defaultPermissions = generateDefaultPermissions();
  console.log('✅ generateDefaultPermissions() 执行成功');
  
  // 验证目标管理权限
  if (defaultPermissions.goal) {
    console.log(`✅ 目标管理权限已生成`);
    const goalPermKeys = Object.keys(defaultPermissions.goal);
    console.log(`   - 子模块数量: ${goalPermKeys.length}`);
    console.log(`   - 包含 outcome: ${goalPermKeys.includes('outcome')}`);
    console.log(`   - 包含 executionMap: ${goalPermKeys.includes('executionMap')}`);
  } else {
    console.log('❌ 目标管理权限未生成');
  }
  
  // 验证预算管理权限
  if (defaultPermissions.budget) {
    console.log(`✅ 预算管理权限已生成`);
    const budgetPermKeys = Object.keys(defaultPermissions.budget);
    console.log(`   - 子模块数量: ${budgetPermKeys.length}`);
    console.log(`   - 包含 cashFlow: ${budgetPermKeys.includes('cashFlow')}`);
  } else {
    console.log('❌ 预算管理权限未生成');
  }
  
  // 验证个人信息权限
  if (defaultPermissions.profile) {
    console.log(`✅ 个人信息权限已生成`);
    const profilePermKeys = Object.keys(defaultPermissions.profile);
    console.log(`   - 子模块数量: ${profilePermKeys.length}`);
  } else {
    console.log('❌ 个人信息权限未生成');
  }
  
  console.log('\n📄 生成的默认权限结构:');
  console.log(JSON.stringify(defaultPermissions, null, 2));
} catch (error) {
  console.error('❌ 权限生成函数执行失败:', error);
}
console.log('');

// 6. 测试模块ID获取
console.log('6️⃣ 模块ID列表测试:');
console.log('-------------------');
try {
  const allModuleIds = getAllModuleIds();
  console.log(`✅ getAllModuleIds() 执行成功`);
  console.log(`✅ 总共 ${allModuleIds.length} 个模块ID`);
  console.log(`   - 包含 goal.outcome: ${allModuleIds.includes('goal.outcome')}`);
  console.log(`   - 包含 goal.executionMap: ${allModuleIds.includes('goal.executionMap')}`);
  console.log(`   - 包含 budget.cashFlow: ${allModuleIds.includes('budget.cashFlow')}`);
  console.log(`   - 包含 profile.info: ${allModuleIds.includes('profile.info')}`);
} catch (error) {
  console.error('❌ 模块ID获取失败:', error);
}
console.log('');

console.log('========================================');
console.log('✅ 模块权限配置测试完成');
console.log('========================================\n');
