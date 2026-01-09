/**
 * 功能模块统一配置
 * 用于统一管理系统中所有功能模块的定义,确保权限配置与实际模块保持一致
 * 
 * 📌 版本: v3.0 - 统一配置方案
 * 🗓️ 更新时间: 2026-01-08
 * ✅ 单一配置源 - 所有模块定义来自此文件
 */

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

/** 字段信息 */
export interface FieldInfo {
  /** 字段名称 (英文代码) */
  name: string;
  /** 字段类型 (string/number/boolean/date/array/object等) */
  type: string;
  /** 字段描述 (中文说明) */
  description?: string;
}

/** 元数据信息 */
export interface ModuleMetadata {
  /** 关联的数据库集合列表 */
  collections?: string[];
  /** 关联的字段信息 (按集合分组) */
  fields?: Record<string, FieldInfo[]>;
  /** 关联的前端路由列表 */
  routes?: string[];
  /** 关联的API接口列表 */
  apis?: string[];
}

export interface ModuleDefinition {
  // 📌 基础标识
  /** 模块ID (英文标识,用于权限判断和路由) */
  id: string;
  /** 模块名称 (中文显示名) */
  name: string;
  /** 模块描述 */
  description?: string;
  
  // 📌 层级结构
  /** 模块层级 (1=一级模块, 2=二级子模块) */
  level: 1 | 2;
  /** 父模块代码 (二级模块需要指定) */
  parentCode?: string;
  /** 是否有子模块 */
  hasChildren?: boolean;
  /** 子模块列表 */
  children?: ModuleDefinition[];
  
  // 📌 显示控制
  /** 在侧边栏显示 */
  showInSidebar?: boolean;
  /** 模块分类 (核心业务/管理功能/辅助功能/报表分析) */
  category?: '核心业务' | '管理功能' | '辅助功能' | '报表分析';
  /** 图标 (Lucide React 图标名) */
  icon?: string;
  
  // 📌 权限配置
  /** 是否需要权限配置 (false表示所有人可见或通过其他方式控制) */
  needsPermission?: boolean;
  /** 默认权限 */
  defaultPermission?: ModulePermission;
  /** 是否仅管理员可访问 */
  adminOnly?: boolean;
  
  // 📌 路由信息
  /** 路由路径 */
  route?: string;
  
  // 📌 数据库关联
  /** 关联的数据库集合名 */
  dbCollection?: string;
  
  // 📌 元数据信息
  /** 模块元数据 (字段、接口等详细信息) */
  metadata?: ModuleMetadata;
  
  // 📌 默认状态 (用于初始化)
  /** 默认启用状态 */
  defaultEnabled?: boolean;
  /** 默认排序 (数字越小越靠前) */
  defaultOrder?: number;
  
  // 📌 备注信息
  /** 备注说明 */
  note?: string;
}

/** 默认权限:仅查看 */
const VIEW_ONLY: ModulePermission = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  export: false
};

/** 默认权限:查看+创建 */
const VIEW_CREATE: ModulePermission = {
  view: true,
  create: true,
  edit: false,
  delete: false,
  export: false
};

/** 默认权限:完全权限 */
const FULL_PERMISSION: ModulePermission = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  export: true
};

/**
 * 系统所有功能模块定义
 * ⚠️ 新增功能模块时,只需在此数组中添加配置即可自动同步到角色权限
 * 
 * 📝 版本: v3.1 - 统一配置方案
 * 🗓️ 更新日期: 2026-01-08
 * 📊 统计: 11个一级模块 (含dashboard), 30个子模块 (含moduleManagement)
 * 
 * 🎯 使用场景分离:
 * - 角色权限配置: filter(m => m.needsPermission !== false)
 * - 功能模块管理: 所有模块
 * - 侧边栏菜单: filter(m => m.showInSidebar !== false)
 */
