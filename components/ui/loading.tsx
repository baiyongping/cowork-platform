import * as React from "react";
import { cn } from "./utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

function LoadingSpinner({ className, size = "md", ...props }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-primary",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

function LoadingDots({ className, text = "加载中", ...props }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1 text-sm text-gray-500", className)} {...props}>
      <span>{text}</span>
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  className?: string;
}

function LoadingSkeleton({ lines = 3, className, ...props }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-4 bg-gray-200 rounded animate-pulse",
            index === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

interface LoadingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showAvatar?: boolean;
  showTitle?: boolean;
  showContent?: boolean;
}

function LoadingCard({ showAvatar = true, showTitle = true, showContent = true, className, ...props }: LoadingCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-6 shadow-card", className)} {...props}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      )}
      {showTitle && (
        <div className="h-6 bg-gray-200 rounded animate-pulse w-2/3 mb-4"></div>
      )}
      {showContent && (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5"></div>
        </div>
      )}
    </div>
  );
}

export { 
  LoadingSpinner, 
  LoadingDots, 
  LoadingSkeleton, 
  LoadingCard 
};