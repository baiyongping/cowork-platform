/**
 * RBAC (基于角色的访问控制) 增强系统
 * 支持角色、权限、资源的细粒度管理
 */

import { db } from '../lib/cloudbase';

// ========== 类型定义 ==========

/** 用户角色定义 */
export type UserRole = 'admin' | 'manager' | 'employee';

/** 权限操作类型 */
export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'assign';

/** 资源类型 */
export type Resource = 'task' | 'opportunity' | 'project' | 'goal' | 'account' | 'settings' | 'approval';

/** 数据范围类型 */
export type DataScope = 'all' | 'department' | 'subordinate' | 'own';

/** 角色配置接口 */
export interface RoleConfig {
  role: UserRole;
  name: string;
  description: string;
  level: number; // 角色层级: 1=admin, 2=manager, 3=employee
  permissions: ResourcePermission[];
  dataScope: DataScope;
  canManageRoles: UserRole[]; // 可以管理的角色列表
}

/** 资源权限接口 */
export interface ResourcePermission {
  resource: Resource;
  permissions: Permission[];
}

/** 用户信息接口 */
export interface UserInfo {
  _id: string;
  username: string;
  name: string;
  role: UserRole;
  departments: string[];
  supervisorId?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

// ========== 角色配置 ==========

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    role: 'admin',
    name: '系统管理员',
    description: '拥有系统所有权限，可管理所有数据和用户',
    level: 1,
    dataScope: 'all',
    canManageRoles: ['admin', 'manager', 'employee'],
    permissions: [
      {
        resource: 'task',
        permissions: ['view', 'create', 'edit', 'delete', 'export', 'assign']
      },
      {
        resource: 'opportunity',
        permissions: ['view', 'create', 'edit', 'delete', 'export', 'assign']
      },
      {
        resource: 'project',
        permissions: ['view', 'create', 'edit', 'delete', 'export', 'assign']
      },
      {
        resource: 'goal',
        permissions: ['view', 'create', 'edit', 'delete', 'export', 'assign']
      },
      {
        resource: 'account',
        permissions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        resource: 'settings',
        permissions: ['view', 'edit']
      },
      {
        resource: 'approval',
        permissions: ['view', 'approve']
      }
    ]
  },
  manager: {
    role: 'manager',
    name: '部门经理',
    description: '可管理本部门及下级的数据，审批本部门事务',
    level: 2,
    dataScope: 'subordinate',
    canManageRoles: ['employee'],
    permissions: [
      {
        resource: 'task',
        permissions: ['view', 'create', 'edit', 'delete', 'export', 'assign']
      },
      {
        resource: 'opportunity',
        permissions: ['view', 'create', 'edit', 'export', 'assign']
      },
      {
        resource: 'project',
        permissions: ['view', 'create', 'edit', 'export', 'assign']
      },
      {
        resource: 'goal',
        permissions: ['view', 'create', 'edit', 'export']
      },
      {
        resource: 'account',
        permissions: ['view', 'edit']
      },
      {
        resource: 'approval',
        permissions: ['view', 'approve']
      }
    ]
  },
  employee: {
    role: 'employee',
    name: '普通员工',
    description: '只能管理自己创建的数据和被分配的任务',
    level: 3,
    dataScope: 'own',
    canManageRoles: [],
    permissions: [
      {
        resource: 'task',
        permissions: ['view', 'create', 'edit']
      },
      {
        resource: 'opportunity',
        permissions: ['view', 'create', 'edit']
      },
      {
        resource: 'project',
        permissions: ['view', 'create']
      },
      {
        resource: 'goal',
        permissions: ['view', 'create', 'edit']
      },
      {
        resource: 'account',
        permissions: ['view', 'edit']
      }
    ]
  }
};

// ========== 权限检查函数 ==========

/**
 * 检查用户是否有指定资源的权限
 */
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  permission: Permission
): boolean {
  const roleConfig = ROLE_CONFIGS[userRole];
  if (!roleConfig) return false;

  const resourcePerm = roleConfig.permissions.find(p => p.resource === resource);
  if (!resourcePerm) return false;

  return resourcePerm.permissions.includes(permission);
}

/**
 * 检查用户是否可以访问某个数据
 */
export async function canAccessData(
  currentUser: UserInfo,
  dataOwnerId: string,
  dataCollaborators: string[] = [],
  isPublic: boolean = false
): Promise<boolean> {
  // 管理员可以访问所有数据
  if (currentUser.role === 'admin') {
    return true;
  }

  // 数据所有者可以访问
  if (currentUser._id === dataOwnerId) {
    return true;
  }

  // 协作人可以访问
  if (dataCollaborators.includes(currentUser._id)) {
    return true;
  }

  // 经理可以访问下级的数据
  if (currentUser.role === 'manager') {
    const subordinates = await getAllSubordinates(currentUser._id);
    if (subordinates.includes(dataOwnerId)) {
      return true;
    }
  }

  // 同部门的公开数据可以访问
  if (isPublic && currentUser.departments.length > 0) {
    try {
      const ownerResult = await db.collection('users').doc(dataOwnerId).get();
      if (ownerResult.data && ownerResult.data.length > 0) {
        const owner = ownerResult.data[0];
        const hasCommonDept = currentUser.departments.some(dept => 
          (owner.departments || []).includes(dept)
        );
        if (hasCommonDept) {
          return true;
        }
      }
    } catch (error) {
      console.error('检查部门权限失败:', error);
    }
  }

  return false;
}