export const SYSTEM_MODULES: ModuleDefinition[] = [
  // ========== 工作台 (默认首页) ==========
  {
    id: 'dashboard',
    name: '工作台',
    description: '默认首页，显示工作概览和统计信息',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: false, // ⚡ 所有用户可见
    adminOnly: false,
    route: '/dashboard',
    defaultEnabled: true,
    defaultOrder: 0,
    note: '默认首页，所有用户可见'
  },
  
  // ========== 简单业务模块 (7个) ==========
  {
    id: 'tasks',
    name: '任务管理',
    description: '任务的创建、分配、跟踪和管理',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/tasks',
    dbCollection: 'tasks', // ✅ 已确认
    note: '关联集合: task_comments(任务评论), task_attachments(任务附件)',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 1
  },
  {
    id: 'issues',
    name: '问题管理',
    description: '问题的记录、跟踪和解决',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/issues',
    dbCollection: 'issues', // ✅ 已确认
    note: '关联集合: issue_comments(问题评论)',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 2
  },
  {
    id: 'opportunities',
    name: '商机管理',
    description: '商机的创建、跟进和转化',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/opportunities',
    dbCollection: 'opportunities', // ✅ 已确认
    note: '关联集合: opportunity_actions(商机行动记录)',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 3
  },
  {
    id: 'projects',
    name: '项目管理',
    description: '项目的规划、执行和监控',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/projects',
    dbCollection: 'projects', // ✅ 已确认
    note: '关联集合: project_phases(项目阶段), project_milestones(项目里程碑)',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 4
  },
  {
    id: 'meetings',
    name: '例会管理',
    description: '会议的安排、记录和跟踪',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/meetings',
    dbCollection: 'meetings', // ✅ 已确认
    note: '关联集合: meeting_minutes(会议纪要)',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 5
  },
  {
    id: 'performance',
    name: '绩效管理',
    description: '绩效考核和评价管理',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/performance',
    dbCollection: 'performance', // ✅ 已确认
    note: '待开发功能,预留集合',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 6
  },
  {
    id: 'business',
    name: '业务管理',
    description: '业务流程和数据管理',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/business',
    dbCollection: 'business', // ✅ 已确认
    note: '待开发功能,预留集合',
    defaultPermission: VIEW_CREATE,
    defaultEnabled: true,
    defaultOrder: 7
  },
  
  // ========== 目标管理 (8个子模块) ==========
  {
    id: 'goal',
    name: '目标管理',
    description: '目标的设定、分解和跟踪',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/goal',
    hasChildren: true,
    defaultEnabled: true,
    defaultOrder: 8,
    children: [
      {
        id: 'salesGoal',
        name: '销售目标',
        description: '销售目标管理(已合并商机目标)',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'sales_goals', // ✅ 已确认
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'productOrder',
        name: '产品目标',
        description: '产品订单目标管理',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'product_order_forecast', // ✅ 已确认
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'strategy',
        name: '年度策略',
        description: '年度经营策略和执行措施',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'annual_strategies', // ✅ 已确认
        note: '关联集合: quarterly_measures(季度经营措施), safeguardMeasures(保障措施)',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'outcome',
        name: '成果目标',
        description: '成果目标设定和跟踪',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'outcome_goals', // ✅ 已确认
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'decomposition',
        name: '目标分解',
        description: '目标的层级分解和管理',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'decompositionTables', // ✅ 已确认
        note: '关联集合: decompositionDimensions, decompositionTableConfigs, goalDecompositionData, goalDecompositions2025-2030',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'executionMap',
        name: '执行力地图',
        description: '执行力可视化和分析',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        note: '纯前端可视化分析,无数据集合',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'dimensionSettings',
        name: '维度设置',
        description: '目标分解维度设置',
        level: 2,
        parentCode: 'goal',
        needsPermission: true,
        dbCollection: 'decompositionTables', // ✅ 直接复用分解表集合
        note: '维度设置功能直接使用decompositionTables集合,无需单独集合',
        defaultPermission: VIEW_CREATE
      }
    ]
  },
  
  // ========== 预算管理 (6个子模块) ==========
  {
    id: 'budget',
    name: '预算管理',
    description: '预算的编制、审批和执行',
    level: 1,
    showInSidebar: true,
    category: '核心业务',
    needsPermission: true,
    route: '/budget',
    hasChildren: true,
    defaultEnabled: true,
    defaultOrder: 9,
    children: [
      {
        id: 'annual',
        name: '年度预算',
        description: '年度预算编制和审批',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        dbCollection: 'annual_budgets', // ✅ 已确认
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'execution',
        name: '预算执行',
        description: '预算执行情况跟踪',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        dbCollection: 'budget_execution', // ✅ 已确认
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'asset',
        name: '资产预算',
        description: '资产采购预算管理',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        dbCollection: 'asset_budgets', // ✅ 已确认
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'cashFlow',
        name: '现金流管理',
        description: '现金流预测和管理(待开发)',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        note: '待开发功能,暂无数据集合',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'hr',
        name: '薪酬预算',
        description: '薪酬成本预算管理',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        dbCollection: 'hrExpenses', // ✅ 已确认
        note: '关联集合: payroll_accounts(工资科目)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'parameters',
        name: '预算参数',
        description: '预算编制参数配置',
        level: 2,
        parentCode: 'budget',
        needsPermission: true,
        dbCollection: 'budget_accounts', // ✅ 已确认,主集合
        note: '关联集合: budget_accounts(损益参数), payroll_accounts(薪酬核算参数)',
        defaultPermission: VIEW_ONLY
      }
    ]
  },
  

  
  // ========== 个人信息 (6个子模块) ==========
  {
    id: 'profile',
    name: '个人信息',
    description: '个人信息、团队和消息管理',
    level: 1,
    showInSidebar: true,
    category: '辅助功能',
    needsPermission: true,
    route: '/profile',
    hasChildren: true,
    defaultEnabled: true,
    defaultOrder: 11,
    children: [
      {
        id: 'info',
        name: '基本信息',
        description: '个人基本信息管理',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        dbCollection: 'users', // ✅ 已确认
        defaultPermission: FULL_PERMISSION
      },
      {
        id: 'team',
        name: '团队',
        description: '所属团队和成员信息',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        dbCollection: 'users', // ✅ 使用users集合查询部门成员
        note: '从users集合查询当前用户的部门成员信息',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'message',
        name: '消息',
        description: '系统消息和通知',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        dbCollection: 'messages', // ✅ 已确认
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'goals',
        name: '我的目标',
        description: '个人目标查看和跟踪(待开发)',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        note: '待开发功能,可能使用outcome_goals或新建集合',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'execution',
        name: '执行力',
        description: '个人执行力分析(待开发)',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        note: '待开发功能,纯前端分析或基于tasks集合',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'performance',
        name: '绩效',
        description: '个人绩效查看(待开发)',
        level: 2,
        parentCode: 'profile',
        needsPermission: true,
        note: '待开发功能,可能使用performance集合',
        defaultPermission: VIEW_ONLY
      }
    ]
  },
  
  // ========== 系统设置 (7个子模块) ==========
  {
    id: 'settings',
    name: '系统设置',
    description: '系统配置和权限管理',
    level: 1,
    showInSidebar: true,
    category: '管理功能',
    needsPermission: true,
    route: '/settings',
    hasChildren: true,
    defaultEnabled: true,
    defaultOrder: 12,
    children: [
      {
        id: 'userApproval',
        name: '用户审核',
        description: '新用户注册审核',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'users', // ✅ 已确认,查询status='pending'的用户
        note: '查询users集合中status为pending的用户',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'employees',
        name: '员工管理',
        description: '员工信息维护',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'users', // ✅ 已确认
        note: '关联集合: handover_history(交接历史)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'departments',
        name: '部门管理',
        description: '部门组织架构管理',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'departments', // ✅ 已确认
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'roles',
        name: '角色权限',
        description: '角色和权限配置',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'role_permissions', // ✅ 已确认
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'typeSettings',
        name: '参数配置',
        description: '系统参数和选项配置',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'type_settings', // ✅ 已确认
        note: '包含任务类型、商机状态、项目阶段等所有下拉选项',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'operationLogs',
        name: '操作日志',
        description: '系统操作记录查询',
        level: 2,
        parentCode: 'settings',
        needsPermission: true,
        dbCollection: 'operation_logs', // ✅ 已确认
        note: '关联集合: audit_logs(审计日志)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'moduleManagement',
        name: '功能模块',
        description: '系统功能模块的启用、禁用和排序管理',
        level: 2,
        parentCode: 'settings',
        needsPermission: false, // ⚡ 通过 adminOnly 控制
        adminOnly: true, // ⚡ 仅管理员可见
        route: '/module-management',
        dbCollection: 'modulesConfig', // ✅ 已确认
        note: '仅管理员可见，用于管理所有功能模块。关联集合: moduleOrder(模块排序)',
      }
    ]
  }
];

