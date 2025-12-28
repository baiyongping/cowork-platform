/**
 * 权限上下文
 * v2.1.0 - 全局权限管理
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import type { User, DataItem, MenuItem } from '../utils/permissionUtils';

interface PermissionContextValue {
  // 基础数据
  currentUser: User | null;
  isAdmin: boolean;
  userPermissions: any;
  rolePermissions: any[];
  loading: boolean;
  
  // 功能权限检查
  checkPermission: (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import'
  ) => boolean;
  
  // 数据权限检查
  checkViewPermission: (dataItem: DataItem) => boolean;
  checkEditPermission: (dataItem: DataItem) => boolean;
  checkDeletePermission: (dataItem: DataItem) => boolean;
  
  // 数据过滤
  filterData: <T extends DataItem>(dataList: T[]) => T[];
  attachPermissions: <T extends DataItem>(
    dataList: T[]
  ) => Array<T & { canEdit: boolean; canDelete: boolean }>;
  
  // 路由和菜单权限
  checkRoutePermission: (routePath: string) => boolean;
  filterMenus: (allMenus: MenuItem[]) => MenuItem[];
  
  // 按钮权限
  checkButtonPermission: (
    module: string,
    action: 'create' | 'edit' | 'delete' | 'export' | 'import',
    dataItem?: DataItem
  ) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

interface PermissionProviderProps {
  currentUser: User | null;
  children: ReactNode;
}

/**
 * 权限提供者
 * 
 * 使用示例:
 * ```tsx
 * // 在App根组件中包裹
 * <PermissionProvider currentUser={currentUser}>
 *   <App />
 * </PermissionProvider>
 * 
 * // 在子组件中使用
 * const { checkPermission } = usePermissionContext();
 * const canCreate = checkPermission('tasks', 'create');
 * ```
 */
export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  currentUser,
  children
}) => {
  const permissions = usePermissions(currentUser);
  
  const isAdmin = currentUser?.role === 'admin';

  return (
    <PermissionContext.Provider value={{ ...permissions, currentUser, isAdmin }}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * 使用权限上下文的Hook
 */
export const usePermissionContext = (): PermissionContextValue => {
  const context = useContext(PermissionContext);
  
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }
  
  return context;
};

/**
 * 权限检查HOC（高阶组件）
 */
export interface WithPermissionOptions {
  /** 模块key */
  module: string;
  
  /** 操作类型 */
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import';
  
  /** 无权限时的回退组件 */
  fallback?: React.ComponentType;
}

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  options: WithPermissionOptions
): React.FC<P> {
  return (props: P) => {
    const { checkPermission, loading } = usePermissionContext();

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    const hasPermission = checkPermission(options.module, options.action);

    if (!hasPermission) {
      if (options.fallback) {
        const FallbackComponent = options.fallback;
        return <FallbackComponent />;
      }
      
      return (
        <div className="text-center p-8 text-gray-500">
          您没有权限访问此内容
        </div>
      );
    }

    return <Component {...props} />;
  };
}