/**
 * 检查用户是否可以编辑某个数据
 */
export async function canEditData(
  currentUser: UserInfo,
  dataOwnerId: string,
  dataCollaborators: string[] = []
): Promise<boolean> {
  // 管理员可以编辑所有数据
  if (currentUser.role === 'admin') {
    return true;
  }

  // 数据所有者可以编辑
  if (currentUser._id === dataOwnerId) {
    return true;
  }

  // 协作人可以编辑
  if (dataCollaborators.includes(currentUser._id)) {
    return true;
  }

  // 经理可以编辑下级的数据
  if (currentUser.role === 'manager') {
    const subordinates = await getAllSubordinates(currentUser._id);
    if (subordinates.includes(dataOwnerId)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否可以删除某个数据
 */
export async function canDeleteData(
  currentUser: UserInfo,
  dataOwnerId: string
): Promise<boolean> {
  // 管理员可以删除所有数据
  if (currentUser.role === 'admin') {
    return true;
  }

  // 经理可以删除下级的数据
  if (currentUser.role === 'manager') {
    const subordinates = await getAllSubordinates(currentUser._id);
    if (subordinates.includes(dataOwnerId)) {
      return true;
    }
  }

  // 只有数据所有者可以删除自己的数据
  return currentUser._id === dataOwnerId;
}

/**
 * 获取用户的所有下级（递归）
 */
export async function getAllSubordinates(userId: string): Promise<string[]> {
  const subordinates: string[] = [];
  const visited = new Set<string>();
  const queue = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    try {
      const result = await db.collection('users')
        .where({ 
          supervisorId: currentId,
          approvalStatus: 'approved',
          isActive: true
        })
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
 * 构建数据查询过滤条件
 */
export async function buildDataFilter(currentUser: UserInfo): Promise<any> {
  const roleConfig = ROLE_CONFIGS[currentUser.role];
  if (!roleConfig) {
    throw new Error('无效的用户角色');
  }

  // 管理员可以查看所有数据
  if (roleConfig.dataScope === 'all') {
    return {};
  }

  // 只能查看自己的数据
  if (roleConfig.dataScope === 'own') {
    return {
      $or: [
        { ownerId: currentUser._id },
        { collaborators: currentUser._id }
      ]
    };
  }

  // 可以查看下级的数据
  if (roleConfig.dataScope === 'subordinate') {
    const subordinates = await getAllSubordinates(currentUser._id);
    return {
      $or: [
        { ownerId: currentUser._id },
        { ownerId: { $in: subordinates } },
        { collaborators: currentUser._id },
        { 
          isPublic: true,
          // 可以查看同部门的公开数据
          ...(currentUser.departments.length > 0 ? {
            ownerDepartments: { $in: currentUser.departments }
          } : {})
        }
      ]
    };
  }

  // 可以查看部门的数据
  if (roleConfig.dataScope === 'department') {
    if (currentUser.departments.length === 0) {
      return { ownerId: currentUser._id };
    }

    return {
      $or: [
        { ownerId: currentUser._id },
        { collaborators: currentUser._id },
        { 
          isPublic: true,
          ownerDepartments: { $in: currentUser.departments }
        }
      ]
    };
  }

  return {};
}

/**
 * 检查用户是否可以管理指定角色
 */
export function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  const roleConfig = ROLE_CONFIGS[currentRole];
  if (!roleConfig) return false;
  return roleConfig.canManageRoles.includes(targetRole);
}

/**
 * 获取用户可见的角色列表
 */
export function getManageableRoles(currentRole: UserRole): UserRole[] {
  const roleConfig = ROLE_CONFIGS[currentRole];
  return roleConfig?.canManageRoles || [];
}

/**
 * 验证角色层级关系
 */
export function isHigherRole(role1: UserRole, role2: UserRole): boolean {
  const level1 = ROLE_CONFIGS[role1]?.level || 999;
  const level2 = ROLE_CONFIGS[role2]?.level || 999;
  return level1 < level2;
}

// ========== 导出 ==========

export default {
  ROLE_CONFIGS,
  hasPermission,
  canAccessData,
  canEditData,
  canDeleteData,
  getAllSubordinates,
  buildDataFilter,
  canManageRole,
  getManageableRoles,
  isHigherRole
};
