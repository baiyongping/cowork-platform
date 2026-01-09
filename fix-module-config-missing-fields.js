/**
 * 修复模块配置缺失字段问题
 * 批量更新 modulesConfig 集合，添加必要的 icon、displayName、path 等字段
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cowork-9gg9oocb516be5fb' // 🔧 生产环境
});

const db = cloud.database();
const _ = db.command;

/**
 * 完整的模块配置映射（基于 constants/modules.ts）
 */
const MODULE_CONFIG_MAP = {
  // ========== 工作台 ==========
  'dashboard': {
    name: '工作台',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    description: '默认首页，显示工作概览和统计信息',
    category: '核心业务'
  },
  
  // ========== 简单业务模块 ==========
  'tasks': {
    name: '任务管理',
    icon: 'CheckCircle',
    path: '/tasks',
    description: '任务的创建、分配、跟踪和管理',
    category: '核心业务'
  },
  'issues': {
    name: '问题管理',
    icon: 'AlertCircle',
    path: '/issues',
    description: '问题的记录、跟踪和解决',
    category: '核心业务'
  },
  'opportunities': {
    name: '商机管理',
    icon: 'TrendingUp',
    path: '/opportunities',
    description: '商机的创建、跟进和转化',
    category: '核心业务'
  },
  'projects': {
    name: '项目管理',
    icon: 'FolderKanban',
    path: '/projects',
    description: '项目的规划、执行和监控',
    category: '核心业务'
  },
  'meetings': {
    name: '例会管理',
    icon: 'Calendar',
    path: '/meetings',
    description: '会议的安排、记录和跟踪',
    category: '核心业务'
  },
  'performance': {
    name: '绩效管理',
    icon: 'Award',
    path: '/performance',
    description: '绩效考核和评价管理',
    category: '核心业务'
  },
  'business': {
    name: '业务管理',
    icon: 'Briefcase',
    path: '/business',
    description: '业务流程和数据管理',
    category: '核心业务'
  },
  
  // ========== 目标管理及其子模块 ==========
  'goal': {
    name: '目标管理',
    icon: 'Target',
    path: '/goal',
    description: '目标的设定、分解和跟踪',
    category: '核心业务'
  },
  'goal.salesGoal': {
    name: '销售目标',
    icon: 'TrendingUp',
    path: '/goal/sales',
    description: '销售目标管理',
    parentId: 'goal',
    level: 2
  },
  'goal.productOrder': {
    name: '产品目标',
    icon: 'Package',
    path: '/goal/product',
    description: '产品订单目标管理',
    parentId: 'goal',
    level: 2
  },
  'goal.strategy': {
    name: '年度策略',
    icon: 'Target',
    path: '/goal/strategy',
    description: '年度经营策略和执行措施',
    parentId: 'goal',
    level: 2
  },
  'goal.outcome': {
    name: '成果目标',
    icon: 'Award',
    path: '/goal/outcome',
    description: '成果目标设定和跟踪',
    parentId: 'goal',
    level: 2
  },
  'goal.decomposition': {
    name: '目标分解',
    icon: 'LayoutGrid',
    path: '/goal/decomposition',
    description: '目标的层级分解和管理',
    parentId: 'goal',
    level: 2
  },
  'goal.executionMap': {
    name: '执行力地图',
    icon: 'Target',
    path: '/goal/execution-map',
    description: '执行力可视化和分析',
    parentId: 'goal',
    level: 2
  },
  'goal.dimensionSettings': {
    name: '维度设置',
    icon: 'Settings',
    path: '/goal/dimension-settings',
    description: '目标分解维度设置',
    parentId: 'goal',
    level: 2
  },
  
  // ========== 预算管理及其子模块 ==========
  'budget': {
    name: '预算管理',
    icon: 'DollarSign',
    path: '/budget',
    description: '预算的编制、审批和执行',
    category: '核心业务'
  },
  'budget.annual': {
    name: '年度预算',
    icon: 'DollarSign',
    path: '/budget/annual',
    description: '年度预算编制和审批',
    parentId: 'budget',
    level: 2
  },
  'budget.execution': {
    name: '预算执行',
    icon: 'DollarSign',
    path: '/budget/execution',
    description: '预算执行情况跟踪',
    parentId: 'budget',
    level: 2
  },
  'budget.asset': {
    name: '资产预算',
    icon: 'Package',
    path: '/budget/asset',
    description: '资产采购预算管理',
    parentId: 'budget',
    level: 2
  },
  'budget.cashFlow': {
    name: '现金流管理',
    icon: 'DollarSign',
    path: '/budget/cashflow',
    description: '现金流预测和管理',
    parentId: 'budget',
    level: 2
  },
  'budget.hr': {
    name: '薪酬预算',
    icon: 'UserCircle',
    path: '/budget/hr',
    description: '薪酬成本预算管理',
    parentId: 'budget',
    level: 2
  },
  'budget.parameters': {
    name: '预算参数',
    icon: 'Settings',
    path: '/budget/parameters',
    description: '预算编制参数配置',
    parentId: 'budget',
    level: 2
  },
  
  // ========== 个人信息及其子模块 ==========
  'profile': {
    name: '个人信息',
    icon: 'UserCircle',
    path: '/profile',
    description: '个人信息、团队和消息管理',
    category: '辅助功能'
  },
  'profile.info': {
    name: '基本信息',
    icon: 'UserCircle',
    path: '/profile/info',
    description: '个人基本信息管理',
    parentId: 'profile',
    level: 2
  },
  'profile.team': {
    name: '团队',
    icon: 'UserCircle',
    path: '/profile/team',
    description: '所属团队和成员信息',
    parentId: 'profile',
    level: 2
  },
  'profile.message': {
    name: '消息',
    icon: 'AlertCircle',
    path: '/profile/message',
    description: '系统消息和通知',
    parentId: 'profile',
    level: 2
  },
  'profile.goals': {
    name: '我的目标',
    icon: 'Target',
    path: '/profile/goals',
    description: '个人目标查看和跟踪',
    parentId: 'profile',
    level: 2
  },
  'profile.execution': {
    name: '执行力',
    icon: 'Target',
    path: '/profile/execution',
    description: '个人执行力分析',
    parentId: 'profile',
    level: 2
  },
  'profile.performance': {
    name: '绩效',
    icon: 'Award',
    path: '/profile/performance',
    description: '个人绩效查看',
    parentId: 'profile',
    level: 2
  },
  
  // ========== 系统设置及其子模块 ==========
  'settings': {
    name: '系统设置',
    icon: 'Settings',
    path: '/settings',
    description: '系统配置和权限管理',
    category: '管理功能'
  },
  'settings.userApproval': {
    name: '用户审核',
    icon: 'UserCircle',
    path: '/settings/user-approval',
    description: '新用户注册审核',
    parentId: 'settings',
    level: 2
  },
  'settings.employees': {
    name: '员工管理',
    icon: 'UserCircle',
    path: '/settings/employees',
    description: '员工信息维护',
    parentId: 'settings',
    level: 2
  },
  'settings.departments': {
    name: '部门管理',
    icon: 'FolderOpen',
    path: '/settings/departments',
    description: '部门组织架构管理',
    parentId: 'settings',
    level: 2
  },
  'settings.roles': {
    name: '角色权限',
    icon: 'Shield',
    path: '/settings/roles',
    description: '角色和权限配置',
    parentId: 'settings',
    level: 2
  },
  'settings.typeSettings': {
    name: '参数配置',
    icon: 'Settings',
    path: '/settings/type-settings',
    description: '系统参数和选项配置',
    parentId: 'settings',
    level: 2
  },
  'settings.operationLogs': {
    name: '操作日志',
    icon: 'FileText',
    path: '/settings/operation-logs',
    description: '系统操作记录查询',
    parentId: 'settings',
    level: 2
  },
  'settings.moduleManagement': {
    name: '功能模块',
    icon: 'LayoutGrid',
    path: '/settings/module-management',
    description: '系统功能模块的启用、禁用和排序管理',
    parentId: 'settings',
    level: 2
  }
};

