/**
 * 前端权限工具库
 * v2.1.0 - 完整的前端权限检查和控制
 */

export interface User {
  _id: string;
  username: string;
  name: string;
  role: string;
  roles?: string[];  // 新增: 用户的角色ID数组
  department?: string;
  superiorId?: string;
  isExecutive?: boolean;
  [key: string]: any;
}

export interface DataItem {
  _id: string;
  ownerId?: string;
  creatorId?: string;
  participantIds?: string[];
  isPublic?: boolean;
  isEditLocked?: boolean;
  team?: string;
  [key: string]: any;
}

export interface RolePermission {
  _id: string;
  role: string;
  name?: string;  // 新增: 角色名称
  moduleName: string;
  moduleKey: string;
  subModuleName?: string;
  subModuleKey?: string;
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    export?: boolean;
    import?: boolean;
  };
}

/**
 * 获取用户的所有角色权限
 * admin角色默认拥有所有权限
 * 
 * v2.2.0 更新:
 * - 支持通过 user.roles 数组(新格式)查找权限
 * - 兼容通过 user.role 字段(旧格式)查找权限
 */
export function getUserPermissions(user: User, rolePermissions: RolePermission[]): any {
  if (!user) {
    console.warn('[权限] 用户对象为空');
    return {};
  }

  // ✅ admin特殊规则:直接返回全部权限
  if (user.role === 'admin') {
    console.log('[权限] admin用户,返回全部权限');
    return {
      tasks: { view: true, create: true, edit: true, delete: true, export: true },
      opportunities: { view: true, create: true, edit: true, delete: true, export: true },
      projects: { view: true, create: true, edit: true, delete: true, export: true },
      goal: {
        salesGoal: { view: true, create: true, edit: true, delete: true, export: true },
        opportunityGoal: { view: true, create: true, edit: true, delete: true, export: true },
        strategy: { view: true, create: true, edit: true, delete: true, export: true },
        execution: { view: true, create: true, edit: true, delete: true, export: true }
      },
      settings: {
        userApproval: { view: true, create: true, edit: true, delete: true, export: true },
        employees: { view: true, create: true, edit: true, delete: true, export: true },
        departments: { view: true, create: true, edit: true, delete: true, export: true },
        roles: { view: true, create: true, edit: true, delete: true, export: true },
        typeSettings: { view: true, create: true, edit: true, delete: true, export: true },
        operationLogs: { view: true, create: true, edit: true, delete: true, export: true }
      }
    };
  }

  if (!rolePermissions || rolePermissions.length === 0) {
    console.warn('[权限] 角色权限配置为空');
    return {};
  }

  const permissions: any = {};
  
  // 🔇 静默模式:仅在开发环境下输出调试日志
  const DEBUG = false; // 设置为 true 启用调试日志
  
  if (DEBUG) {
    console.log('[权限] 开始计算用户权限:', {
      username: user.username,
      role: user.role,
      roles: user.roles,
      rolePermissionsCount: rolePermissions.length
    });
  }

  // 方式1(新): 通过 user.roles 数组查找权限 (优先使用)
  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    if (DEBUG) {
      console.log('[权限] 使用 user.roles 数组匹配权限:', user.roles);
    }
    
    // 从 role_permissions 表中查找匹配的角色配置
    // 匹配规则: rolePermission._id 在 user.roles 数组中 或 rolePermission.role 在 user.roles 数组中
    const matchedRoles = rolePermissions.filter(rp => 
      user.roles!.includes(rp._id) || user.roles!.includes(rp.role)
    );
    
    if (DEBUG) {
      console.log('[权限] 通过 user.roles 匹配到的角色:', matchedRoles.map(r => ({
        name: r.name,
        role: r.role,
        _id: r._id
      })));
    }
    
    if (matchedRoles.length > 0) {
      // 合并多个角色的权限 (取并集,只要有一个角色有权限就返回true)
      matchedRoles.forEach(rp => {
        // ✨ 检测权限结构类型
        if (rp.moduleKey) {
          // 新格式: 模块化结构 (每条记录对应一个模块)
          const moduleKey = rp.subModuleKey 
            ? `${rp.moduleKey}.${rp.subModuleKey}`
            : rp.moduleKey;
          
          if (!permissions[moduleKey]) {
            permissions[moduleKey] = { ...rp.permissions };
          } else {
            // 合并权限: 任一角色有权限则为true
            Object.keys(rp.permissions).forEach(action => {
              if (rp.permissions[action as keyof typeof rp.permissions]) {
                permissions[moduleKey][action] = true;
              }
            });
          }
        } else {
          // 旧格式: 扁平化结构 (一条记录包含所有模块)
          // permissions 字段直接包含所有模块的权限配置
          Object.keys(rp.permissions).forEach(moduleKey => {
            const modulePerms = rp.permissions[moduleKey];
            if (!permissions[moduleKey]) {
              permissions[moduleKey] = { ...modulePerms };
            } else {
              // 合并权限: 任一角色有权限则为true
              Object.keys(modulePerms).forEach(action => {
                if (modulePerms[action]) {
                  permissions[moduleKey][action] = true;
                }
              });
            }
          });
        }
      });
      
      if (DEBUG) {
        console.log('[权限] 最终权限:', permissions);
      }
      return permissions;
    }
    
    if (DEBUG) {
      console.warn('[权限] user.roles 数组不为空,但未匹配到任何角色权限');
    }
  }
  
  // 方式2(旧): 通过 user.role 字段查找权限 (兼容旧数据)
  if (user.role && user.role !== '') {
    if (DEBUG) {
      console.log('[权限] 使用 user.role 字段匹配权限:', user.role);
    }
    const matchedByRole = rolePermissions.filter(rp => rp.role === user.role);
    
    if (DEBUG) {
      console.log('[权限] 通过 user.role 匹配到的角色:', matchedByRole.map(r => ({
        name: r.name,
        role: r.role,
        _id: r._id
      })));
    }
    
    if (matchedByRole.length > 0) {
      matchedByRole.forEach(rp => {
        // ✨ 检测权限结构类型
        if (rp.moduleKey) {
          // 新格式: 模块化结构
          const moduleKey = rp.subModuleKey 
            ? `${rp.moduleKey}.${rp.subModuleKey}`
            : rp.moduleKey;
          
          permissions[moduleKey] = rp.permissions;
        } else {
          // 旧格式: 扁平化结构
          // permissions 字段直接包含所有模块的权限配置
          Object.keys(rp.permissions).forEach(moduleKey => {
            permissions[moduleKey] = rp.permissions[moduleKey];
          });
        }
      });

      if (DEBUG) {
        console.log('[权限] 最终权限:', permissions);
      }
      return permissions;
    }
    
    // v2.2.0: 检测到使用了废弃的'user'角色
    if (user.role === 'user') {
      if (DEBUG) {
        console.error('[权限] ⚠️ 检测到用户使用废弃的"user"角色,该角色已被删除!');
        console.error('[权限] 💡 解决方法: 请管理员为该用户分配正确的角色(roles数组)');
      }
      return {};
    }
  }
  
  // 没有任何角色配置
  if (DEBUG) {
    console.warn('[权限] ⚠️ 用户没有任何角色配置 (role为空且roles数组为空或不存在)');
    console.warn('[权限] 💡 解决方法: 请管理员为该用户分配角色');
  }
  return permissions;
}

