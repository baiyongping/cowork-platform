import React from 'react';
import { cn } from './utils';
import { 
  FileTextIcon, 
  SearchIcon, 
  AlertCircleIcon,
  PlusIcon
} from './icons';

interface EmptyStateProps {
  icon?: 'empty' | 'search' | 'error' | 'success' | 'custom';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
  customIcon?: React.ReactNode;
}

const iconMap = {
  empty: FileTextIcon,
  search: SearchIcon,
  error: AlertCircleIcon,
  success: FileTextIcon, // 暂时用 FileTextIcon 替代
  custom: () => null
};

export function EmptyState({
  icon = 'empty',
  title,
  description,
  action,
  className,
  customIcon
}: EmptyStateProps) {
  const IconComponent = icon === 'custom' ? () => customIcon : iconMap[icon];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      <div className="w-16 h-16 mb-6 text-gray-300">
        <IconComponent size={64} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-500 text-sm mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 shadow-soft hover:shadow-medium hover:scale-[1.02] active:scale-95",
            action.variant === 'primary' 
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          {action.label}
          {action.variant === 'primary' && <PlusIcon size={16} />}
        </button>
      )}
    </div>
  );
}

// 预设空状态组件
export function EmptyDataState({ action, ...props }: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon="empty"
      title="暂无数据"
      description="请创建第一条记录开始使用"
      action={action}
      {...props}
    />
  );
}

export function EmptySearchState({ ...props }: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon="search"
      title="未找到相关内容"
      description="请尝试其他关键词或调整搜索条件"
      {...props}
    />
  );
}

export function ErrorState({ action, ...props }: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon="error"
      title="出现错误"
      description="加载数据时出现问题，请稍后重试"
      action={action}
      {...props}
    />
  );
}