/**
 * 获取需要权限配置的模块（用于角色权限配置）
 * 📌 排除: dashboard (所有人可见), moduleManagement (通过adminOnly控制)
 */
export function getPermissionModules(): ModuleDefinition[] {
  return SYSTEM_MODULES.filter(m => m.needsPermission !== false);
}

/**
 * 获取所有模块（用于功能模块管理）
 * 📌 包含: dashboard, moduleManagement 等所有模块
 */
export function getAllModules(): ModuleDefinition[] {
  return SYSTEM_MODULES;
}

/**
 * 获取侧边栏显示的模块（用于菜单渲染）
 * 📌 根据用户角色过滤 adminOnly 模块
 */
export function getSidebarModules(isAdmin: boolean = false): ModuleDefinition[] {
  return SYSTEM_MODULES
    .filter(m => m.showInSidebar !== false)
    .filter(m => !m.adminOnly || isAdmin)
    .sort((a, b) => (a.defaultOrder ?? 999) - (b.defaultOrder ?? 999));
}

/**
 * 扁平化模块列表（用于功能模块管理）
 * 将一级模块和二级子模块展开为扁平列表,格式: parent.child
 */
export function getFlatModuleList(): Array<{code: string; name: string; level: number; parentCode: string | null; category?: string; note?: string}> {
  const flatList: Array<{code: string; name: string; level: number; parentCode: string | null; category?: string; note?: string}> = [];
  
  SYSTEM_MODULES.forEach(module => {
    // 添加一级模块
    flatList.push({
      code: module.id,
      name: module.name,
      level: 1,
      parentCode: null,
      category: module.category,
      note: module.note
    });
    
    // 添加二级模块
    if (module.children) {
      module.children.forEach(child => {
        flatList.push({
          code: `${module.id}.${child.id}`,
          name: child.name,
          level: 2,
          parentCode: module.id,
          note: child.note
        });
      });
    }
  });
  
  return flatList;
}

