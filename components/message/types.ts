import { 
  CheckSquare, 
  TrendingUp, 
  Folder, 
  Target, 
  Lightbulb, 
  Bell, 
  AtSign, 
  AlertTriangle 
} from 'lucide-react';

// 消息类型定义
export const MESSAGE_TYPE_CONFIG = {
  task: { label: '任务', color: 'text-blue-600', icon: CheckSquare },
  opportunity: { label: '商机', color: 'text-green-600', icon: TrendingUp },
  project: { label: '项目', color: 'text-purple-600', icon: Folder },
  goal: { label: '目标', color: 'text-orange-600', icon: Target },
  strategy: { label: '策略', color: 'text-yellow-600', icon: Lightbulb },
  system: { label: '系统', color: 'text-red-600', icon: Bell },
  mention: { label: '@提醒', color: 'text-pink-600', icon: AtSign },
  alert: { label: '重要提醒', color: 'text-red-700', icon: AlertTriangle }
};

export interface Message {
  _id: string;
  type: keyof typeof MESSAGE_TYPE_CONFIG;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}
