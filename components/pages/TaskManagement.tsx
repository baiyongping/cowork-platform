import React from 'react';
import TaskManagementPage from '../TaskManagementPage';

interface TaskManagementProps {
  userRole: string;
  currentUser: any;
}

export function TaskManagement({ userRole, currentUser }: TaskManagementProps) {
  return <TaskManagementPage />;
}
