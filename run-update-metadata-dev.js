/**
 * 测试环境 - 更新模块元数据
 * 通过调用云函数的方式更新 metadata
 */

const cloudbase = require('@cloudbase/node-sdk');

// 测试环境 ID
const TEST_ENV = 'jihua-oa-dev-3goht9irae4d949f';

console.log('🎯 目标环境: 测试环境');
console.log(`📦 环境ID: ${TEST_ENV}\n`);

// 初始化 CloudBase
const app = cloudbase.init({
  env: TEST_ENV
});

const db = app.database();

/**
 * 模块元数据映射
 */
const MODULE_METADATA = {
  // ===== 一级模块 =====
  'module-tasks': {
    collections: ['tasks', 'taskComments'],
    fields: {
      tasks: [
        { name: 'name', type: 'string', description: '任务名称' },
        { name: 'status', type: 'string', description: '任务状态' },
        { name: 'priority', type: 'string', description: '优先级' },
        { name: 'owner', type: 'string', description: '负责人' }
      ],
      taskComments: [
        { name: 'content', type: 'string', description: '评论内容' },
        { name: 'taskId', type: 'string', description: '任务ID' }
      ]
    },
    routes: ['/task-management'],
    apis: ['task-management']
  },
  
  'module-opportunities': {
    collections: ['opportunities', 'opportunityActions'],
    fields: {
      opportunities: [
        { name: 'customer', type: 'string', description: '客户名称' },
        { name: 'amount', type: 'number', description: '商机金额' },
        { name: 'status', type: 'string', description: '商机状态' },
        { name: 'owner', type: 'string', description: '负责人' }
      ]
    },
    routes: ['/opportunity-management'],
    apis: ['opportunity-management']
  },
  
  'module-projects': {
    collections: ['projects', 'projectTasks'],
    fields: {
      projects: [
        { name: 'name', type: 'string', description: '项目名称' },
        { name: 'status', type: 'string', description: '项目状态' },
        { name: 'progress', type: 'number', description: '项目进度' }
      ]
    },
    routes: ['/project-management'],
    apis: ['project-management']
  },
  
  'module-goals': {
    collections: ['goals', 'goalDecompositions', 'goalDecompositionDimensions', 'goalDecompositionHistory', 'decompositionTables'],
    fields: {
      goals: [
        { name: 'name', type: 'string', description: '目标名称' },
        { name: 'targetValue', type: 'number', description: '目标值' },
        { name: 'actualValue', type: 'number', description: '实际值' }
      ],
      goalDecompositions: [
        { name: 'goalId', type: 'string', description: '目标ID' },
        { name: 'dimension', type: 'string', description: '分解维度' }
      ],
      decompositionTables: [
        { name: 'name', type: 'string', description: '分解表名称' },
        { name: 'goalId', type: 'string', description: '关联目标ID' }
      ]
    },
    routes: ['/goal-management', '/goal-decomposition', '/goal-decomposition-dimension-settings'],
    apis: ['goal-management', 'goal-decomposition']
  },
  
  'module-budget': {
    collections: ['budgetSubjects', 'budgetExecutions'],
    fields: {
      budgetSubjects: [
        { name: 'name', type: 'string', description: '预算科目名称' },
        { name: 'amount', type: 'number', description: '预算金额' }
      ],
      budgetExecutions: [
        { name: 'subjectId', type: 'string', description: '科目ID' },
        { name: 'amount', type: 'number', description: '执行金额' }
      ]
    },
    routes: ['/budget-management', '/budget-execution'],
    apis: ['budget-management']
  },
  
  'module-issues': {
    collections: ['issueRecords'],
    fields: {
      issueRecords: [
        { name: 'title', type: 'string', description: '问题标题' },
        { name: 'status', type: 'string', description: '问题状态' },
        { name: 'severity', type: 'string', description: '严重程度' }
      ]
    },
    routes: ['/issue-management'],
    apis: ['issue-management']
  },
  
  'module-users': {
    collections: ['users'],
    fields: {
      users: [
        { name: 'name', type: 'string', description: '用户姓名' },
        { name: 'email', type: 'string', description: '邮箱' },
        { name: 'role', type: 'string', description: '角色' },
        { name: 'department', type: 'string', description: '部门' }
      ]
    },
    routes: ['/user-management'],
    apis: ['user-management']
  },
  
  'module-meetings': {
    collections: ['meetings', 'meetingMinutes'],
    fields: {
      meetings: [
        { name: 'title', type: 'string', description: '会议主题' },
        { name: 'startTime', type: 'date', description: '开始时间' },
        { name: 'endTime', type: 'date', description: '结束时间' }
      ],
      meetingMinutes: [
        { name: 'meetingId', type: 'string', description: '会议ID' },
        { name: 'content', type: 'string', description: '会议纪要内容' }
      ]
    },
    routes: ['/meeting-management'],
    apis: ['meeting-management']
  },
  
  'module-hr-expense': {
    collections: ['hrExpenses'],
    fields: {
      hrExpenses: [
        { name: 'name', type: 'string', description: '费用名称' },
        { name: 'amount', type: 'number', description: '金额' },
        { name: 'type', type: 'string', description: '费用类型' }
      ]
    },
    routes: ['/hr-expense-management'],
    apis: ['hr-expense-management']
  },
  
  'module-strategies': {
    collections: ['annualStrategies', 'strategySafeguards', 'quarterlyMeasures'],
    fields: {
      annualStrategies: [
        { name: 'name', type: 'string', description: '策略名称' },
        { name: 'year', type: 'number', description: '年度' },
        { name: 'content', type: 'string', description: '策略内容' }
      ],
      strategySafeguards: [
        { name: 'strategyId', type: 'string', description: '策略ID' },
        { name: 'measure', type: 'string', description: '保障措施' }
      ]
    },
    routes: ['/annual-strategies'],
    apis: ['annual-strategies', 'quarterly-measures']
  },
  
  'module-settings': {
    collections: ['systemSettings', 'modulesConfig', 'userRolePermissions'],
    fields: {
      systemSettings: [
        { name: 'key', type: 'string', description: '配置键' },
        { name: 'value', type: 'any', description: '配置值' }
      ],
      modulesConfig: [
        { name: 'name', type: 'string', description: '模块名称' },
        { name: 'isEnabled', type: 'boolean', description: '是否启用' }
      ],
      userRolePermissions: [
        { name: 'userId', type: 'string', description: '用户ID' },
        { name: 'permissions', type: 'object', description: '权限配置' }
      ]
    },
    routes: ['/system-settings', '/module-management', '/role-permissions'],
    apis: ['module-management', 'user-management']
  },
  
  // ===== 二级模块 =====
  'module-salesGoal': {
    collections: ['goals'],
    fields: {
      goals: [
        { name: 'type', type: 'string', description: '目标类型（sales）' },
        { name: 'targetValue', type: 'number', description: '销售目标值' }
      ]
    },
    routes: [],
    apis: ['goal-management']
  },
  
  'module-budgetGoal': {
    collections: ['goals'],
    fields: {
      goals: [
        { name: 'type', type: 'string', description: '目标类型（budget）' },
        { name: 'targetValue', type: 'number', description: '预算目标值' }
      ]
    },
    routes: [],
    apis: ['goal-management']
  },
  
  'module-profitGoal': {
    collections: ['goals'],
    fields: {
      goals: [
        { name: 'type', type: 'string', description: '目标类型（profit）' },
        { name: 'targetValue', type: 'number', description: '利润目标值' }
      ]
    },
    routes: [],
    apis: ['goal-management']
  },
  
  'module-outcomeGoal': {
    collections: ['outcomeGoals', 'tasks'],
    fields: {
      outcomeGoals: [
        { name: 'name', type: 'string', description: '成果目标名称' },
        { name: 'description', type: 'string', description: '目标描述' }
      ],
      tasks: [
        { name: 'goalId', type: 'string', description: '关联成果目标ID' }
      ]
    },
    routes: [],
    apis: ['outcome-goal', 'task-management']
  }
};

