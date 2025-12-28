/**
 * 权限管理工具类
 * 包含功能权限和数据权限的验证逻辑
 */

// 功能权限定义
export interface FunctionPermission {
  module: string; // 模块名称
  actions: {
    view: boolean;   // 查看
    create: boolean; // 创建
    edit: boolean;   // 编辑
    delete: boolean; // 删除
    export: boolean; // 导出
  };
}

// 角色权限配置
export interface RolePermissions {
  role: string; // 角色名称（如：admin, manager, employee）
  permissions: FunctionPermission[];
}

// 数据权限类型
export type DataPermissionType = 'own' | 'department' | 'subordinate' | 'collaborator' | 'public';

/**
 * 获取用户的所有下级（递归）
 */
export async function getAllSubordinates(userId: string, db: any): Promise<string[]> {
  const subordinates: string[] = [];
  const queue = [userId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    try {
      const result = await db.collection('users')
        .where({ supervisorId: currentId })
        .get();
      
      for (const user of result.data) {
        if (!visited.has(user._id)) {
          subordinates.push(user._id);
          queue.push(user._id);
        }
      }
    } catch (error) {
      console.error('获取下级失败:', error);
    }
  }

  return subordinates;
}

/**
 * 获取用户的部门列表
 */
export async function getUserDepartments(userId: string, db: any): Promise<string[]> {
  try {
    const userResult = await db.collection('users').doc(userId).get();
    if (userResult.data && userResult.data.length > 0) {
      const user = userResult.data[0];
      return user.departments || [];
    }
  } catch (error) {
    console.error('获取用户部门失败:', error);
  }
  return [];
}

/**
 * 检查数据权限
 * @param currentUserId 当前用户ID
 * @param dataOwnerId 数据所有者ID
 * @param dataCollaborators 数据协作人ID列表
 * @param isPublic 数据是否公开
 * @param db 数据库实例
 * @returns 权限类型数组
 */
export async function checkDataPermission(
  currentUserId: string,
  dataOwnerId: string,
  dataCollaborators: string[] = [],
  isPublic: boolean = false,
  db: any
): Promise<DataPermissionType[]> {
  const permissions: DataPermissionType[] = [];

  // 1. 自己创建的数据
  if (currentUserId === dataOwnerId) {
    permissions.push('own');
    return permissions; // 拥有所有权限，直接返回
  }

  // 2. 协作人权限
  if (dataCollaborators.includes(currentUserId)) {
    permissions.push('collaborator');
  }

  // 3. 上级权限（可以查看所有下级的数据）
  const subordinates = await getAllSubordinates(currentUserId, db);
  if (subordinates.includes(dataOwnerId)) {
    permissions.push('subordinate');
  }

  // 4. 同部门权限（可以查看公开的数据）
  if (isPublic) {
    const currentUserDepts = await getUserDepartments(currentUserId, db);
    const dataOwnerDepts = await getUserDepartments(dataOwnerId, db);
    
    const hasCommonDept = currentUserDepts.some(dept => dataOwnerDepts.includes(dept));
    if (hasCommonDept) {
      permissions.push('department');
    }
    
    // 如果是公开数据，即使不同部门也能查看
    if (isPublic) {
      permissions.push('public');
    }
  }

  return permissions;
}

/**
 * 判断是否有查看权限
 */
export function canView(permissions: DataPermissionType[]): boolean {
  // 所有权限类型都可以查看
  return permissions.length > 0;
}

/**
 * 判断是否有编辑权限
 */
export function canEdit(permissions: DataPermissionType[]): boolean {
  // 只有创建者和协作人可以编辑
  return permissions.includes('own') || permissions.includes('collaborator');
}

/**
 * 判断是否有删除权限
 */
export function canDelete(permissions: DataPermissionType[]): boolean {
  // 只有创建者可以删除
  return permissions.includes('own');
}

/**
 * 获取用户的功能权限
 */
export async function getUserFunctionPermissions(
  userId: string,
  db: any
): Promise<FunctionPermission[]> {
  try {
    // 获取用户角色
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data || userResult.data.length === 0) {
      return [];
    }
    
    const user = userResult.data[0];
    const userRole = user.role || 'employee';

    // 获取角色权限配置
    const rolePermResult = await db.collection('role_permissions')
      .where({ role: userRole })
      .get();
    
    if (rolePermResult.data && rolePermResult.data.length > 0) {
      return rolePermResult.data[0].permissions || [];
    }

    // 如果没有配置，返回默认权限
    return getDefaultPermissions(userRole);
  } catch (error) {
    console.error('获取功能权限失败:', error);
    return [];
  }
}

/**
 * 检查功能权限
 */
export function checkFunctionPermission(
  permissions: FunctionPermission[] | null,
  module: string,
  action: keyof FunctionPermission['actions']
): boolean {
  // 添加空值检查
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }
  
  const modulePermission = permissions.find(p => p.module === module);
  if (!modulePermission) return false;
  return modulePermission.actions[action] || false;
}

/**
 * 获取默认权限配置
 */
