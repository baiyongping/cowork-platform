/**
 * 🎯 初始化模块排序数据
 * 
 * 功能说明：
 * 1. 检查 moduleOrder 集合是否已有数据
 * 2. 如果没有，则插入初始排序数据
 * 3. 支持一级模块和二级功能的排序
 * 
 * 使用方式：
 * node database/init-module-order.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb' // 生产环境
});

const db = app.database();

// 初始化数据
const initialModuleOrder = [
  // 一级模块
  { moduleCode: 'dashboard', order: 0, level: 1, parentCode: null },
  { moduleCode: 'tasks', order: 1, level: 1, parentCode: null },
  { moduleCode: 'issues', order: 2, level: 1, parentCode: null },
  { moduleCode: 'opportunities', order: 3, level: 1, parentCode: null },
  { moduleCode: 'projects', order: 4, level: 1, parentCode: null },
  { moduleCode: 'goal', order: 5, level: 1, parentCode: null },
  { moduleCode: 'budget', order: 6, level: 1, parentCode: null },
  { moduleCode: 'meetings', order: 7, level: 1, parentCode: null },
  { moduleCode: 'performance', order: 8, level: 1, parentCode: null },
  { moduleCode: 'business', order: 9, level: 1, parentCode: null },
  { moduleCode: 'moduleManagement', order: 10, level: 1, parentCode: null },
  { moduleCode: 'settings', order: 11, level: 1, parentCode: null },
  
  // 目标管理二级功能
  { moduleCode: 'goal.salesGoal', order: 0, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.opportunityGoal', order: 1, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.productOrder', order: 2, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.strategy', order: 3, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.outcome', order: 4, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.decomposition', order: 5, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.execution', order: 6, level: 2, parentCode: 'goal' },
  
  // 预算管理二级功能
  { moduleCode: 'budget.annual', order: 0, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.execution', order: 1, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.asset', order: 2, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.hr', order: 3, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.parameters', order: 4, level: 2, parentCode: 'budget' },
  
  // 系统设置二级功能
  { moduleCode: 'settings.userApproval', order: 0, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.employees', order: 1, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.departments', order: 2, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.roles', order: 3, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.typeSettings', order: 4, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.operationLogs', order: 5, level: 2, parentCode: 'settings' }
];

async function initModuleOrder() {
  try {
    console.log('🔍 检查 moduleOrder 集合是否已有数据...');
    
    // 查询是否已有数据
    const result = await db.collection('moduleOrder').limit(1).get();
    
    if (result.data && result.data.length > 0) {
      console.log('⚠️  moduleOrder 集合已有数据，跳过初始化');
      console.log(`   当前记录数: ${result.data.length}`);
      return;
    }
    
    console.log('✅ moduleOrder 集合为空，开始初始化...');
    
    // 批量插入数据
    const promises = initialModuleOrder.map(item => {
      return db.collection('moduleOrder').add({
        ...item,
        updatedAt: new Date()
      });
    });
    
    await Promise.all(promises);
    
    console.log(`✅ 初始化完成！共插入 ${initialModuleOrder.length} 条记录`);
    console.log('   - 一级模块: 12 个');
    console.log('   - 二级功能: 19 个');
    
    // 验证数据
    const verifyResult = await db.collection('moduleOrder').count();
    console.log(`\n📊 验证结果: moduleOrder 集合共有 ${verifyResult.total} 条记录`);
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initModuleOrder()
  .then(() => {
    console.log('\n🎉 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });
