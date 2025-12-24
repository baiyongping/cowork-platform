import React from 'react';
import TaskManagementPage from '../TaskManagementPage';

interface TaskManagementProps {
  userRole: string;
  currentUser: any;
  openTaskId?: string;  // 🔧 要打开的任务ID
  onTaskOpened?: () => void;  // 🔧 打开后的回调
}

export function TaskManagement({ userRole, currentUser, openTaskId, onTaskOpened }: TaskManagementProps) {
  return <TaskManagementPage openTaskId={openTaskId} onTaskOpened={onTaskOpened} />;
}
