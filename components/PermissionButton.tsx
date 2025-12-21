/**
 * 权限按钮组件
 * v2.1.0 - 根据权限自动显示/隐藏按钮
 */

import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Button, ButtonProps } from './ui/button';
import type { DataItem } from '../utils/permissionUtils';

interface PermissionButtonProps extends ButtonProps {
  /** 当前登录用户 */
  currentUser: any;
  
  /** 模块key（如: 'tasks', 'opportunities'） */
  module: string;
  
  /** 操作类型 */
  action: 'create' | 'edit' | 'delete' | 'export' | 'import';
  
  /** 数据项（用于编辑/删除按钮） */
  dataItem?: DataItem;
  
  /** 无权限时是否隐藏（默认true） */
  hideWhenNoPermission?: boolean;
  
  /** 无权限时是否禁用（hideWhenNoPermission为false时生效） */
  disableWhenNoPermission?: boolean;
}

/**
 * 权限按钮组件
 * 
 * 使用示例:
 * ```tsx
 * // 创建按钮（只需要功能权限）
 * <PermissionButton
 *   currentUser={currentUser}
 *   module="tasks"
 *   action="create"
 *   onClick={handleCreate}
 * >
 *   新建任务
 * </PermissionButton>
 * 
 * // 编辑按钮（需要功能权限和数据权限）
 * <PermissionButton
 *   currentUser={currentUser}
 *   module="tasks"
 *   action="edit"
 *   dataItem={task}
 *   onClick={handleEdit}
 * >
 *   编辑
 * </PermissionButton>
 * ```
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  currentUser,
  module,
  action,
  dataItem,
  hideWhenNoPermission = true,
  disableWhenNoPermission = true,
  disabled,
  children,
  ...buttonProps
}) => {
  const { checkButtonPermission, loading } = usePermissions(currentUser);

  // 加载中时显示禁用状态
  if (loading) {
    return (
      <Button {...buttonProps} disabled={true}>
        {children}
      </Button>
    );
  }

  // 检查权限
  const hasPermission = checkButtonPermission(module, action, dataItem);

  // 无权限时的处理
  if (!hasPermission) {
    if (hideWhenNoPermission) {
      return null; // 隐藏按钮
    }
    
    if (disableWhenNoPermission) {
      return (
        <Button {...buttonProps} disabled={true}>
          {children}
        </Button>
      );
    }
  }

  // 有权限时正常显示
  return (
    <Button {...buttonProps} disabled={disabled}>
      {children}
    </Button>
  );
};

/**
 * 权限容器组件（用于包裹任意元素）
 */
interface PermissionWrapperProps {
  /** 当前登录用户 */
  currentUser: any;
  
  /** 模块key */
  module: string;
  
  /** 操作类型 */
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import';
  
  /** 无权限时是否隐藏 */
  hideWhenNoPermission?: boolean;
  
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode;
  
  /** 子元素 */
  children: React.ReactNode;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  currentUser,
  module,
  action,
  hideWhenNoPermission = true,
  fallback = null,
  children
}) => {
  const { checkPermission, loading } = usePermissions(currentUser);

  if (loading) {
    return <>{fallback}</>;
  }

  const hasPermission = checkPermission(module, action);

  if (!hasPermission) {
    if (hideWhenNoPermission) {
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
