import React from 'react';
import { cn } from './utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  animation = 'pulse', 
  className,
  ...props 
}: SkeletonProps) {
  const variantClass = {
    text: 'rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  }[variant];

  const animationClass = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }[animation];

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '40px'),
    ...props.style
  };

  return (
    <div
      className={cn(
        'bg-gray-200',
        variantClass,
        animationClass,
        className
      )}
      style={style}
      {...props}
    />
  );
}

// 预设骨架屏组件
interface CardSkeletonProps {
  showAvatar?: boolean;
  showTitle?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({ 
  showAvatar = true, 
  showTitle = true, 
  lines = 3,
  className 
}: CardSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6 shadow-card', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={16} />
            <Skeleton width="60%" height={12} />
          </div>
        </div>
      )}
      
      {showTitle && (
        <div className="mb-4">
          <Skeleton width="70%" height={20} />
        </div>
      )}
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton 
            key={index}
            width={index === lines - 1 ? '80%' : '100%'} 
            height={16} 
          />
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {/* 表头 */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} height={16} />
          ))}
        </div>
      </div>
      
      {/* 表格行 */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} height={16} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ 
  items = 5, 
  showAvatar = true,
  className 
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
          {showAvatar && (
            <Skeleton variant="circular" width={40} height={40} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
          <div className="flex space-x-2">
            <Skeleton width={60} height={32} />
            <Skeleton width={60} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DashboardSkeletonProps {
  showStats?: boolean;
  showCards?: boolean;
  className?: string;
}

export function DashboardSkeleton({ 
  showStats = true, 
  showCards = true,
  className 
}: DashboardSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* 统计卡片 */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <Skeleton variant="circular" width={48} height={48} />
                <Skeleton width={60} height={24} />
              </div>
              <Skeleton width="80%" height={28} className="mb-2" />
              <Skeleton width="60%" height={16} />
            </div>
          ))}
        </div>
      )}
      
      {/* 内容卡片 */}
      {showCards && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <CardSkeleton 
              key={index}
              showAvatar={false}
              showTitle={true}
              lines={5}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 波纹动画效果
export const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  .animate-shimmer {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e0e0e0 50%,
      #f0f0f0 75%
    );
    background-size: 1000px 100%;
    animation: shimmer 2s infinite linear;
  }
`;

// 全局样式注入
export function injectSkeletonStyles() {
  if (typeof document !== 'undefined') {
    const styleId = 'skeleton-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = shimmerStyles;
      document.head.appendChild(style);
    }
  }
}