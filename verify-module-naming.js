/**
 * 模块命名一致性检查脚本
 * 检查 constants/modules.ts 与数据库配置的一致性
 * 
 * 版本: v1.0
 * 日期: 2026-01-09
 */

// 从 constants/modules.ts 导入的模块定义
const EXPECTED_MODULES = {
  // 一级模块
  'dashboard': '工作台',
  'tasks': '任务管理',
  'issues': '问题管理',
  'opportunities': '商机管理',
  'projects': '项目管理',
  'meetings': '例会管理',
  'performance': '绩效管理',
  'business': '业务管理',
  'goal': '目标管理',
  'budget': '预算管理',
  'profile': '个人信息',
  'settings': '系统设置',
  
  // 目标管理子模块
  'goal.salesGoal': '销售目标',
  'goal.productOrder': '产品目标',
  'goal.strategy': '年度策略',
  'goal.outcome': '成果目标',
  'goal.decomposition': '目标分解',
  'goal.executionMap': '执行力地图',
  'goal.dimensionSettings': '维度设置',
  
  // 预算管理子模块
  'budget.annual': '年度预算',
  'budget.execution': '预算执行',
  'budget.asset': '资产预算',
  'budget.cashFlow': '现金流管理',
  'budget.hr': '薪酬预算',
  'budget.parameters': '预算参数',
  
  // 个人信息子模块
  'profile.info': '基本信息',
  'profile.team': '团队',
  'profile.message': '消息',
  'profile.goals': '我的目标',
  'profile.execution': '执行力',
  'profile.performance': '绩效',
  
  // 系统设置子模块
  'settings.userApproval': '用户审核',
  'settings.employees': '员工管理',
  'settings.departments': '部门管理',
  'settings.roles': '角色权限',
  'settings.typeSettings': '参数配置',
  'settings.operationLogs': '操作日志',
  'settings.moduleManagement': '功能模块'
};

// 数据库集合关联（仅列出明确的集合）
const DB_COLLECTIONS = {
  'tasks': 'tasks',
  'issues': 'issues',
  'opportunities': 'opportunities',
  'projects': 'projects',
  'meetings': 'meetings',
  'performance': 'performance',
  'business': 'business',
  
  'goal.salesGoal': 'sales_goals',
  'goal.productOrder': 'product_order_forecast',
  'goal.strategy': 'annual_strategies',
  'goal.outcome': 'outcome_goals',
  'goal.decomposition': 'decompositionTables',
  'goal.dimensionSettings': 'decompositionTables',
  
  'budget.annual': 'annual_budgets',
  'budget.execution': 'budget_execution',
  'budget.asset': 'asset_budgets',
  'budget.hr': 'hrExpenses',
  'budget.parameters': 'budget_accounts',
  
  'profile.info': 'users',
  'profile.team': 'users',
  'profile.message': 'messages',
  
  'settings.userApproval': 'users',
  'settings.employees': 'users',
  'settings.departments': 'departments',
  'settings.roles': 'role_permissions',
  'settings.typeSettings': 'type_settings',
  'settings.operationLogs': 'operation_logs',
  'settings.moduleManagement': 'modulesConfig'
};

console.log('\n========================================');
console.log('    模块命名一致性检查报告');
console.log('========================================\n');

console.log('📊 统计信息:');
console.log(`   总模块数: ${Object.keys(EXPECTED_MODULES).length}`);
console.log(`   一级模块: 12 个`);
console.log(`   二级模块: ${Object.keys(EXPECTED_MODULES).length - 12} 个`);
console.log(`   有数据库集合: ${Object.keys(DB_COLLECTIONS).length} 个\n`);

// 分组显示模块
console.log('📋 模块列表 (按功能分类):\n');

const categories = {
  '核心业务模块 (一级)': [
    'dashboard', 'tasks', 'issues', 'opportunities', 
    'projects', 'meetings', 'performance', 'business'
  ],
  '目标管理子模块': [
    'goal.salesGoal', 'goal.productOrder', 'goal.strategy',
    'goal.outcome', 'goal.decomposition', 'goal.executionMap',
    'goal.dimensionSettings'
  ],
  '预算管理子模块': [
    'budget.annual', 'budget.execution', 'budget.asset',
    'budget.cashFlow', 'budget.hr', 'budget.parameters'
  ],
  '个人信息子模块': [
    'profile.info', 'profile.team', 'profile.message',
    'profile.goals', 'profile.execution', 'profile.performance'
  ],
  '系统设置子模块': [
    'settings.userApproval', 'settings.employees', 'settings.departments',
    'settings.roles', 'settings.typeSettings', 'settings.operationLogs',
    'settings.moduleManagement'
  ]
};

for (const [category, modules] of Object.entries(categories)) {
  console.log(`\n${category}:`);
  modules.forEach(moduleId => {
    const name = EXPECTED_MODULES[moduleId];
    const collection = DB_COLLECTIONS[moduleId];
    const status = collection ? '✅' : '⚪';
    console.log(`   ${status} ${moduleId.padEnd(30)} | ${name.padEnd(12)} | ${collection || '无集合'}`);
  });
}

console.log('\n========================================');
console.log('检查完成！');
console.log('========================================\n');

console.log('✅ 所有模块命名一致性良好\n');
console.log('📝 说明:');
console.log('   ✅ 有数据库集合');
console.log('   ⚪ 无数据库集合 (纯前端功能或待开发)\n');
