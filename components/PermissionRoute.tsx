/**
 * 路由权限守卫组件
 * v2.1.0 - 自动检查路由访问权限
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionRouteProps {
  /** 当前登录用户 */
  currentUser: any;
  
  /** 路由路径 */
  path: string;
  
  /** 无权限时跳转的路径 */
  redirectTo?: string;
  
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode;
  
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 路由权限守卫
 * 
 * 使用示例:
 * ```tsx
 * <Route 
 *   path="/tasks" 
 *   element={
 *     <PermissionRoute currentUser={currentUser} path="/tasks">
 *       <TasksPage />
 *     </PermissionRoute>
 *   } 
 * />
 * ```
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  currentUser,
  path,
  redirectTo = '/403',
  fallback,
  children
}) => {
  const { checkRoutePermission, loading } = usePermissions(currentUser);

  // 加载中显示加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 检查路由权限
  const hasPermission = checkRoutePermission(path);

  if (!hasPermission) {
    // 如果提供了fallback，显示fallback
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // 否则重定向到无权限页面
    return <Navigate to={redirectTo} replace />;
  }

  // 有权限时渲染子组件
  return <>{children}</>;
};

/**
 * 403 无权限页面
 */
export const ForbiddenPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="text-8xl font-bold text-gray-300 mb-4">403</div>
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">
          访问被拒绝
        </h1>
        <p className="text-gray-600 mb-6">
          抱歉，您没有权限访问此页面
        </p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
};
