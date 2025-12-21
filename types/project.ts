/**
 * 项目管理 - 类型定义
 */

// 项目状态
export type ProjectStatus = '未开始' | '进行中' | '已完成' | '已取消' | '暂停';

// 项目阶段
export type ProjectPhase = 
  | '需求分析'
  | '方案设计'
  | '样衣生产'
  | '批量生产'
  | '质量检验'
  | '物流配送'
  | '交付验收'
  | '售后服务';

// 项目优先级
export type ProjectPriority = '高' | '中' | '低';

// 项目类型
export type ProjectType = '定制项目' | '标准项目' | '维护项目';

// 项目接口
export interface Project {
  _id: string;
  name: string; // 项目名称
  code: string; // 项目编号
  type: ProjectType; // 项目类型
  status: ProjectStatus; // 状态
  phase?: ProjectPhase; // 当前阶段
  priority: ProjectPriority; // 优先级
  progress: number; // 完成进度（0-100）
  owner: string; // 负责人ID
  members: string[]; // 项目成员ID数组
  startDate: Date | string; // 开始日期
  endDate: Date | string; // 截止日期
  budget: number; // 预算金额（元）
  actualCost?: number; // 实际成本（元）
  customer: string; // 客户名称
  contactPerson: string; // 联系人
  contactPhone: string; // 联系电话
  opportunityId?: string; // 关联商机ID
  description?: string; // 项目描述
  requirements?: string; // 需求说明
  deliverables?: string; // 交付物清单
  notes?: string; // 备注信息
  isPublic: boolean; // 是否公开
  createdBy: string; // 创建人ID
  createdAt: Date | string; // 创建时间
  updatedAt: Date | string; // 更新时间
  revenueRecorded?: boolean; // 是否已计入销售业绩
  revenueRecordedAt?: Date | string; // 销售业绩计入时间
  
  // 关联查询字段
  ownerName?: string;
  memberNames?: string[];
  opportunityName?: string;
}

// 创建项目DTO
export interface CreateProjectDto {
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  phase?: ProjectPhase;
  priority: ProjectPriority;
  progress?: number;
  owner: string;
  members: string[];
  startDate: string;
  endDate: string;
  budget: number;
  actualCost?: number;
  customer: string;
  contactPerson: string;
  contactPhone: string;
  opportunityId?: string;
  description?: string;
  requirements?: string;
  deliverables?: string;
  notes?: string;
  isPublic?: boolean;
}

// 更新项目DTO
export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  _id: string;
}

// 项目里程碑
export interface ProjectMilestone {
  _id: string;
  projectId: string;
  name: string; // 里程碑名称
  phase: ProjectPhase; // 所属阶段
  dueDate: Date | string; // 截止日期
  status: 'pending' | 'completed' | 'overdue'; // 状态
  description?: string; // 描述
  createdAt: Date | string;
  completedAt?: Date | string;
}

// 项目任务
export interface ProjectTask {
  _id: string;
  projectId: string;
  name: string; // 任务名称
  phase: ProjectPhase; // 所属阶段
  assignee: string; // 负责人ID
  status: '未开始' | '进行中' | '已完成'; // 状态
  startDate: Date | string;
  endDate: Date | string;
  description?: string;
  createdAt: Date | string;
}

// 项目筛选条件
export interface ProjectFilterOptions {
  status?: ProjectStatus | 'all';
  type?: ProjectType | 'all';
  priority?: ProjectPriority | 'all';
  timeRange?: 'all' | 'week' | 'month' | 'quarter' | 'year';
  keyword?: string;
}

// 项目统计数据
export interface ProjectStatistics {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  paused: number;
  overdue: number;
  totalBudget: number;
  totalActualCost: number;
}

// 辅助函数：获取状态颜色
export function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case '未开始':
      return 'bg-gray-100 text-gray-800';
    case '进行中':
      return 'bg-blue-100 text-blue-800';
    case '已完成':
      return 'bg-green-100 text-green-800';
    case '已取消':
      return 'bg-red-100 text-red-800';
    case '暂停':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 辅助函数：获取优先级颜色
export function getProjectPriorityColor(priority: ProjectPriority): string {
  switch (priority) {
    case '高':
      return 'bg-red-100 text-red-800';
    case '中':
      return 'bg-yellow-100 text-yellow-800';
    case '低':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 辅助函数：获取阶段颜色
export function getProjectPhaseColor(phase: ProjectPhase): string {
  const phaseColors: Record<ProjectPhase, string> = {
    '需求分析': 'bg-purple-100 text-purple-800',
    '方案设计': 'bg-indigo-100 text-indigo-800',
    '样衣生产': 'bg-blue-100 text-blue-800',
    '批量生产': 'bg-cyan-100 text-cyan-800',
    '质量检验': 'bg-teal-100 text-teal-800',
    '物流配送': 'bg-green-100 text-green-800',
    '交付验收': 'bg-lime-100 text-lime-800',
    '售后服务': 'bg-amber-100 text-amber-800',
  };
  return phaseColors[phase] || 'bg-gray-100 text-gray-800';
}

// 辅助函数：判断项目是否延期
export function isProjectOverdue(project: Project): boolean {
  if (project.status === '已完成' || project.status === '已取消') {
    return false;
  }
  const endDate = new Date(project.endDate);
  const now = new Date();
  return endDate < now;
}

// 辅助函数：格式化金额
export function formatProjectAmount(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`;
  }
  return `${amount.toFixed(2)}元`;
}
