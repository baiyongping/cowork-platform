/**
 * 目标分解表相关类型定义
 */

// 表列定义
export interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  options?: string[]; // select类型时的选项
  defaultValue?: any;
}

// 表行数据
export interface TableRow {
  _id?: string;
  [key: string]: any; // 动态列数据
}

// 分解表配置
export interface DecompositionTableConfig {
  _id?: string;
  name: string; // 表名(自由命名)
  goalType?: string; // 关联的目标类型(可选)
  columns: TableColumn[]; // 列定义
  sortOrder: number; // 显示顺序
  isActive: boolean; // 是否启用
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

// 分解表数据
export interface DecompositionTableData {
  _id?: string;
  goalId: string; // 关联的目标ID
  tableConfigId: string; // 关联的表配置ID
  rows: TableRow[]; // 表数据行
  createdAt?: Date;
  updatedAt?: Date;
}