function getDefaultPermissions(role: string): FunctionPermission[] {
  const modules = ['tasks', 'opportunities', 'projects', 'goal', 'account', 'issues'];
  
  if (role === 'admin') {
    // 管理员：所有权限
    return modules.map(module => ({
      module,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true
      }
    }));
  } else if (role === 'manager') {
    // 经理：除删除外的所有权限
    return modules.map(module => ({
      module,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: module === 'account', // 只能删除自己的账户
        export: true
      }
    }));
  } else {
    // 普通员工：基本权限
    return modules.map(module => ({
      module,
      actions: {
        view: true,
        create: true,
        edit: false, // 只能编辑自己的
        delete: false, // 只能删除自己的
        export: false
      }
    }));
  }
}

/**
 * 构建数据查询条件（根据权限）
 */
export async function buildQueryConditions(
  currentUserId: string,
  currentUserRole: string,
  db: any
): Promise<any> {
  console.log('🔍 [buildQueryConditions] 开始构建查询条件');
  console.log('  - currentUserId:', currentUserId);
  console.log('  - currentUserRole:', currentUserRole);
  
  // 管理员可以查看所有数据
  if (currentUserRole === 'admin') {
    console.log('✅ [buildQueryConditions] 检测到admin角色,返回空查询条件（查看所有数据）');
    return {};
  }

  // 获取当前用户信息（检查是否是部门负责人）
  const currentUserResult = await db.collection('users').doc(currentUserId).get();
  const currentUser = currentUserResult.data?.[0];
  const isDepartmentLeader = currentUser?.isDepartmentLeader || false;
  
  console.log('  - isDepartmentLeader:', isDepartmentLeader);
  
  // 获取用户的下级
  const subordinates = await getAllSubordinates(currentUserId, db);
  console.log('  - subordinates count:', subordinates.length);
  
  // 获取用户的部门
  const departments = await getUserDepartments(currentUserId, db);
  console.log('  - departments:', departments);

  // 构建查询条件
  const conditions: any[] = [
    { owner: currentUserId }, // 自己创建的
    { createdBy: currentUserId }, // 创建者字段(兼容不同模块)
    { collaborators: currentUserId }, // 作为协作人的(任务、商机、项目)
  ];
  
  // 🔧 问题管理模块：添加 solvers 条件(如果存在)
  // 使用独立条件，避免强制要求 solvers 字段
  conditions.push({ solvers: currentUserId });

  // 上级的数据：可以看到所有下级的数据（无条件）
  if (subordinates.length > 0) {
    conditions.push({ owner: { $in: subordinates } });
  }

  // 🔧 修复：只有部门负责人才能看到整个部门的所有数据
  // 普通员工只能看到自己创建的、作为协作人的、以及下级的数据
  if (departments.length > 0 && isDepartmentLeader) {
    const deptUsersResult = await db.collection('users')
      .where({ departments: { $in: departments } })
      .get();
    
    const deptUserIds = deptUsersResult.data.map((u: any) => u._id);
    
    // 只有部门负责人才能无条件查看整个部门数据
    conditions.push({ owner: { $in: deptUserIds } });
  }

  const queryConditions = { $or: conditions };
  console.log('🎯 [buildQueryConditions] 最终查询条件:', JSON.stringify(queryConditions, null, 2));

  return queryConditions;
}

/**
 * 权限缓存（避免频繁查询数据库）
 */
class PermissionCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5分钟过期

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const permissionCache = new PermissionCache();

/**
 * 检查问题管理的权限（专用）
 * @param currentUserId 当前用户ID
 * @param issue 问题对象
 * @returns 权限对象
 * 
 * 权限规则说明：
 * 1. 当发起人和解决人是同一人时，权限采用并集方式
 * 2. isOwner = true 时，拥有编辑问题详情的权限
 * 3. isSolver = true 时，拥有编辑解决方式和解决结果的权限
 * 4. 当两个角色重合时，同时拥有两种权限
 */
export function checkIssuePermission(currentUserId: string, issue: any) {
  const isOwner = currentUserId === issue.owner?._id || currentUserId === issue.owner;
  const isSolver = issue.solvers?.some((s: any) => 
    (typeof s === 'string' ? s : s._id) === currentUserId
  );
  
  // ✅ 权限并集：当发起人和解决人是同一人时，拥有两种权限
  const canEditDetails = isOwner; // 发起人可以编辑问题详情
  const canEditSolution = isSolver; // 解决人可以编辑解决方式和解决结果
  
  return {
    // 是否可以查看
    canView: true, // 所有有权限的人都可以查看
    
    // 是否可以编辑问题详情
    // ✅ 发起人可以编辑，即使同时是解决人也拥有此权限
    canEditDetails,
    
    // 是否可以编辑解决方式和解决结果
    // ✅ 解决人可以编辑，即使同时是发起人也拥有此权限
    canEditSolution,
    
    // 是否可以编辑答复与过程（所有有查询权限的人都可以）
    canComment: true,
    
    // 是否可以删除（只有管理员）
    canDelete: false, // 在组件中单独判断admin角色
    
    // 角色标识
    isOwner,
    isSolver
  };
}
