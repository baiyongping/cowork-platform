// 会议类型定义

export type MeetingType = '周工作例会' | '月度工作例会';

export type AgendaType = 
  | '目标复盘'  // 🎯 关联目标管理
  | '任务汇报'  // ✅ 关联任务管理
  | '商机分析'  // 💼 关联商机管理
  | '项目进展'  // 📁 关联项目管理
  | '问题解决'  // ⚠️ 关联问题管理
  | '预算决策'  // 💰 关联预算管理
  | '其他议题'; // 📝 无关联

export type AgendaStatus = '待讨论' | '讨论中' | '已完成';

export type MeetingStatus = '未开始' | '进行中' | '已结束' | '已取消';

// 议题接口
export interface Agenda {
  id: string;
  type: AgendaType;
  title: string;
  description?: string;
  
  // 通用关联数据字段（新格式，优先使用）
  relatedIds?: string[];
  
  // 根据议题类型，关联不同模块的数据（旧格式，兼容性保留）
  relatedGoals?: string[];         // 🎯 目标复盘 -> 目标管理
  relatedTasks?: string[];         // ✅ 任务汇报 -> 任务管理
  relatedOpportunities?: string[]; // 💼 商机分析 -> 商机管理
  relatedProjects?: string[];      // 📁 项目进展 -> 项目管理
  relatedIssues?: string[];        // ⚠️ 问题解决 -> 问题管理
  relatedBudgets?: string[];       // 💰 预算决策 -> 预算管理
  // 📝 其他议题 -> 无关联数据
  
  duration?: number;   // 议题预计时长（分钟）
  presenter?: string;  // 议题汇报人
  status?: AgendaStatus;
  notes?: string;      // 议题讨论结果/决议
  conclusion?: string; // 议题结论（会议进行中由记录人填写）
}

// 会议纪要 - 工作项（上周总结或本周计划）
export interface WorkItem {
  person: string;           // 人员姓名
  items: string[];          // 重点完成事项列表
  completionDate?: string;  // 计划完成时间
  status?: string;          // 完成情况（仅上周总结）
}

// 会议纪要状态
export type MinutesStatus = 'draft' | 'published';

// 会议纪要数据结构
export interface MeetingMinutes {
  summary?: string;                    // 会议概述
  lastWeekWorkSummary?: WorkItem[];    // 上周工作总结
  thisWeekWorkPlan?: WorkItem[];       // 本周工作计划
  conclusion?: string;                 // 会议总结语
  generatedAt?: Date;                  // 生成时间
  generatedBy?: string;                // 生成人
  status?: MinutesStatus;              // 📝 纪要状态：draft-草稿, published-已发布
}

// 会议接口
export interface Meeting {
  _id: string;
  title: string;
  type: MeetingType; // 只有两种：周工作例会、月度工作例会
  
  // 议题列表（一个会议可以包含多个议题）
  agendas: Agenda[];
  
  startTime: Date;
  endTime?: Date;
  location: string;
  participants: string[];   // 参会人员（主要字段）
  attendees?: string[];     // 参会人员（兼容字段）
  organizer: string;        // 组织者
  host?: string;            // 会议主持人
  recorder?: string;        // 会议记录人
  
  status: MeetingStatus;
  minutes?: string;         // 会议纪要（旧格式，兼容性保留）
  minutesData?: MeetingMinutes; // 会议纪要（新格式，结构化数据）
  description?: string;      // 会议描述
  duration?: number;          // 会议时长（分钟）
  
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
}

// 创建会议 DTO
export interface CreateMeetingInput {
  title: string;
  type: MeetingType;
  agendas: Omit<Agenda, 'id' | 'status'>[];
  startTime: Date;
  location: string;
  participants: string[];
  host?: string;       // 会议主持人
  recorder?: string;   // 会议记录人
}

// 更新会议 DTO
export interface UpdateMeetingInput {
  meetingId: string;
  title?: string;
  startTime?: Date;
  location?: string;
  participants?: string[];
  host?: string;
  recorder?: string;
  status?: MeetingStatus;
  minutes?: string;
  minutesData?: MeetingMinutes; // 会议纪要（结构化数据）
  agendaConclusions?: Record<string, string>; // 议题结论 { agendaId: conclusion }
}

// 添加议题 DTO
export interface AddAgendaInput {
  meetingId: string;
  agenda: Omit<Agenda, 'id' | 'status'>;
}

// 更新议题 DTO
export interface UpdateAgendaInput {
  meetingId: string;
  agendaId: string;
  status?: AgendaStatus;
  notes?: string;
  duration?: number;
  presenter?: string;
  conclusion?: string; // 议题结论
}
