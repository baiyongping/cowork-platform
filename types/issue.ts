// 问题管理类型定义
export type IssueType = '销售问题' | '产品问题' | '财务问题' | '管理问题' | '系统BUG与建议';
export type IssueStatus = '待接收' | '处理中' | '已处理' | '待确认' | '已确认';
export type IssueResult = '未确定' | '已解决' | '无法解决' | '暂缓解决' | '取消';
export type IssuePriority = '非常重要' | '一般重要';
export type IssueUrgency = '及时解决' | '近期解决';
export type IssueSolution = '现在解决' | '会议研讨解决' | '转交他人解决';

// 附件信息
export interface IssueAttachment {
  fileID: string; // 云存储文件ID
  fileName: string; // 文件名
  fileSize: number; // 文件大小(字节)
  fileType: string; // 文件类型(MIME)
  uploadedAt: Date | string; // 上传时间
  tempUrl?: string; // 临时访问链接
}

export interface Issue {
  _id: string;
  name: string;
  type: IssueType;
  status: IssueStatus;
  result?: IssueResult;
  solution?: IssueSolution; // 🆕 解决方式
  priority?: IssuePriority;
  urgency?: IssueUrgency;
  owner: {
    _id: string;
    name: string;
    username?: string;
  };
  solvers?: Array<{
    _id: string;
    name: string;
    username?: string;
  }>;
  startDate: Date | string;
  endDate: Date | string;
  suggestions?: string; // 问题描述及建议(多行文本)
  attachments?: IssueAttachment[]; // 🆕 附件列表
  isPublic: boolean;
  relatedTo?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  isDeleted?: boolean;
  deletedAt?: Date | string;
  overdueCount?: number;
  lastOverdueDate?: Date | string;
  completedAt?: Date | string;
}

export const getStatusColor = (status: IssueStatus): string => {
  switch (status) {
    case '待接收':
      return 'bg-gray-100 text-gray-800';
    case '处理中':
      return 'bg-blue-100 text-blue-800';
    case '已处理':
      return 'bg-green-100 text-green-800';
    case '待确认':
      return 'bg-yellow-100 text-yellow-800';
    case '已确认':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusText = (status: IssueStatus): string => {
  const statusMap: Record<IssueStatus, string> = {
    '待接收': '待接收',
    '处理中': '处理中',
    '已处理': '已处理',
    '待确认': '待确认',
    '已确认': '已确认'
  };
  return statusMap[status] || status;
};

export const getResultColor = (result?: IssueResult): string => {
  if (!result) return 'bg-gray-100 text-gray-800';
  switch (result) {
    case '未确定':
      return 'bg-gray-100 text-gray-800';
    case '已解决':
      return 'bg-green-100 text-green-800';
    case '无法解决':
      return 'bg-red-100 text-red-800';
    case '暂缓解决':
      return 'bg-yellow-100 text-yellow-800';
    case '取消':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityColor = (priority?: IssuePriority): string => {
  if (!priority) return 'bg-gray-100 text-gray-800';
  switch (priority) {
    case '非常重要':
      return 'bg-red-100 text-red-800';
    case '一般重要':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getUrgencyColor = (urgency?: IssueUrgency): string => {
  if (!urgency) return 'bg-gray-100 text-gray-800';
  switch (urgency) {
    case '及时解决':
      return 'bg-orange-100 text-orange-800';
    case '近期解决':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getSolutionColor = (solution?: IssueSolution): string => {
  if (!solution) return 'bg-gray-100 text-gray-800';
  switch (solution) {
    case '现在解决':
      return 'bg-green-100 text-green-800';
    case '会议研讨解决':
      return 'bg-blue-100 text-blue-800';
    case '转交他人解决':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// 问题回复类型定义
export interface IssueReply {
  _id: string;
  issueId: string;
  content: string;
  createdBy: string;
  createdByName: string;
  replyTo?: string; // 回复的目标回复ID
  createdAt: Date | string;
  updatedAt?: Date | string;
  isDeleted?: boolean;
}