/**
 * 生成默认权限配置(用于新建角色)
 */
export function generateDefaultPermissions(): any {
  const permissions: any = {};
  
  // 只为需要权限配置的模块生成权限
  getPermissionModules().forEach(module => {
    if (module.hasChildren && module.children) {
      // 有子模块的情况
      permissions[module.id] = {};
      module.children.forEach(child => {
        if (child.needsPermission !== false) {
          permissions[module.id][child.id] = child.defaultPermission || VIEW_CREATE;
        }
      });
    } else {
      // 没有子模块的情况
      permissions[module.id] = module.defaultPermission || VIEW_CREATE;
    }
  });
  
  return permissions;
}

/**
 * 获取模块显示名称
 */
export function getModuleName(moduleId: string): string {
  // 先查找顶层模块
  const module = SYSTEM_MODULES.find(m => m.id === moduleId);
  if (module) {
    return module.name;
  }
  
  // 再查找子模块
  for (const parentModule of SYSTEM_MODULES) {
    if (parentModule.children) {
      const childModule = parentModule.children.find(c => c.id === moduleId);
      if (childModule) {
        return `${parentModule.name} - ${childModule.name}`;
      }
    }
  }
  
  return moduleId; // 找不到返回ID
}

/**
 * 获取所有模块ID列表(扁平化)
 */
export function getAllModuleIds(): string[] {
  const ids: string[] = [];
  
  SYSTEM_MODULES.forEach(module => {
    if (module.hasChildren && module.children) {
      module.children.forEach(child => {
        ids.push(`${module.id}.${child.id}`);
      });
    } else {
      ids.push(module.id);
    }
  });
  
  return ids;
}

/**
 * 检查模块是否存在
 */
export function moduleExists(moduleId: string): boolean {
  // 检查顶层模块
  if (SYSTEM_MODULES.some(m => m.id === moduleId)) {
    return true;
  }
  
  // 检查子模块(格式: parent.child)
  const [parentId, childId] = moduleId.split('.');
  if (childId) {
    const parent = SYSTEM_MODULES.find(m => m.id === parentId);
    if (parent?.children) {
      return parent.children.some(c => c.id === childId);
    }
  }
  
  return false;
}