/**
 * 检查用户是否有某个功能权限
 * @param user 用户对象
 * @param rolePermissions 角色权限配置
 * @param module 模块key (如: 'tasks', 'opportunities.stages')
 * @param action 操作类型 ('view' | 'create' | 'edit' | 'delete' | 'export' | 'import')
 */
export function hasPermission(
  user: User,
  rolePermissions: RolePermission[],
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import'
): boolean {
  // 系统管理员拥有所有权限
  if (user.role === 'admin') {
    return true;
  }

  const permissions = getUserPermissions(user, rolePermissions);
  
  // 🔧 支持嵌套路径：将 'goal.salesGoal' 拆分为 ['goal', 'salesGoal']
  const modulePath = module.split('.');
  let modulePerms: any = permissions;
  
  // 逐级访问嵌套对象
  for (const key of modulePath) {
    if (!modulePerms || typeof modulePerms !== 'object') {
      return false;
    }
    modulePerms = modulePerms[key];
  }

  if (!modulePerms) {
    return false;
  }

  // 如果 modulePerms 是对象且包含子模块，检查任一子模块的权限
  if (typeof modulePerms === 'object' && !Array.isArray(modulePerms)) {
    // 先尝试直接访问 action
    if (modulePerms[action] === true) {
      return true;
    }
    
    // 如果没有直接的 action，检查子模块
    // 只要有任一子模块拥有该 action 权限，就返回 true
    const hasSubModulePermission = Object.keys(modulePerms).some(subModuleKey => {
      const subModulePerms = modulePerms[subModuleKey];
      return typeof subModulePerms === 'object' && subModulePerms[action] === true;
    });
    
    return hasSubModulePermission;
  }

  return modulePerms[action] === true;
}

/**
 * 检查用户是否有某个数据项的查看权限
 */
