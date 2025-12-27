import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/cloudbase';
import { 
  getUserPermissions, 
  hasPermission,
  canView,
  canEdit,
  canDelete,
  filterAccessibleData,
  attachEditPermissions,
  canAccessRoute,
  getAccessibleMenus,
  hasButtonPermission,
  type User,
  type DataItem,
  type MenuItem
} from '../utils/permissionUtils';

/**
 * 权限Hook - 用于在组件中检查用户权限
 * v2.1.0 - 增强版，支持完整的功能权限和数据权限
 */
export function usePermissions(currentUser: User | null) {
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载角色权限配置
  useEffect(() => {
    const loadRolePermissions = async () => {
      try {
        console.log('🔐 [usePermissions] 开始加载角色权限配置...');
        const result = await db.collection('role_permissions').get();
        console.log('✅ [usePermissions] 角色权限查询完成:', result);
        
        if (result.data && result.data.length > 0) {
          setRolePermissions(result.data);
          console.log(`✅ [usePermissions] 加载了 ${result.data.length} 条角色权限配置`);
        } else {
          console.warn('⚠️ [usePermissions] 未找到角色权限配置，使用默认权限');
          setRolePermissions([]); // 明确设置为空数组
        }
      } catch (error) {
        console.error('❌ [usePermissions] 加载角色权限配置失败:', error);
        // 即使失败也要设置为空数组,避免一直loading
        setRolePermissions([]);
      } finally {
        console.log('✅ [usePermissions] 权限加载完成，设置 loading = false');
        setLoading(false);
      }
    };

    loadRolePermissions();
  }, []);

  // 计算用户权限（使用 useMemo 缓存）
  const userPermissions = useMemo(() => {
    if (!currentUser || rolePermissions.length === 0) {
      return {};
    }
    return getUserPermissions(currentUser, rolePermissions);
  }, [currentUser, rolePermissions]);

  /**
   * 检查功能权限
   */
  const checkPermission = (
    module: string, 
    action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import'
  ): boolean => {
    // 超级管理员拥有所有权限
    if (currentUser?.role === 'admin') {
      return true;
    }
    
    if (!currentUser || !rolePermissions.length) {
      return false;
    }
    return hasPermission(currentUser, rolePermissions, module, action);
  };

  /**
   * 检查数据查看权限
   */
  const checkViewPermission = (dataItem: DataItem): boolean => {
    if (!currentUser) {
      return false;
    }
    return canView(currentUser, dataItem);
  };

  /**
   * 检查数据编辑权限
   */
  const checkEditPermission = (dataItem: DataItem): boolean => {
    if (!currentUser) {
      return false;
    }
    return canEdit(currentUser, dataItem);
  };

  /**
   * 检查数据删除权限
   */
  const checkDeletePermission = (dataItem: DataItem): boolean => {
    if (!currentUser) {
      return false;
    }
    return canDelete(currentUser, dataItem);
  };

  /**
   * 过滤可访问的数据列表
   */
  const filterData = <T extends DataItem>(dataList: T[]): T[] => {
    if (!currentUser) {
      return [];
    }
    return filterAccessibleData(currentUser, dataList);
  };

  /**
   * 为数据列表附加权限标识
   */
  const attachPermissions = <T extends DataItem>(
    dataList: T[]
  ): Array<T & { canEdit: boolean; canDelete: boolean }> => {
    if (!currentUser) {
      return dataList.map(item => ({ ...item, canEdit: false, canDelete: false }));
    }
    return attachEditPermissions(currentUser, dataList);
  };

  /**
   * 检查路由访问权限
   */
  const checkRoutePermission = (routePath: string): boolean => {
    if (!currentUser) {
      return false;
    }
    return canAccessRoute(currentUser, routePath, rolePermissions);
  };

  /**
   * 获取可访问的菜单列表
   */
  const filterMenus = (allMenus: MenuItem[]): MenuItem[] => {
    if (!currentUser) {
      return [];
    }
    return getAccessibleMenus(currentUser, allMenus, rolePermissions);
  };

  /**
   * 检查按钮权限
   */
  const checkButtonPermission = (
    module: string,
    action: 'create' | 'edit' | 'delete' | 'export' | 'import',
    dataItem?: DataItem
  ): boolean => {
    if (!currentUser) {
      return false;
    }
    return hasButtonPermission(currentUser, rolePermissions, module, action, dataItem);
  };

  return {
    // 基础数据
    userPermissions,
    rolePermissions,
    loading,
    
    // 功能权限检查
    checkPermission,
    
    // 数据权限检查
    checkViewPermission,
    checkEditPermission,
    checkDeletePermission,
    
    // 数据过滤
    filterData,
    attachPermissions,
    
    // 路由和菜单权限
    checkRoutePermission,
    filterMenus,
    
    // 按钮权限
    checkButtonPermission
  };
}
