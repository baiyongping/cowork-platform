/**
 * 初始化功能模块配置到数据�?
 * 将前�?constants/modules.ts 中的模块定义同步�?modulesConfig 集合
 * 
 * 📝 版本: v3.3 - 目标管理子模块调�?
 * 🗓�?更新时间: 2026-01-09
 * 📊 统计: 12个一级模�? 26个二级模�? �?8个模�?
 * 
 * �?目标管理子模�?7�?:
 * - goal.salesGoal (销售目�?
 * - goal.productGoal (产品目标, 原productOrder更名)
 * - goal.strategy (经营策略, 原年度策略更�?
 * - goal.outcome (成果目标)
 * - goal.decomposition (目标分解)
 * - goal.executionMap (执行力地�?
 * - goal.dimensionSettings (维度设置)
 * 
 * �?已移�?
 * - goal.quarterly (季度经营措施, 合并到经营策�?
 * - goal.safeguard (保障措施, 合并到经营策�?
 * 
 * ⚠️ 执行方式:
 * 1. 在云开发控制台手动调用
 * 2. 使用 tcb fn invoke init-modules-config 命令
 * 3. 从前端管理界面调�?
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 🎯 模块配置定义 (来自 constants/modules.ts v3.3)
// 📌 �?2个一级模�? 26个二级模�?
const SYSTEM_MODULES = [
  // ========== 工作�?(默认首页) ==========
  {
  _id: 'dashboard',
  name: '工作�?,
  description: '默认首页，显示工作概览和统计信息',
  icon: 'Home',
    parentId: null,
    level: 1,
    order: 0,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: false,
    adminOnly: false,
    route: '/dashboard',
    defaultPermission: 'view',
    note: '默认首页，所有用户可�?,
    metadata: {
      collections: [],
      fields: {},
      routes: ['/dashboard'],
      apis: []
    }
  },
  
  // ========== 简单业务模�?(7�? ==========
  {
    _id: 'tasks',
    name: '任务管理',
    
    description: '任务的创建、分配、跟踪和管理',
    icon: 'CheckSquare',
    parentId: null,
    level: 1,
    order: 1,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/tasks',
    dbCollection: 'tasks',
    defaultPermission: 'view',
    metadata: {
      collections: ['tasks', 'task_comments'],
      fields: {},
      routes: ['/tasks'],
      apis: []
    }
  },
  {
    _id: 'issues',
    name: '问题管理',
    
    description: '问题的记录、跟踪和解决',
    icon: 'AlertCircle',
    parentId: null,
    level: 1,
    order: 2,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/issues',
    dbCollection: 'issueRecords',
    defaultPermission: 'view',
    metadata: {
      collections: ['issueRecords', 'issue_comments'],
      fields: {},
      routes: ['/issues'],
      apis: []
    }
  },
  {
    _id: 'opportunities',
    name: '商机管理',
    
    description: '商机的创建、跟进和转化',
    icon: 'Target',
    parentId: null,
    level: 1,
    order: 3,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/opportunities',
    dbCollection: 'opportunities',
    defaultPermission: 'view',
    metadata: {
      collections: ['opportunities', 'opportunity_actions'],
      fields: {},
      routes: ['/opportunities'],
      apis: []
    }
  },
  {
    _id: 'projects',
    name: '项目管理',
    
    description: '项目的规划、执行和监控',
    icon: 'FolderKanban',
    parentId: null,
    level: 1,
    order: 4,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/projects',
    dbCollection: 'projects',
    defaultPermission: 'view',
    metadata: {
      collections: ['projects'],
      fields: {},
      routes: ['/projects'],
      apis: []
    }
  },
  {
    _id: 'meetings',
    name: '例会管理',
    
    description: '会议的安排、记录和跟踪',
    icon: 'Calendar',
    parentId: null,
    level: 1,
    order: 5,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/meetings',
    dbCollection: 'meetings',
    defaultPermission: 'view',
    metadata: {
      collections: ['meetings', 'meeting_minutes', 'meetingMinutes'],
      fields: {},
      routes: ['/meetings'],
      apis: []
    }
  },
  {
    _id: 'performance',
    name: '绩效管理',
    
    description: '绩效考核和评价管�?,
    icon: 'TrendingUp',
    parentId: null,
    level: 1,
    order: 6,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/performance',
    dbCollection: 'performance',
    defaultPermission: 'view',
    metadata: {
      collections: ['performance'],
      fields: {},
      routes: ['/performance'],
      apis: []
    }
  },
  {
    _id: 'business',
    name: '业务管理',
    
    description: '业务流程和数据管�?,
    icon: 'Briefcase',
    parentId: null,
    level: 1,
    order: 7,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    route: '/business',
    dbCollection: 'business',
    defaultPermission: 'view',
    metadata: {
      collections: ['business'],
      fields: {},
      routes: ['/business'],
      apis: []
    }
  },
  
  // ========== 目标管理 (7个子模块) ==========
  {
    _id: 'goal',
    name: '目标管理',
    
    description: '目标的设定、分解和跟踪',
    icon: 'Target',
    parentId: null,
    level: 1,
    order: 8,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    hasChildren: true,
    route: '/goal',
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/goal'],
      apis: []
    }
  },
  // 目标管理子模�?(7�?
  {
    _id: 'goal.salesGoal',
    name: '销售目�?,
    description: '销售目标管�?已合并商机目�?',
    icon: 'Target',
    parentId: 'goal',
    level: 2,
    order: 1,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'salesGoals',
    defaultPermission: 'view',
    metadata: {
      collections: ['salesGoals'],
      fields: {},
      routes: ['/sales-goal'],
      apis: []
    }
  },
  {
    _id: 'goal.productGoal',
    name: '产品目标',
    
    description: '产品订单目标管理',
    icon: 'Package',
    parentId: 'goal',
    level: 2,
    order: 2,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'productOrders',
    defaultPermission: 'view',
    metadata: {
      collections: ['productOrders'],
      fields: {},
      routes: ['/product-order'],
      apis: []
    }
  },
  {
    _id: 'goal.strategy',
    name: '经营策略',
    
    description: '年度经营策略和执行措�?已合并保障措施、季度措�?',
    icon: 'Layers',
    parentId: 'goal',
    level: 2,
    order: 3,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'annualStrategy',
    defaultPermission: 'view',
    metadata: {
      collections: ['annualStrategy', 'safeguardMeasures', 'quarterly_measures'],
      fields: {},
      routes: ['/strategy'],
      apis: []
    }
  },
  {
    _id: 'goal.outcome',
    name: '成果目标',
    
    description: '成果目标设定和跟�?,
    icon: 'Award',
    parentId: 'goal',
    level: 2,
    order: 4,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'outcomeGoals',
    defaultPermission: 'view',
    metadata: {
      collections: ['outcomeGoals'],
      fields: {},
      routes: ['/goals'],
      apis: []
    }
  },
  {
    _id: 'goal.decomposition',
    name: '目标分解',
    
    description: '目标的层级分解和管理',
    icon: 'GitBranch',
    parentId: 'goal',
    level: 2,
    order: 5,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'decompositionTables',
    defaultPermission: 'view',
    metadata: {
      collections: ['decompositionTables', 'goalDecompositions', 'goalDecompositionHistory', 'goalDecompositionDimensions'],
      fields: {},
      routes: ['/goal-decomposition'],
      apis: []
    }
  },
  {
    _id: 'goal.executionMap',
    name: '执行力地�?,
    description: '执行力可视化和分�?,
    icon: 'Map',
    parentId: 'goal',
    level: 2,
    order: 6,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/execution-map'],
      apis: []
    }
  },
  {
    _id: 'goal.dimensionSettings',
    name: '维度设置',
    
    description: '目标分解维度设置(直接使用decompositionTables集合)',
    icon: 'Settings',
    parentId: 'goal',
    level: 2,
    order: 7,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'decompositionTables', // 直接复用分解表集�?
    defaultPermission: 'view',
    note: '维度设置功能直接使用decompositionTables集合,无需单独集合',
    metadata: {
      collections: ['decompositionTables'], // 直接使用分解表集�?
      fields: {},
      routes: ['/dimension-settings'],
      apis: [],
      note: '维度设置功能直接使用decompositionTables集合'
    }
  },
  
  // ========== 预算管理 (6个子模块) ==========
  {
    _id: 'budget',
    name: '预算管理',
    
    description: '预算的编制、审批和执行',
    icon: 'DollarSign',
    parentId: null,
    level: 1,
    order: 9,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    hasChildren: true,
    route: '/budget',
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/budget'],
      apis: []
    }
  },
  // 预算管理子模�?
  {
    _id: 'budget.annual',
    name: '年度预算',
    
    description: '年度预算编制和审�?,
    icon: 'FileText',
    parentId: 'budget',
    level: 2,
    order: 1,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'annualBudget',
    defaultPermission: 'view',
    metadata: {
      collections: ['annualBudget', 'annual_budgets'],
      fields: {},
      routes: ['/annual-budget'],
      apis: []
    }
  },
  {
    _id: 'budget.execution',
    name: '预算执行',
    
    description: '预算执行情况跟踪',
    icon: 'TrendingUp',
    parentId: 'budget',
    level: 2,
    order: 2,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'budgetExecution',
    defaultPermission: 'view',
    metadata: {
      collections: ['budgetExecution', 'budget_execution'],
      fields: {},
      routes: ['/budget-execution'],
      apis: []
    }
  },
  {
    _id: 'budget.asset',
    name: '资产预算',
    
    description: '资产采购预算管理',
    icon: 'Package',
    parentId: 'budget',
    level: 2,
    order: 3,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'assetBudget',
    defaultPermission: 'view',
    metadata: {
      collections: ['assetBudget'],
      fields: {},
      routes: ['/asset-budget'],
      apis: []
    }
  },
  {
    _id: 'budget.cashFlow',
    name: '现金流管�?,
    description: '现金流预测和管理(待开�?',
    icon: 'DollarSign',
    parentId: 'budget',
    level: 2,
    order: 4,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    note: '与预算执行权限相�?,
    metadata: {
      collections: [],
      fields: {},
      routes: ['/cash-flow'],
      apis: []
    }
  },
  {
    _id: 'budget.hr',
    name: '薪酬预算',
    
    description: '薪酬成本预算管理(已更�?',
    icon: 'Users',
    parentId: 'budget',
    level: 2,
    order: 5,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'hrBudget',
    defaultPermission: 'view',
    metadata: {
      collections: ['hrBudget'],
      fields: {},
      routes: ['/hr-budget'],
      apis: []
    }
  },
  {
    _id: 'budget.parameters',
    name: '预算参数',
    
    description: '预算编制参数配置(损益参数+薪酬核算参数)',
    icon: 'Settings',
    parentId: 'budget',
    level: 2,
    order: 6,
    isEnabled: true,
    isCustom: false,
    category: '核心业务',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'budget_accounts', // 主集�?损益参数)
    defaultPermission: 'view',
    metadata: {
      collections: ['budget_accounts', 'payroll_accounts'], // 关联两个集合
      fields: {},
      routes: ['/budget-parameters'],
      apis: [],
      note: 'budget_accounts存储损益参数, payroll_accounts存储薪酬核算参数'
    }
  },
  
  // ========== 个人信息 (6个子模块) ==========
  {
    _id: 'profile',
    name: '个人信息',
    
    description: '个人信息、团队和消息管理',
    icon: 'User',
    parentId: null,
    level: 1,
    order: 11,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    hasChildren: true,
    route: '/profile',
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/profile', '/account-settings'],
      apis: []
    }
  },
  // 个人信息子模�?
  {
    _id: 'profile.info',
    name: '基本信息',
    
    description: '个人基本信息管理',
    icon: 'User',
    parentId: 'profile',
    level: 2,
    order: 1,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'users',
    defaultPermission: 'view',
    metadata: {
      collections: ['users'],
      fields: {},
      routes: ['/profile/info'],
      apis: []
    }
  },
  {
    _id: 'profile.team',
    name: '团队',
    
    description: '所属团队和成员信息',
    icon: 'Users',
    parentId: 'profile',
    level: 2,
    order: 2,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/profile/team'],
      apis: []
    }
  },
  {
    _id: 'profile.message',
    name: '消息',
    
    description: '系统消息和通知',
    icon: 'Bell',
    parentId: 'profile',
    level: 2,
    order: 3,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'notifications',
    defaultPermission: 'view',
    metadata: {
      collections: ['notifications', 'messages'],
      fields: {},
      routes: ['/profile/message', '/messages'],
      apis: []
    }
  },
  {
    _id: 'profile.goals',
    name: '我的目标',
    
    description: '个人目标查看和跟�?待开�?',
    icon: 'Target',
    parentId: 'profile',
    level: 2,
    order: 4,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/profile/goals'],
      apis: []
    }
  },
  {
    _id: 'profile.execution',
    name: '执行�?,
    description: '个人执行力分�?待开�?',
    icon: 'TrendingUp',
    parentId: 'profile',
    level: 2,
    order: 5,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/profile/execution'],
      apis: []
    }
  },
  {
    _id: 'profile.performance',
    name: '绩效',
    
    description: '个人绩效查看(待开�?',
    icon: 'Award',
    parentId: 'profile',
    level: 2,
    order: 6,
    isEnabled: true,
    isCustom: false,
    category: '辅助功能',
    showInSidebar: true,
    needsPermission: true,
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/profile/performance'],
      apis: []
    }
  },
  
  // ========== 系统设置 (7个子模块) ==========
  {
    _id: 'settings',
    name: '系统设置',
    
    description: '系统配置和权限管�?,
    icon: 'Settings',
    parentId: null,
    level: 1,
    order: 12,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    hasChildren: true,
    route: '/settings',
    defaultPermission: 'view',
    metadata: {
      collections: [],
      fields: {},
      routes: ['/settings'],
      apis: []
    }
  },
  // 系统设置子模�?
  {
    _id: 'settings.userApproval',
    name: '用户审核',
    
    description: '新用户注册审�?,
    icon: 'UserCheck',
    parentId: 'settings',
    level: 2,
    order: 1,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'users',
    defaultPermission: 'view',
    metadata: {
      collections: ['users', 'pending_users'],
      fields: {},
      routes: ['/user-approval'],
      apis: []
    }
  },
  {
    _id: 'settings.employees',
    name: '员工管理',
    
    description: '员工信息维护',
    icon: 'Users',
    parentId: 'settings',
    level: 2,
    order: 2,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'users',
    defaultPermission: 'view',
    metadata: {
      collections: ['users'],
      fields: {},
      routes: ['/user-management', '/employees'],
      apis: []
    }
  },
  {
    _id: 'settings.departments',
    name: '部门管理',
    
    description: '部门组织架构管理',
    icon: 'Building',
    parentId: 'settings',
    level: 2,
    order: 3,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'departments',
    defaultPermission: 'view',
    metadata: {
      collections: ['departments'],
      fields: {},
      routes: ['/departments'],
      apis: []
    }
  },
  {
    _id: 'settings.roles',
    name: '角色权限',
    
    description: '角色和权限配�?,
    icon: 'Shield',
    parentId: 'settings',
    level: 2,
    order: 4,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'role_permissions',
    defaultPermission: 'view',
    metadata: {
      collections: ['role_permissions', 'roles', 'permissions'],
      fields: {},
      routes: ['/role-permissions'],
      apis: []
    }
  },
  {
    _id: 'settings.typeSettings',
    name: '参数配置',
    
    description: '系统参数和选项配置',
    icon: 'Settings',
    parentId: 'settings',
    level: 2,
    order: 5,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'type_settings',
    defaultPermission: 'view',
    metadata: {
      collections: ['type_settings'],
      fields: {},
      routes: ['/type-settings', '/system-settings'],
      apis: []
    }
  },
  {
    _id: 'settings.operationLogs',
    name: '操作日志',
    
    description: '系统操作记录查询',
    icon: 'FileText',
    parentId: 'settings',
    level: 2,
    order: 6,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: true,
    dbCollection: 'operation_logs',
    defaultPermission: 'view',
    metadata: {
      collections: ['operation_logs', 'audit_logs'],
      fields: {},
      routes: ['/operation-logs', '/audit-logs'],
      apis: []
    }
  },
  {
    _id: 'settings.moduleManagement',
    name: '功能模块',
    
    description: '系统功能模块的启用、禁用和排序管理',
    icon: 'Grid',
    parentId: 'settings',
    level: 2,
    order: 7,
    isEnabled: true,
    isCustom: false,
    category: '管理功能',
    showInSidebar: true,
    needsPermission: false,
    adminOnly: true,
    route: '/module-management',
    dbCollection: 'modulesConfig',
    defaultPermission: 'view',
    note: '仅管理员可见，用于管理所有功能模�?,
    metadata: {
      collections: ['modulesConfig'],
      fields: {},
      routes: ['/module-management'],
      apis: []
    }
  }
];

exports.main = async (event, context) => {
  try {
    console.log('[init-modules-config] ========== 开始初始化模块配置 ==========');
    console.log(`[init-modules-config] 模块总数: ${SYSTEM_MODULES.length}`);
    
    // ⚠️ 不使�?wxContext,因为这是初始化脚�?不是从小程序调用
    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
      stats: {
        level1: 0,
        level2: 0,
        total: SYSTEM_MODULES.length
      }
    };
    
    // 统计一级模块和二级模块
    SYSTEM_MODULES.forEach(m => {
      if (m.level === 1) results.stats.level1++;
      if (m.level === 2) results.stats.level2++;
    });
    
    console.log(`[init-modules-config] 统计: ${results.stats.level1}个一级模�? ${results.stats.level2}个二级模块`);
    
    // 遍历所有模�?
    for (const module of SYSTEM_MODULES) {
      try {
        console.log(`[init-modules-config] 处理: ${module._id} - ${module.name} (Level ${module.level})`);
        
        // 检查模块是否已存在
        const { data: existing } = await db.collection('modulesConfig')
          .where({ _id: module._id })
          .get();
        
        const moduleData = {
          ...module,
          updatedAt: new Date(),
          lastModifiedBy: 'system' // 初始化脚本使�?system
        };
        
        if (existing && existing.length > 0) {
          // 更新现有模块 (保留 createdAt �?createdBy)
          await db.collection('modulesConfig')
            .where({ _id: module._id })
            .update({
              data: moduleData
            });
          
          results.updated.push(module._id);
          console.log(`[init-modules-config] �?已更�? ${module._id}`);
        } else {
          // 创建新模�?
          await db.collection('modulesConfig').add({
            data: {
              ...moduleData,
              createdAt: new Date(),
              createdBy: 'system' // 初始化脚本使�?system
            }
          });
          
          results.created.push(module._id);
          console.log(`[init-modules-config] �?已创�? ${module._id}`);
        }
      } catch (error) {
        results.errors.push({
          moduleId: module._id,
          error: error.message
        });
        console.error(`[init-modules-config] �?错误: ${module._id}`, error);
      }
    }
    
    console.log('[init-modules-config] ========== 初始化完�?==========');
    console.log('[init-modules-config] 统计:', results);
    
    return {
      success: true,
      message: '模块配置初始化完�?,
      data: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[init-modules-config] 💥 Fatal Error:', error);
    return {
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
  }
};
