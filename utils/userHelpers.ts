/**
 * 用户相关工具函数
 */

/**
 * 格式化用户名显示（离职用户添加标记）
 */
export function formatUserName(user: { name?: string; status?: string }): string {
  if (!user || !user.name) return '-';
  
  if (user.status === '离职') {
    return `${user.name} (已离职)`;
  }
  
  return user.name;
}

/**
 * 检查用户是否可以登录
 */
export function canUserLogin(user: { status?: string }): boolean {
  if (!user) return false;
  
  // 离职用户禁止登录
  if (user.status === '离职') {
    return false;
  }
  
  return true;
}

/**
 * 获取用户状态显示信息
 */
export function getUserStatusInfo(status?: string): {
  text: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case '在职':
      return { text: '在职', color: 'text-green-700', bgColor: 'bg-green-100' };
    case '离职':
      return { text: '已离职', color: 'text-red-700', bgColor: 'bg-red-100' };
    case '休假':
      return { text: '休假', color: 'text-orange-700', bgColor: 'bg-orange-100' };
    default:
      return { text: '未知', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
}
