import React from 'react';

interface UserAvatarProps {
  user: {
    avatar?: string;
    name?: string;
    username?: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-20 h-20 text-2xl'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md',
  className = '' 
}) => {
  const displayName = user.name || user.username || 'U';
  const initial = displayName.charAt(0).toUpperCase();
  const sizeClass = sizeClasses[size];

  if (user.avatar) {
    return (
      <img 
        src={user.avatar} 
        alt={displayName}
        className={`${sizeClass} rounded-full object-cover border-2 border-gray-200 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium ${className}`}>
      {initial}
    </div>
  );
};
