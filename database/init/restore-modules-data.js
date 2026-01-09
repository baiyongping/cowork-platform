/**
 * 恢复模块配置数据
 * 
 * 问题：update-module-metadata.js 错误地覆盖了整个文档
 * 解决：从原始数据恢复完整的模块配置
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 完整的模块配置数据（从 import-modules-data.js 复制）
 */
const MODULES_DATA = [
  // ===== 一级模块 =====
  {
    _id: 'module-tasks',
    name: '任务管理',
    description: '管理和跟踪任务进度',
    icon: 'CheckSquare',
    parentId: null,
    order: 1,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-opportunities',
    name: '商机管理',
    description: '管理销售商机和客户关系',
    icon: 'TrendingUp',
    parentId: null,
    order: 2,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-projects',
    name: '项目管理',
    description: '管理项目进度和资源',
    icon: 'Briefcase',
    parentId: null,
    order: 3,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-goals',
    name: '目标管理',
    description: '设定和跟踪团队目标',
    icon: 'Target',
    parentId: null,
    order: 4,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-budget',
    name: '预算管理',
    description: '管理预算分配和执行',
    icon: 'DollarSign',
    parentId: null,
    order: 5,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-issues',
    name: '问题管理',
    description: '记录和跟踪问题解决',
    icon: 'AlertCircle',
    parentId: null,
    order: 6,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-users',
    name: '员工管理',
    description: '管理员工信息和权限',
    icon: 'Users',
    parentId: null,
    order: 7,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-meetings',
    name: '例会管理',
    description: '管理例会安排和纪要',
    icon: 'Calendar',
    parentId: null,
    order: 8,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-hr-expense',
    name: '人费管理',
    description: '管理人员费用支出',
    icon: 'Receipt',
    parentId: null,
    order: 9,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-strategies',
    name: '年度策略',
    description: '制定和跟踪年度战略',
    icon: 'Compass',
    parentId: null,
    order: 10,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
    }
  },
  
  {
    _id: 'module-settings',
    name: '系统设置',
    description: '系统配置和管理',
    icon: 'Settings',
    parentId: null,
    order: 11,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'admin',
    metadata: {
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
    }
  },
  
  // ===== 二级模块 =====
  {
    _id: 'module-salesGoal',
    name: '销售目标',
    description: '销售相关目标管理',
    icon: 'DollarSign',
    parentId: 'module-goals',
    order: 1,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
      collections: ['goals'],
      fields: {
        goals: [
          { name: 'type', type: 'string', description: '目标类型（sales）' },
          { name: 'targetValue', type: 'number', description: '销售目标值' }
        ]
      },
      routes: [],
      apis: ['goal-management']
    }
  },
  
  {
    _id: 'module-budgetGoal',
    name: '预算目标',
    description: '预算相关目标管理',
    icon: 'TrendingUp',
    parentId: 'module-goals',
    order: 2,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
      collections: ['goals'],
      fields: {
        goals: [
          { name: 'type', type: 'string', description: '目标类型（budget）' },
          { name: 'targetValue', type: 'number', description: '预算目标值' }
        ]
      },
      routes: [],
      apis: ['goal-management']
    }
  },
  
  {
    _id: 'module-profitGoal',
    name: '利润目标',
    description: '利润相关目标管理',
    icon: 'Activity',
    parentId: 'module-goals',
    order: 3,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
      collections: ['goals'],
      fields: {
        goals: [
          { name: 'type', type: 'string', description: '目标类型（profit）' },
          { name: 'targetValue', type: 'number', description: '利润目标值' }
        ]
      },
      routes: [],
      apis: ['goal-management']
    }
  },
  
  {
    _id: 'module-outcomeGoal',
    name: '成果目标',
    description: '成果相关目标管理',
    icon: 'Award',
    parentId: 'module-goals',
    order: 4,
    isEnabled: true,
    isCustom: false,
    defaultPermission: 'view',
    metadata: {
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
  }
];

/**
 * 恢复单个模块数据
 */
async function restoreModule(moduleData) {
  try {
    // 使用 doc().set() 完整替换文档
    await db.collection('modulesConfig')
      .doc(moduleData._id)
      .set({
        data: {
          ...moduleData,
          updatedAt: new Date(),
          restoredAt: new Date()
        }
      });
    
    console.log(`✅ 恢复成功: ${moduleData._id} (${moduleData.name})`);
    return true;
  } catch (error) {
    console.error(`❌ 恢复失败: ${moduleData._id}`, error.message);
    return false;
  }
}

/**
 * 批量恢复所有模块
 */
async function restoreAllModules() {
  console.log('🔧 开始恢复模块配置数据\n');
  console.log('═'.repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const moduleData of MODULES_DATA) {
    const success = await restoreModule(moduleData);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 恢复统计:');
  console.log(`   ✅ 成功: ${successCount} 个模块`);
  console.log(`   ❌ 失败: ${errorCount} 个模块`);
  console.log('═'.repeat(60));
  
  return {
    success: successCount,
    error: errorCount
  };
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    const result = await restoreAllModules();
    return {
      success: true,
      message: '模块配置恢复完成',
      data: result
    };
  } catch (error) {
    console.error('❌ 恢复模块配置失败:', error);
    return {
      success: false,
      message: error.message,
      error: error.stack
    };
  }
};

// 如果直接运行脚本
if (require.main === module) {
  restoreAllModules()
    .then(() => {
      console.log('\n✅ 恢复脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 恢复脚本执行失败:', error);
      process.exit(1);
    });
}
