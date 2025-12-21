/**
 * 权限检查核心函数库
 * Version: v2.1.0
 * Date: 2025-12-15
 */

export interface User {
  id: number;
  username: string;
  roleId: string;
  isExecutive: boolean;
  team: string;
  departmentId?: number;
  superiorId?: number | null;
}

export interface DataItem {
  id: number;
  createdBy: number;
  ownerId?: number;
  collaborators?: number[];
  isEditLocked?: boolean;
  team?: string;
  level?: 'company' | 'team' | 'personal' | '公司级' | '团队级' | '个人级';
}

export interface RolePermission {
  roleId: string;
  roleName: string;
  permissions: {
    [module: string]: {
      view?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
      export?: boolean;
      [key: string]: any;
    };
  };
}

/**
 * 检查数据权限
 * @param user 当前用户
 * @param item 数据项
 * @param action 操作类型 ('view' | 'edit' | 'delete')
 * @param userSubordinates 用户下级ID列表(用于上级权限检查)
 * @param departmentMembers 部门成员ID列表(用于部门经理权限检查)
 * @returns 是否有权限
 */
export function checkDataPermission(
  user: User,
  item: DataItem,
  action: 'view' | 'edit' | 'delete',
  userSubordinates: number[] = [],
  departmentMembers: number[] = []
): boolean {
  // D-001: 管理员拥有所有权限
  if (user.roleId === 'admin') {
    return true;
  }

  // D-003: 禁止编辑检查(仅针对编辑和删除操作)
  if ((action === 'edit' || action === 'delete') && item.isEditLocked) {
    return false;
  }

  // D-002: 创建者权限
  const isCreator = item.createdBy === user.id;

  // D-006: 协同人权限
  const isCollaborator = item.collaborators?.includes(user.id) || false;

  // D-004: 部门经理权限 - 查看和管理本部门及子部门数据
  const isDepartmentMember = departmentMembers.includes(item.createdBy || item.ownerId || 0);
  const isDepartmentManager = user.roleId === 'manager' && isDepartmentMember;

  // D-005: 上级权限 - 查看和管理下级数据(递归)
  const isSuperior = userSubordinates.includes(item.createdBy || item.ownerId || 0);

  // D-009: 高管全局查看权限
  const isExecutiveView = user.isExecutive && action === 'view';

  // 权限判断逻辑
  switch (action) {
    case 'view':
      return isCreator || isCollaborator || isDepartmentManager || isSuperior || isExecutiveView;

    case 'edit':
      // D-006: 协同人可编辑
      return isCreator || isCollaborator || isDepartmentManager || isSuperior;

    case 'delete':
      // 删除权限更严格：只有创建者、部门经理、上级有权限
      return isCreator || isDepartmentManager || isSuperior;

    default:
      return false;
  }
}

/**
 * 检查功能权限
 * @param user 当前用户
 * @param rolePermissions 角色权限配置
 * @param module 模块名称
 * @param action 操作类型
 * @param subModule 子模块名称(可选,用于目标管理、系统设置等)
 * @returns 是否有功能权限
 */
export function checkFunctionPermission(
  user: User | null,
  rolePermissions: RolePermission | null,
  module: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export',
  subModule?: string
): boolean {
  // admin超级管理员拥有所有功能权限
  if (user && user.roleId === 'admin') {
    return true;
  }

  if (!rolePermissions || !rolePermissions.permissions) {
    return false;
  }

  const modulePerms = rolePermissions.permissions[module];
  if (!modulePerms) {
    return false;
  }

  // 如果有子模块(如goals.salesGoals, settings.employees)
  if (subModule && typeof modulePerms[subModule] === 'object') {
    return modulePerms[subModule][action] || false;
  }

  return modulePerms[action] || false;
}

/**
 * 获取用户可访问的数据列表(带权限过滤)
 * @param user 当前用户
 * @param allData 所有数据列表
 * @param userSubordinates 用户下级ID列表
 * @param departmentMembers 部门成员ID列表
 * @returns 过滤后的数据列表
 */
