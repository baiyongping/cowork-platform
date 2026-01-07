// 保障措施类型定义

export interface SafeguardMeasure {
  _id?: string;
  strategyId: string;      // 关联的年度策略ID
  year: number;            // 年度
  content: string;         // 措施内容
  owner: string;           // 负责人姓名
  ownerId: string;         // 负责人ID
  deadline: Date | string; // 截止日期
  completionRate: number;  // 完成度 (0-100，自动计算)
  status: '未开始' | '进行中' | '已完成' | '暂停';
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  isDeleted?: boolean;
}

// 前端展示用的扩展接口
export interface SafeguardMeasureWithQuarterly extends SafeguardMeasure {
  quarterlyMeasures?: QuarterlyMeasureEnriched[];  // 关联的季度措施
}

// 季度措施扩展接口（包含保障措施信息）
export interface QuarterlyMeasureEnriched {
  _id?: string;
  safeguardMeasureId: string;  // 关联保障措施ID
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  content: string;
  owner: string;
  ownerId: string;
  deadline: Date | string;
  completionRate: number;
  status: '未开始' | '进行中' | '已完成' | '暂停';
  taskCount?: number;         // 关联的团队月计划数量
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  isDeleted?: boolean;
}

// 年度策略扩展接口（包含保障措施）
export interface AnnualStrategyWithSafeguards {
  _id?: string;
  year: number;
  content: string;
  owner: string;
  ownerId: string;
  status: '未开始' | '进行中' | '已完成' | '暂停';
  weight: number;
  completionRate?: number;    // 完成度（基于保障措施）
  safeguardMeasures?: SafeguardMeasureWithQuarterly[];  // 保障措施列表
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  isDeleted?: boolean;
}