export function canView(user: User, dataItem: DataItem): boolean {
  // 系统管理员可以查看所有数据
  if (user.role === 'admin') {
    return true;
  }

  // 数据所有者可以查看
  if (dataItem.ownerId === user._id || dataItem.creatorId === user._id) {
    return true;
  }

  // 参与者可以查看
  if (dataItem.participantIds?.includes(user._id)) {
    return true;
  }

  // 公开数据可以查看
  if (dataItem.isPublic === true) {
    return true;
  }

  // 总经理可以查看所有数据
  if (user.role === 'general_manager') {
    return true;
  }

  // 部门经理可以查看本部门数据
  if (user.role === 'department_manager' && dataItem.team === user.department) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否有某个数据项的编辑权限
 */
export function canEdit(user: User, dataItem: DataItem): boolean {
  // 系统管理员可以编辑所有数据
  if (user.role === 'admin') {
    return true;
  }

  // 被锁定的数据不能编辑
  if (dataItem.isEditLocked === true) {
    return false;
  }

  // 数据所有者可以编辑
  if (dataItem.ownerId === user._id || dataItem.creatorId === user._id) {
    return true;
  }

  // 总经理可以编辑所有数据
  if (user.role === 'general_manager') {
    return true;
  }

  // 部门经理可以编辑本部门数据
  if (user.role === 'department_manager' && dataItem.team === user.department) {
    return true;
  }

  return false;
}

/**
 * 检查用户是否有某个数据项的删除权限
 */
export function canDelete(user: User, dataItem: DataItem): boolean {
  // 系统管理员可以删除所有数据
  if (user.role === 'admin') {
    return true;
  }

  // 被锁定的数据不能删除
  if (dataItem.isEditLocked === true) {
    return false;
  }

  // 数据所有者可以删除
  if (dataItem.ownerId === user._id || dataItem.creatorId === user._id) {
    return true;
  }

  // 总经理可以删除所有数据
  if (user.role === 'general_manager') {
    return true;
  }

  return false;
}

/**
 * 过滤用户可访问的数据列表
 */
export function filterAccessibleData<T extends DataItem>(
  user: User,
  dataList: T[]
): T[] {
  if (!user || !dataList) {
    return [];
  }

  // 系统管理员可以访问所有数据
  if (user.role === 'admin') {
    return dataList;
  }

  // 总经理可以访问所有数据
  if (user.role === 'general_manager') {
    return dataList;
  }

  // 普通用户和部门经理需要根据规则过滤
  return dataList.filter(item => canView(user, item));
}

/**
 * 批量检查数据编辑权限（返回带权限标识的数据）
 */
export function attachEditPermissions<T extends DataItem>(
  user: User,
  dataList: T[]
): Array<T & { canEdit: boolean; canDelete: boolean }> {
  return dataList.map(item => ({
    ...item,
    canEdit: canEdit(user, item),
    canDelete: canDelete(user, item)
  }));
}

/**
 * 检查用户是否可以访问某个路由
 * @param user 用户对象
 * @param routePath 路由路径
 * @param rolePermissions 角色权限配置
 */
export function canAccessRoute(
  user: User,
  routePath: string,
  rolePermissions: RolePermission[]
): boolean {
  // 系统管理员可以访问所有路由
  if (user.role === 'admin') {
    return true;
  }

  // 路由与模块的映射关系
  const routeModuleMap: Record<string, string> = {
    '/tasks': 'tasks',
    '/opportunities': 'opportunities',
    '/projects': 'projects',
    '/goals': 'goals',
    '/employees': 'employees',
    '/system': 'system',
    '/system/roles': 'system.roles',
    '/system/types': 'system.types',
    '/system/parameters': 'system.parameters'
  };

  const module = routeModuleMap[routePath];
  
  if (!module) {
    // 未映射的路由默认允许访问
    return true;
  }

  // 检查是否有查看权限
  return hasPermission(user, rolePermissions, module, 'view');
}

/**
 * 获取用户可访问的菜单列表
 */
export interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
}

export function getAccessibleMenus(
  user: User,
  allMenus: MenuItem[],
  rolePermissions: RolePermission[]
): MenuItem[] {
  if (user.role === 'admin') {
    return allMenus;
  }

  return allMenus
    .filter(menu => {
      // 检查顶级菜单权限
      if (menu.path && !canAccessRoute(user, menu.path, rolePermissions)) {
        return false;
      }

      // 如果有子菜单，过滤子菜单
      if (menu.children) {
        menu.children = menu.children.filter(child => 
          !child.path || canAccessRoute(user, child.path, rolePermissions)
        );
        
        // 如果所有子菜单都被过滤掉，则隐藏父菜单
        if (menu.children.length === 0) {
          return false;
        }
      }

      return true;
    })
    .map(menu => ({ ...menu })); // 返回副本，避免修改原数组
}

/**
 * 检查按钮权限（用于按钮显示/隐藏）
 */
export function hasButtonPermission(
  user: User,
  rolePermissions: RolePermission[],
  module: string,
  action: 'create' | 'edit' | 'delete' | 'export' | 'import',
  dataItem?: DataItem
): boolean {
  // 先检查功能权限
  const hasFunctionPerm = hasPermission(user, rolePermissions, module, action);
  
  if (!hasFunctionPerm) {
    return false;
  }

  // 如果是编辑/删除操作且提供了数据项，需要检查数据权限
  if (dataItem) {
    if (action === 'edit') {
      return canEdit(user, dataItem);
    }
    
    if (action === 'delete') {
      return canDelete(user, dataItem);
    }
  }

  return true;
}
