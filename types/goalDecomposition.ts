/**
 * 目标分解相关类型定义
 */

// 维度项
export interface DimensionItem {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

// 分解维度
export interface DecompositionDimension {
  _id: string;
  name: string;
  description?: string;
  items: DimensionItem[];
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 分解单元格
export interface DecompositionCell {
  cellId: string;
  dimensionPath: Array<{
    dimensionId: string;
    itemId: string;
    itemName: string;
  }>;
  value: number;
}

// 维度定义（兼容旧版本）
export interface GoalDecompositionDimension {
  _id: string;
  dimensionName: string;
  level1Items: string[];
  level1Order: number[];
  hasLevel2: boolean;
  level2Items: string[];
  level2Order: number[];
  status: 'active' | 'inactive';
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 分解数据项
export interface DecompositionDataItem {
  dimension1Value: string;
  dimension1Level2Value?: string;
  dimension2Value?: string;
  dimension2Level2Value?: string;
  dimension3Value?: string;
  dimension3Level2Value?: string;
  targetValue: number;
  actualValue?: number;
  completionRate?: number;
}

// 目标分解
export interface GoalDecomposition {
  _id: string;
  goalId: string;
  goalName: string;
  targetValue: number;
  dimensionIds: string[];
  cells: DecompositionCell[];
  totalTarget?: number;
  totalActual?: number;
  overallCompletionRate?: number;
  version?: number;
  status?: 'draft' | 'active' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // 兼容旧版本
  decompositionData?: DecompositionDataItem[];
}

// 历史版本
export interface GoalDecompositionHistory {
  _id: string;
  goalId: string;
  decompositionId: string;
  version: number;
  snapshot: GoalDecomposition; // 🔄 与组件使用保持一致
  snapshotData: Record<string, unknown>; // 🆕 新增：完整的快照数据
  changeType: 'created' | 'updated' | 'deleted';
  changeDescription: string;
  changedFields: string[];
  createdBy: string; // 🆕 新增：创建者
  createdAt: Date; // 🆕 新增：创建时间
  changedBy: string;
  changedAt: Date;
  comment?: string; // 🆕 新增：备注信息
}

// 创建维度输入
export interface CreateDimensionInput {
  dimensionName: string;
  level1Items: string[];
  hasLevel2?: boolean;
  level2Items?: string[];
}

// 更新维度输入
export interface UpdateDimensionInput {
  dimensionId: string;
  dimensionName?: string;
  level1Items?: string[];
  hasLevel2?: boolean;
  level2Items?: string[];
}

// 创建分解输入
export interface CreateDecompositionInput {
  goalId: string;
  dimensionIds: string[];
  decompositionData: DecompositionDataItem[];
  totalTarget: number;
}

// 更新分解输入
export interface UpdateDecompositionInput {
  decompositionId: string;
  decompositionData?: DecompositionDataItem[];
  totalTarget?: number;
}

// 版本对比结果
export interface VersionComparisonResult {
  version1: GoalDecompositionHistory;
  version2: GoalDecompositionHistory;
  differences: {
    totalTarget: boolean;
    totalActual: boolean;
    overallCompletionRate: boolean;
    decompositionDataChanges: Array<{
      index: number;
      before: DecompositionDataItem;
      after: DecompositionDataItem;
    }>;
  };
}