/**
 * 更新单个模块的元数据
 */
async function updateModuleMetadata(moduleId, metadata) {
  try {
    const result = await db.collection('modulesConfig')
      .where({ _id: moduleId })
      .update({
        metadata: metadata,
        updatedAt: new Date(),
        lastModifiedBy: 'system'
      });
    
    if (result.updated > 0) {
      console.log(`✅ 更新成功: ${moduleId}`);
      return true;
    } else {
      console.log(`⚠️  模块不存在: ${moduleId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 更新失败: ${moduleId}`, error.message);
    return false;
  }
}

/**
 * 批量更新所有模块的元数据
 */
async function updateAllMetadata() {
  console.log('🚀 开始更新模块元数据信息\n');
  console.log('═'.repeat(60));
  
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (const [moduleId, metadata] of Object.entries(MODULE_METADATA)) {
    const success = await updateModuleMetadata(moduleId, metadata);
    if (success) {
      successCount++;
    } else {
      notFoundCount++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 更新统计:');
  console.log(`   ✅ 成功: ${successCount} 个模块`);
  console.log(`   ⚠️  未找到: ${notFoundCount} 个模块`);
  console.log(`   ❌ 失败: ${errorCount} 个模块`);
  console.log('═'.repeat(60));
  
  return {
    success: successCount,
    notFound: notFoundCount,
    error: errorCount
  };
}

// 执行更新
updateAllMetadata()
  .then(() => {
    console.log('\n✅ 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  });