/**
 * 批量更新模块配置
 */
async function batchUpdateModules() {
  console.log('=== 开始修复模块配置缺失字段 ===\n');
  
  try {
    // 1. 查询所有模块
    const result = await db.collection('modulesConfig').get();
    const modules = result.data;
    
    console.log(`📊 总共查询到 ${modules.length} 个模块\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 2. 遍历更新
    for (const module of modules) {
      const moduleId = module._id;
      const config = MODULE_CONFIG_MAP[moduleId];
      
      if (!config) {
        console.log(`⚠️ [跳过] ${moduleId} - 未在配置映射中找到`);
        skippedCount++;
        continue;
      }
      
      // 3. 准备更新数据（只更新缺失的字段）
      const updates = {};
      
      if (!module.icon) {
        updates.icon = config.icon;
      }
      if (!module.path) {
        updates.path = config.path;
      }
      if (!module.description) {
        updates.description = config.description;
      }
      if (!module.category && config.category) {
        updates.category = config.category;
      }
      if (!module.parentId && config.parentId) {
        updates.parentId = config.parentId;
      }
      if (!module.level && config.level) {
        updates.level = config.level;
      }
      
      // 如果没有需要更新的字段，跳过
      if (Object.keys(updates).length === 0) {
        console.log(`✅ [无需更新] ${moduleId} - ${module.name}`);
        continue;
      }
      
      // 4. 执行更新
      await db.collection('modulesConfig')
        .doc(moduleId)
        .update({
          ...updates,
          updatedAt: new Date()
        });
      
      console.log(`✅ [更新成功] ${moduleId} - ${module.name}`);
      console.log(`   更新字段: ${Object.keys(updates).join(', ')}`);
      updatedCount++;
    }
    
    console.log('\n=== 修复完成 ===');
    console.log(`✅ 成功更新: ${updatedCount} 个`);
    console.log(`⏭️ 跳过: ${skippedCount} 个`);
    console.log(`📊 总计: ${modules.length} 个`);
    
  } catch (error) {
    console.error('❌ 批量更新失败:', error);
    throw error;
  }
}

// 执行修复
batchUpdateModules()
  .then(() => {
    console.log('\n🎉 修复脚本执行成功！');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 修复脚本执行失败:', error);
    process.exit(1);
  });
