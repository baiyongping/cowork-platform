/**
 * 🎯 初始化模块排序数据（云函数版本）
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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
  { moduleCode: 'modules', order: 10, level: 1, parentCode: null },
  { moduleCode: 'settings', order: 11, level: 1, parentCode: null },
  
  // 任务管理二级功能
  { moduleCode: 'tasks.myTasks', order: 0, level: 2, parentCode: 'tasks' },
  { moduleCode: 'tasks.teamTasks', order: 1, level: 2, parentCode: 'tasks' },
  { moduleCode: 'tasks.allTasks', order: 2, level: 2, parentCode: 'tasks' },
  
  // 问题管理二级功能
  { moduleCode: 'issues.myIssues', order: 0, level: 2, parentCode: 'issues' },
  { moduleCode: 'issues.allIssues', order: 1, level: 2, parentCode: 'issues' },
  
  // 商机管理二级功能
  { moduleCode: 'opportunities.myOpportunities', order: 0, level: 2, parentCode: 'opportunities' },
  { moduleCode: 'opportunities.allOpportunities', order: 1, level: 2, parentCode: 'opportunities' },
  
  // 项目管理二级功能
  { moduleCode: 'projects.myProjects', order: 0, level: 2, parentCode: 'projects' },
  { moduleCode: 'projects.allProjects', order: 1, level: 2, parentCode: 'projects' },
  
  // 目标管理二级功能
  { moduleCode: 'goal.list', order: 0, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.decomposition', order: 1, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.strategyManagement', order: 2, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.quarterlyMeasures', order: 3, level: 2, parentCode: 'goal' },
  
  // 预算管理二级功能
  { moduleCode: 'budget.subjects', order: 0, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.execution', order: 1, level: 2, parentCode: 'budget' },
  
  // 会议管理二级功能
  { moduleCode: 'meetings.list', order: 0, level: 2, parentCode: 'meetings' },
  { moduleCode: 'meetings.minutes', order: 1, level: 2, parentCode: 'meetings' },
  
  // 系统设置二级功能
  { moduleCode: 'settings.userApproval', order: 0, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.employees', order: 1, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.departments', order: 2, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.roles', order: 3, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.typeSettings', order: 4, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.operationLogs', order: 5, level: 2, parentCode: 'settings' }
];

exports.main = async (event, context) => {
  try {
    console.log('🔍 检查 moduleOrder 集合是否已有数据...');
    
    // 查询是否已有数据
    const existingData = await db.collection('moduleOrder').limit(1).get();
    
    if (existingData.data && existingData.data.length > 0) {
      console.log('⚠️  moduleOrder 集合已有数据，跳过初始化');
      return {
        success: true,
        message: 'moduleOrder 集合已有数据，跳过初始化',
        count: existingData.data.length
      };
    }
    
    console.log('✅ moduleOrder 集合为空，开始初始化...');
    
    // 批量插入数据
    const promises = initialModuleOrder.map(item => {
      return db.collection('moduleOrder').add({
        data: {
          ...item,
          updatedAt: db.serverDate()
        }
      });
    });
    
    await Promise.all(promises);
    
    console.log(`✅ 初始化完成！共插入 ${initialModuleOrder.length} 条记录`);
    
    // 验证数据
    const verifyResult = await db.collection('moduleOrder').count();
    console.log(`📊 验证结果: moduleOrder 集合共有 ${verifyResult.total} 条记录`);
    
    return {
      success: true,
      message: '模块排序数据初始化成功',
      count: initialModuleOrder.length,
      verified: verifyResult.total
    };
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
