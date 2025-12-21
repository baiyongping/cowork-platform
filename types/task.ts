/**
 * 任务管理 - 类型定义
 * 根据 PRD 文档定义
 */

// 任务级别
export type TaskLevel = '团队级' | '个人级';

// 任务类型
export type TaskType = '日常工作' | '商机跟进' | '项目任务';

// 任务状态（日常工作和商机跟进）
export type TaskStatus = '未开始' | '进行中' | '已完成' | '延期' | '取消' | '暂停';

// 项目任务状态
export type ProjectTaskStatus = '未开始' | '准备期' | '制造期' | '交付期' | '已完成' | '暂停';

// 商机跟进动作类型
export type OpportunityActionType = 
  | '拜访客户'
  | '联络客户感情'
  | '了解年度采购计划'
  | '提交公司资质和案例'
  | '样衣展示和试穿'
  | '提交定制方案和报价'
  | '提交投标文件'
  | '价格谈判'
  | '合同条款确认'
  | '其它';

// 项目任务环节
export type ProjectPhase = 
  | '物料采购'
  | '样衣生产'
  | '量体数据采集'
  | '缝制生产'
  | '质量检验'
  | '产品入库'
  | '物流配送'
  | '产品交付'
  | '售后服务';

// 计划类型
export type PlanType = 
  | '本周计划'
  | '下周计划'
  | '本月计划'
  | '下月计划'
  | '季度计划'
  | '年度计划'
  | '临时任务';

// 任务接口
export interface Task {
  _id: string;
  name: string;
  level: TaskLevel;
  type: TaskType;
  status: TaskStatus | ProjectTaskStatus;
  progress: number; // 0-100
  owner: string; // 用户ID
  ownerName?: string; // 用户名称(关联查询)
  collaborators?: string[]; // 协同人ID数组
  collaboratorNames?: string[]; // 协同人名称数组(关联查询)
  team?: string;
  startDate: Date | string;
  endDate: Date | string;
  description?: string;
  isPublic: boolean;
  planType?: PlanType; // 计划类型
  opportunityActionType?: OpportunityActionType;
  projectPhase?: ProjectPhase;
  relatedTo?: string; // 关联的商机ID或项目ID
  relatedMeasure?: string; // 关联的季度举措ID(团队级月度计划)
  relatedTeamTask?: string; // 关联的团队月度工作任务ID(个人级周计划)
  isDeleted?: boolean; // 是否已删除(软删除标记)
  deletedAt?: Date | string; // 删除时间
  overdueCount?: number; // 延期次数
  lastOverdueDate?: Date | string; // 最后一次延期的日期
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 创建任务DTO
export interface CreateTaskDto {
  name: string;
  level: TaskLevel;
  type: TaskType;
  status: TaskStatus | ProjectTaskStatus;
  progress?: number;
  owner: string;
  collaborators?: string[];
  team?: string;
  startDate: string;
  endDate: string;
  description?: string;
  isPublic?: boolean;
  planType?: PlanType; // 计划类型
  opportunityActionType?: OpportunityActionType;
  projectPhase?: ProjectPhase;
  relatedTo?: string;
  relatedMeasure?: string; // 关联的季度举措ID(团队级月度计划)
  relatedTeamTask?: string; // 关联的团队月度工作任务ID(个人级周计划)
}

// 更新任务DTO
export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  _id: string;
}

// 任务评论接口
export interface TaskComment {
  _id: string;
  taskId: string;
  userId: string;
  userName?: string; // 用户名称（关联查询）
  userAvatar?: string; // 用户头像
  content: string;
  createdAt: Date | string;
}

// 创建任务评论DTO
export interface CreateTaskCommentDto {
  taskId: string;
  content: string;
}

// 任务筛选条件
export interface TaskFilterOptions {
  level?: TaskLevel | 'all';
  timeRange?: 'all' | 'week' | 'month';
  keyword?: string;
  status?: string;
  type?: TaskType;
}

// 任务统计数据
export interface TaskStatistics {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// 辅助函数：获取状态颜色
export function getStatusColor(status: TaskStatus | ProjectTaskStatus): string {
  switch (status) {
    case '未开始':
      return 'bg-gray-100 text-gray-800';
    case '进行中':
    case '准备期':
    case '制造期':
    case '交付期':
      return 'bg-blue-100 text-blue-800';
    case '已完成':
      return 'bg-green-100 text-green-800';
    case '延期':
      return 'bg-red-100 text-red-800';
    case '取消':
      return 'bg-gray-100 text-gray-600';
    case '暂停':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 辅助函数：获取状态文本
export function getStatusText(status: TaskStatus | ProjectTaskStatus): string {
  return status;
}

// 辅助函数：判断任务是否延期
export function isTaskOverdue(task: Task): boolean {
  if (task.status === '已完成' || task.status === '取消') {
    return false;
  }
  const endDate = new Date(task.endDate);
  const now = new Date();
  return endDate < now;
}
