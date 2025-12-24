/**
 * 商机管理 - 类型定义
 */

// 商机阶段（与系统设置中的商机阶段设置关联）
export type OpportunityStage = string; // 动态从系统设置获取，默认值：'跟进线索' | '方案咨询' | '商务谈判'

// 商机级别
export type OpportunityLevel = '重要' | '一般' | '潜在';

// 产品类型
export type ProductType = 
  | '职业装'
  | '工作服'
  | '制服'
  | '防护服'
  | '其他';

// 商机接口
export interface Opportunity {
  _id: string;
  name: string; // 商机名称
  customer: string; // 客户名称
  productType: ProductType; // 产品类型
  estimatedAmount: number; // 预计金额(元) - 自动计算为需求列表总价合计
  requirements?: OpportunityRequirement[]; // 商机产品需求列表
  stage: OpportunityStage; // 商机阶段(关联系统设置)
  probability: number; // 成交概率(0-100)
  level: OpportunityLevel; // 商机级别
  owner: string; // 负责人ID
  collaborators?: string[]; // 协同人ID数组
  expectedCloseDate: Date | string; // 预计成交日期
  contactPerson: string; // 联系人
  contactPhone: string; // 联系电话
  contactEmail?: string; // 联系邮箱
  address?: string; // 客户地址
  description?: string; // 商机描述
  notes?: string; // 备注信息
  isPublic?: boolean; // 是否公开(可选)
  projectId?: string; // 关联项目ID（形成项目后填充）
  isDeleted?: boolean; // 是否已删除(软删除标记)
  deletedAt?: Date | string; // 删除时间
  createdBy: string; // 创建人ID
  createdAt: Date | string; // 创建时间
  updatedAt: Date | string; // 更新时间
  
  // 关联查询字段
  ownerName?: string;
  collaboratorNames?: string[];
  relatedTasksCount?: number; // 关联任务总数
}

// 创建商机DTO
export interface CreateOpportunityDto {
  name: string;
  customer: string;
  productType: ProductType;
  estimatedAmount: number;
  stage: OpportunityStage; // 商机阶段
  probability?: number;
  level: OpportunityLevel;
  owner: string;
  collaborators?: string[];
  expectedCloseDate: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  description?: string;
  notes?: string;
  isPublic?: boolean;
}

// 更新商机DTO
export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {
  _id: string;
}

// 商机产品需求项
export interface OpportunityRequirement {
  id: string; // 唯一标识
  productType: string; // 产品类别
  quantity: number; // 需求数量
  unitPrice: number; // 预算单价(元)
  estimatedCost: number; // 预估成本(元)
  totalPrice: number; // 总价(元) = quantity * unitPrice
  grossProfit: number; // 预估毛利润(元) = totalPrice - (quantity * estimatedCost)
}

// 商机跟进记录
export interface OpportunityFollowUp {
  _id: string;
  opportunityId: string;
  userId: string;
  userName?: string;
  actionType: string; // 跟进动作类型
  content: string; // 跟进内容
  nextPlan?: string; // 下次跟进计划
  nextDate?: Date | string; // 下次跟进日期
  attachments?: string[]; // 附件URL数组
  createdAt: Date | string;
}

// 商机筛选条件
export interface OpportunityFilterOptions {
  stage?: OpportunityStage | 'all'; // 改为 stage
  level?: OpportunityLevel | 'all';
  timeRange?: 'all' | 'week' | 'month' | 'quarter' | 'year';
  keyword?: string;
}

// 商机统计数据（按阶段动态统计）
export interface OpportunityStatistics {
  total: number;
  byStage: Record<string, { count: number; amount: number }>; // 按阶段统计数量和金额
  totalAmount: number; // 总预计金额
  closedAmount: number; // 已成交金额
}

// 辅助函数：获取阶段颜色（通过索引动态分配颜色）
export function getOpportunityStageColor(stage: string, allStages: string[]): string {
  const colorSchemes = [
    'bg-gray-100 text-gray-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-green-100 text-green-800',
    'bg-red-100 text-red-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
  ];
  
  const index = allStages.indexOf(stage);
  if (index === -1) return 'bg-gray-100 text-gray-800';
  return colorSchemes[index % colorSchemes.length];
}

// 辅助函数：获取级别颜色
export function getOpportunityLevelColor(level: OpportunityLevel): string {
  switch (level) {
    case 'A级':
      return 'bg-red-100 text-red-800';
    case 'B级':
      return 'bg-blue-100 text-blue-800';
    case 'C级':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 辅助函数：格式化金额
export function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`;
  }
  return `${amount.toFixed(2)}元`;
}
