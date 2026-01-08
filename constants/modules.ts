/**
 * 功能模块统一配置
 * 用于统一管理系统中所有功能模块的定义,确保权限配置与实际模块保持一致
 */

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export interface ModuleDefinition {
  /** 模块ID (英文标识,用于权限判断) */
  id: string;
  /** 模块名称 (中文显示名) */
  name: string;
  /** 模块描述 */
  description?: string;
  /** 是否有子模块 */
  hasChildren?: boolean;
  /** 子模块列表 */
  children?: ModuleDefinition[];
  /** 默认权限 */
  defaultPermission?: ModulePermission;
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
 * 📝 版本: v2.0
 * 🗓️ 更新日期: 2026-01-08
 * 📊 统计: 10个一级模块, 19个子模块
 */
export const SYSTEM_MODULES: ModuleDefinition[] = [
  // ========== 简单业务模块 (7个) ==========
  {
    id: 'tasks',
    name: '任务管理',
    description: '任务的创建、分配、跟踪和管理',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'issues',
    name: '问题管理',
    description: '问题的记录、跟踪和解决',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'opportunities',
    name: '商机管理',
    description: '商机的创建、跟进和转化',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'projects',
    name: '项目管理',
    description: '项目的规划、执行和监控',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'meetings',
    name: '例会管理',
    description: '会议的安排、记录和跟踪',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'performance',
    name: '绩效管理',
    description: '绩效考核和评价管理',
    defaultPermission: VIEW_CREATE
  },
  {
    id: 'business',
    name: '业务管理',
    description: '业务流程和数据管理',
    defaultPermission: VIEW_CREATE
  },
  
  // ========== 目标管理 (7个子模块) ==========
  {
    id: 'goal',
    name: '目标管理',
    description: '目标的设定、分解和跟踪',
    hasChildren: true,
    children: [
      {
        id: 'salesGoal',
        name: '销售目标',
        description: '销售目标管理(已合并商机目标)',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'productOrder',
        name: '产品目标',
        description: '产品订单目标管理',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'strategy',
        name: '经营策略',
        description: '年度经营策略和执行措施(已合并)',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'outcome',
        name: '成果目标',
        description: '成果目标设定和跟踪',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'decomposition',
        name: '目标分解',
        description: '目标的层级分解和管理',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'executionMap',
        name: '执行力地图',
        description: '执行力可视化和分析',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'dimensionSettings',
        name: '维度设置',
        description: '目标维度参数配置',
        defaultPermission: VIEW_CREATE
      }
    ]
  },
  
  // ========== 预算管理 (6个子模块) ==========
  {
    id: 'budget',
    name: '预算管理',
    description: '预算的编制、审批和执行',
    hasChildren: true,
    children: [
      {
        id: 'annual',
        name: '年度预算',
        description: '年度预算编制和审批',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'execution',
        name: '预算执行',
        description: '预算执行情况跟踪',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'asset',
        name: '资产预算',
        description: '资产采购预算管理',
        defaultPermission: VIEW_CREATE
      },
      {
        id: 'cashFlow',
        name: '现金流管理',
        description: '现金流预测和管理(待开发)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'hr',
        name: '薪酬预算',
        description: '薪酬成本预算管理(已更名)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'parameters',
        name: '预算参数',
        description: '预算编制参数配置',
        defaultPermission: VIEW_ONLY
      }
    ]
  },
  
  // ========== 个人信息 (6个子模块) ==========
  {
    id: 'profile',
    name: '个人信息',
    description: '个人信息、团队和消息管理',
    hasChildren: true,
    children: [
      {
        id: 'info',
        name: '基本信息',
        description: '个人基本信息管理',
        defaultPermission: FULL_PERMISSION
      },
      {
        id: 'team',
        name: '团队',
        description: '所属团队和成员信息',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'message',
        name: '消息',
        description: '系统消息和通知',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'goals',
        name: '我的目标',
        description: '个人目标查看和跟踪(待开发)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'execution',
        name: '执行力',
        description: '个人执行力分析(待开发)',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'performance',
        name: '绩效',
        description: '个人绩效查看(待开发)',
        defaultPermission: VIEW_ONLY
      }
    ]
  },
  
  // ========== 系统设置 (6个子模块) ==========
  {
    id: 'settings',
    name: '系统设置',
    description: '系统配置和权限管理',
    hasChildren: true,
    children: [
      {
        id: 'userApproval',
        name: '用户审核',
        description: '新用户注册审核',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'employees',
        name: '员工管理',
        description: '员工信息维护',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'departments',
        name: '部门管理',
        description: '部门组织架构管理',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'roles',
        name: '角色权限',
        description: '角色和权限配置',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'typeSettings',
        name: '参数配置',
        description: '系统参数和选项配置',
        defaultPermission: VIEW_ONLY
      },
      {
        id: 'operationLogs',
        name: '操作日志',
        description: '系统操作记录查询',
        defaultPermission: VIEW_ONLY
      }
    ]
  }
];

/**
 * 生成默认权限配置(用于新建角色)
 */
export function generateDefaultPermissions(): any {
  const permissions: any = {};
  
  SYSTEM_MODULES.forEach(module => {
    if (module.hasChildren && module.children) {
      // 有子模块的情况
      permissions[module.id] = {};
      module.children.forEach(child => {
        permissions[module.id][child.id] = child.defaultPermission || VIEW_CREATE;
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
