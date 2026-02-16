/**
 * 客户情报管理 - 类型定义
 * 用于从互联网采集客户相关信息并生成情报报告
 */

// 情报来源类型
export type IntelligenceSource = 
  | 'web_search'       // 网络搜索
  | 'news'            // 新闻资讯
  | 'company_info'    // 企业信息
  | 'industry_report' // 行业报告
  | 'social_media'    // 社交媒体
  | 'manual';         // 人工录入

// 情报类型
export type IntelligenceType = 
  | 'company_background'  // 公司背景
  | 'business_status'     // 经营状况
  | 'industry_trends'     // 行业动态
  | 'competitor_info'     // 竞争对手信息
  | 'key_persons'         // 关键人物
  | 'risk_warning'        // 风险预警
  | 'other';              // 其他

// 情报状态
export type IntelligenceStatus = 
  | 'collecting'  // 采集中
  | 'collected'   // 已采集
  | 'reviewed'    // 已审核
  | 'expired';    // 已过期

// 客户情报接口
export interface CustomerIntelligence {
  _id: string;
  customerId?: string;          // 关联客户ID（可选）
  opportunityId?: string;       // 关联商机ID（可选）
  customerName: string;         // 客户名称
  type: IntelligenceType;       // 情报类型
  source: IntelligenceSource;   // 情报来源
  title: string;                // 情报标题
  content: string;              // 情报内容
  summary?: string;             // 摘要
  keywords?: string[];          // 关键词
  sourceUrl?: string;           // 来源链接
  reliability?: number;         // 可靠度评分 (0-100)
  status: IntelligenceStatus;   // 状态
  collectedBy: string;          // 采集人ID
  collectedByName?: string;     // 采集人姓名
  reviewedBy?: string;          // 审核人ID
  reviewedByName?: string;      // 审核人姓名
  reviewedAt?: Date | string;   // 审核时间
  expiresAt?: Date | string;    // 过期时间
  attachments?: string[];       // 附件URL数组
  tags?: string[];              // 标签
  relatedIntelligence?: string[]; // 关联情报ID数组
  createdAt: Date | string;     // 创建时间
  updatedAt: Date | string;     // 更新时间
}

// 创建情报DTO
export interface CreateIntelligenceDto {
  customerId?: string;
  opportunityId?: string;
  customerName: string;
  type: IntelligenceType;
  source: IntelligenceSource;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  sourceUrl?: string;
  reliability?: number;
  tags?: string[];
}

// 更新情报DTO
export interface UpdateIntelligenceDto extends Partial<CreateIntelligenceDto> {
  _id: string;
  status?: IntelligenceStatus;
}

// 情报搜索请求
export interface IntelligenceSearchRequest {
  customerName: string;         // 客户名称（必填）
  searchQuery?: string;         // 自定义搜索查询
  types?: IntelligenceType[];   // 需要的情报类型
  maxResults?: number;          // 最大结果数
}

// 情报搜索结果项
export interface IntelligenceSearchResult {
  type: IntelligenceType;
  title: string;
  content: string;
  summary: string;
  sourceUrl?: string;
  keywords: string[];
  reliability: number;
}

// 情报报告
export interface IntelligenceReport {
  _id: string;
  customerId?: string;
  opportunityId?: string;
  customerName: string;
  title: string;                // 报告标题
  summary: string;              // 总体摘要
  intelligenceIds: string[];    // 包含的情报ID列表
  sections: ReportSection[];    // 报告章节
  generatedBy: string;          // 生成人ID
  generatedByName?: string;     // 生成人姓名
  format?: 'markdown' | 'html' | 'pdf'; // 报告格式
  pdfUrl?: string;              // PDF文件URL
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 报告章节
export interface ReportSection {
  title: string;                // 章节标题
  type: IntelligenceType;       // 对应的情报类型
  content: string;              // 章节内容
  intelligenceIds: string[];    // 本章节引用的情报ID
  charts?: ChartData[];         // 图表数据（可选）
}

// 图表数据
export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: any;
}

// 情报筛选条件
export interface IntelligenceFilterOptions {
  customerId?: string;
  opportunityId?: string;
  type?: IntelligenceType | 'all';
  source?: IntelligenceSource | 'all';
  status?: IntelligenceStatus | 'all';
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

// 情报统计数据
export interface IntelligenceStatistics {
  total: number;
  byType: Record<IntelligenceType, number>;
  bySource: Record<IntelligenceSource, number>;
  byStatus: Record<IntelligenceStatus, number>;
  avgReliability: number;
}

// 辅助函数：获取情报类型显示名称
export function getIntelligenceTypeName(type: IntelligenceType): string {
  const typeNames: Record<IntelligenceType, string> = {
    'company_background': '公司背景',
    'business_status': '经营状况',
    'industry_trends': '行业动态',
    'competitor_info': '竞争对手信息',
    'key_persons': '关键人物',
    'risk_warning': '风险预警',
    'other': '其他'
  };
  return typeNames[type] || type;
}

// 辅助函数：获取情报来源显示名称
export function getIntelligenceSourceName(source: IntelligenceSource): string {
  const sourceNames: Record<IntelligenceSource, string> = {
    'web_search': '网络搜索',
    'news': '新闻资讯',
    'company_info': '企业信息',
    'industry_report': '行业报告',
    'social_media': '社交媒体',
    'manual': '人工录入'
  };
  return sourceNames[source] || source;
}

// 辅助函数：获取情报类型颜色
export function getIntelligenceTypeColor(type: IntelligenceType): string {
  const typeColors: Record<IntelligenceType, string> = {
    'company_background': 'bg-blue-100 text-blue-800',
    'business_status': 'bg-green-100 text-green-800',
    'industry_trends': 'bg-purple-100 text-purple-800',
    'competitor_info': 'bg-orange-100 text-orange-800',
    'key_persons': 'bg-yellow-100 text-yellow-800',
    'risk_warning': 'bg-red-100 text-red-800',
    'other': 'bg-gray-100 text-gray-800'
  };
  return typeColors[type] || 'bg-gray-100 text-gray-800';
}

// 辅助函数：获取可靠度等级
export function getReliabilityLevel(score: number): {
  level: string;
  color: string;
} {
  if (score >= 80) {
    return { level: '高', color: 'text-green-600' };
  } else if (score >= 60) {
    return { level: '中', color: 'text-yellow-600' };
  } else {
    return { level: '低', color: 'text-red-600' };
  }
}
