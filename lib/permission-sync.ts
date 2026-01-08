/**
 * 权限同步器 - 自动同步模块权限到角色
 * 
 * 功能：
 * 1. 同步新增模块的权限到所有角色
 * 2. 同步模块名称变更
 * 3. 同步模块删除（移除权限）
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-08
 */

import { db } from './cloudbase';
import type { ModulePermission } from '@/constants/modules';

/**
 * 角色接口
 */
interface Role {
  _id: string;
  name: string;
  permissions: Record<string, ModulePermission>;
  [key: string]: any;
}

/**
 * 权限同步器类
 */
export class PermissionSync {
  /**
   * 同步新增模块的权限到所有角色
   * 
   * @param moduleId 模块ID
   * @param moduleName 模块名称
   * @param defaultPermission 默认权限级别
   */
  static async syncNewModule(
    moduleId: string,
    moduleName: string,
    defaultPermission: string = 'view_only'
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    console.log(`[PermissionSync] 开始同步新模块权限: ${moduleId} (${moduleName})`);

    try {
      // 1. 获取所有角色
      const { data: roles } = await db.collection('roles').get<Role>();
      console.log(`[PermissionSync] 找到 ${roles.length} 个角色`);

      if (roles.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      // 2. 转换默认权限
      const permission = this.convertPermissionFromString(defaultPermission);

      // 3. 批量更新角色权限
      let updatedCount = 0;
      const updatePromises = roles.map(async (role) => {
        // 检查是否已有该模块权限
        if (role.permissions && role.permissions[moduleId]) {
          console.log(`[PermissionSync] 角色 ${role.name} 已有模块 ${moduleId} 权限，跳过`);
          return;
        }

        // 添加新模块权限
        const newPermissions = {
          ...role.permissions,
          [moduleId]: this.getDefaultPermissionForRole(role, moduleId, permission)
        };

        await db.collection('roles')
          .doc(role._id)
          .update({
            permissions: newPermissions,
            updatedAt: new Date()
          });

        console.log(`[PermissionSync] 更新角色 ${role.name} 的权限`);
        updatedCount++;
      });

      await Promise.all(updatePromises);

      // 4. 记录日志
      await this.logPermissionChange('add_module', moduleId, updatedCount);

      console.log(`[PermissionSync] 同步完成，更新了 ${updatedCount} 个角色`);

      return { success: true, updatedCount };
    } catch (error: any) {
      console.error(`[PermissionSync] 同步失败:`, error);
      return { success: false, updatedCount: 0, error: error.message };
    }
  }

  /**
   * 同步模块名称变更
   * 
   * 注意：权限结构中不存储名称，所以这个方法主要用于日志记录
   */
  static async syncModuleRename(
    moduleId: string,
    oldName: string,
    newName: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`[PermissionSync] 模块名称变更: ${moduleId} (${oldName} -> ${newName})`);

    try {
      // 记录日志
      await this.logPermissionChange('rename_module', moduleId, 0, {
        oldName,
        newName
      });

      return {
        success: true,
        message: '模块名称变更已记录'
      };
    } catch (error: any) {
      console.error(`[PermissionSync] 记录失败:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 同步模块删除（移除所有角色的该模块权限）
   */
  static async syncModuleDelete(
    moduleId: string,
    moduleName: string
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    console.log(`[PermissionSync] 开始删除模块权限: ${moduleId} (${moduleName})`);

    try {
      // 1. 获取所有角色
      const { data: roles } = await db.collection('roles').get<Role>();

      // 2. 批量删除模块权限
      let updatedCount = 0;
      const updatePromises = roles.map(async (role) => {
        if (!role.permissions || !role.permissions[moduleId]) {
          return;
        }

        // 创建新的权限对象（不包含被删除的模块）
        const { [moduleId]: removed, ...newPermissions } = role.permissions;

        await db.collection('roles')
          .doc(role._id)
          .update({
            permissions: newPermissions,
            updatedAt: new Date()
          });

        console.log(`[PermissionSync] 删除角色 ${role.name} 的模块 ${moduleId} 权限`);
        updatedCount++;
      });

      await Promise.all(updatePromises);

      // 3. 记录日志
      await this.logPermissionChange('delete_module', moduleId, updatedCount);

      console.log(`[PermissionSync] 删除完成，更新了 ${updatedCount} 个角色`);

      return { success: true, updatedCount };
    } catch (error: any) {
      console.error(`[PermissionSync] 删除失败:`, error);
      return { success: false, updatedCount: 0, error: error.message };
    }
  }

  /**
   * 根据角色类型获取默认权限
   */
  private static getDefaultPermissionForRole(
    role: Role,
    moduleId: string,
    defaultPermission: ModulePermission
  ): ModulePermission {
    // 管理员默认给完全权限
    if (role.name === '管理员' || role._id === 'admin') {
      return {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true
      };
    }

    // 其他角色使用模块的默认权限
    return defaultPermission;
  }

  /**
   * 转换权限字符串为对象
   */
  private static convertPermissionFromString(permission: string): ModulePermission {
    const permissionMap: Record<string, ModulePermission> = {
      'view_only': {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false
      },
      'view_create': {
        view: true,
        create: true,
        edit: false,
        delete: false,
        export: false
      },
      'full_permission': {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true
      }
    };

    return permissionMap[permission] || permissionMap['view_only'];
  }

  /**
   * 记录权限变更日志
   */
  private static async logPermissionChange(
    action: 'add_module' | 'rename_module' | 'delete_module',
    moduleId: string,
    affectedCount: number,
    extra?: any
  ): Promise<void> {
    try {
      await db.collection('operationLogs').add({
        data: {
          module: 'permission_sync',
          action: action,
          target: moduleId,
          affectedCount: affectedCount,
          extra: extra || {},
          createdAt: new Date(),
          createdBy: 'system'
        }
      });
    } catch (error) {
      console.error(`[PermissionSync] 记录日志失败:`, error);
    }
  }

  /**
   * 批量同步多个模块权限
   */
  static async syncMultipleModules(
    modules: Array<{ id: string; name: string; defaultPermission: string }>
  ): Promise<{ success: boolean; results: any[] }> {
    console.log(`[PermissionSync] 批量同步 ${modules.length} 个模块权限...`);

    const results = [];

    for (const module of modules) {
      const result = await this.syncNewModule(
        module.id,
        module.name,
        module.defaultPermission
      );
      results.push({
        moduleId: module.id,
        moduleName: module.name,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`[PermissionSync] 批量同步完成: ${successCount}/${modules.length} 成功`);

    return {
      success: successCount === modules.length,
      results
    };
  }

  /**
   * 验证所有角色的权限完整性
   */
  static async verifyPermissions(
    requiredModules: string[]
  ): Promise<{ success: boolean; missingPermissions: any[] }> {
    console.log(`[PermissionSync] 验证权限完整性，需要 ${requiredModules.length} 个模块权限`);

    try {
      const { data: roles } = await db.collection('roles').get<Role>();
      const missingPermissions: any[] = [];

      for (const role of roles) {
        const rolePermissions = role.permissions || {};
        const missing = requiredModules.filter(moduleId => !rolePermissions[moduleId]);

        if (missing.length > 0) {
          missingPermissions.push({
            roleId: role._id,
            roleName: role.name,
            missingModules: missing
          });
        }
      }

      if (missingPermissions.length > 0) {
        console.warn(`[PermissionSync] 发现 ${missingPermissions.length} 个角色权限不完整`);
        return { success: false, missingPermissions };
      }

      console.log(`[PermissionSync] 所有角色权限完整`);
      return { success: true, missingPermissions: [] };
    } catch (error: any) {
      console.error(`[PermissionSync] 验证失败:`, error);
      return { success: false, missingPermissions: [] };
    }
  }
}