export function getUserAccessibleData<T extends DataItem>(
  user: User,
  allData: T[],
  userSubordinates: number[] = [],
  departmentMembers: number[] = []
): T[] {
  // 管理员和高管查看所有数据
  if (user.roleId === 'admin' || user.isExecutive) {
    return allData;
  }

  return allData.filter(item => 
    checkDataPermission(user, item, 'view', userSubordinates, departmentMembers)
  );
}

/**
 * 获取工作台任务列表(特殊规则)
 * D-008: 普通用户只看本团队任务
 * D-009: 高管查看所有任务
 * @param user 当前用户
 * @param allTasks 所有任务列表
 * @returns 过滤后的任务列表
 */
export function getTeamTasksForDashboard<T extends DataItem>(
  user: User,
  allTasks: T[]
): T[] {
  // D-009: 高管和管理员查看所有任务
  if (user.isExecutive || user.roleId === 'admin') {
    return allTasks;
  }

  // D-008: 普通用户只看本团队任务
  return allTasks.filter(task => task.team === user.team);
}

/**
 * 检查是否可以编辑(组合功能权限和数据权限)
 * @param user 当前用户
 * @param item 数据项
 * @param rolePermissions 角色权限
 * @param module 模块名称
 * @param userSubordinates 用户下级ID列表
 * @param departmentMembers 部门成员ID列表
 * @returns 是否可以编辑
 */
export function canEdit(
  user: User,
  item: DataItem,
  rolePermissions: RolePermission | null,
  module: string,
  userSubordinates: number[] = [],
  departmentMembers: number[] = []
): boolean {
  // 先检查功能权限
  const hasFunctionPermission = checkFunctionPermission(user, rolePermissions, module, 'edit');
  if (!hasFunctionPermission) {
    return false;
  }

  // 再检查数据权限
  return checkDataPermission(user, item, 'edit', userSubordinates, departmentMembers);
}

/**
 * 检查是否可以删除(组合功能权限和数据权限)
 * @param user 当前用户
 * @param item 数据项
 * @param rolePermissions 角色权限
 * @param module 模块名称
 * @param userSubordinates 用户下级ID列表
 * @param departmentMembers 部门成员ID列表
 * @returns 是否可以删除
 */
export function canDelete(
  user: User,
  item: DataItem,
  rolePermissions: RolePermission | null,
  module: string,
  userSubordinates: number[] = [],
  departmentMembers: number[] = []
): boolean {
  // 先检查功能权限
  const hasFunctionPermission = checkFunctionPermission(user, rolePermissions, module, 'delete');
  if (!hasFunctionPermission) {
    return false;
  }

  // 再检查数据权限
  return checkDataPermission(user, item, 'delete', userSubordinates, departmentMembers);
}

/**
 * 递归获取用户的所有下级ID
 * @param userId 用户ID
 * @param allUsers 所有用户列表
 * @returns 下级ID数组
 */
export function getSubordinates(userId: number, allUsers: User[]): number[] {
  const subordinates: number[] = [];
  const directSubordinates = allUsers.filter(u => u.superiorId === userId);

  for (const sub of directSubordinates) {
    subordinates.push(sub.id);
    // 递归获取下级的下级
    subordinates.push(...getSubordinates(sub.id, allUsers));
  }

  return subordinates;
}

/**
 * 获取部门及子部门的所有成员ID
 * @param departmentId 部门ID
 * @param allUsers 所有用户列表
 * @param departmentTree 部门树结构
 * @returns 成员ID数组
 */
export function getDepartmentMembers(
  departmentId: number,
  allUsers: User[],
  departmentTree: { id: number; parentId: number | null }[]
): number[] {
  const members: number[] = [];

  // 获取当前部门成员
  const currentDeptMembers = allUsers.filter(u => u.departmentId === departmentId);
  members.push(...currentDeptMembers.map(u => u.id));

  // 获取子部门
  const subDepartments = departmentTree.filter(d => d.parentId === departmentId);
  for (const subDept of subDepartments) {
    // 递归获取子部门成员
    members.push(...getDepartmentMembers(subDept.id, allUsers, departmentTree));
  }

  return members;
}
