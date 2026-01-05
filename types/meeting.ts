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
  
  // 根据议题类型，关联不同模块的数据
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
  participants: string[];   // 参会人员
  organizer: string;        // 组织者
  
  status: MeetingStatus;
  minutes?: string;         // 会议纪要（会议结束后填写）
  
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
}

// 更新会议 DTO
export interface UpdateMeetingInput {
  meetingId: string;
  title?: string;
  startTime?: Date;
  location?: string;
  participants?: string[];
  status?: MeetingStatus;
  minutes?: string;
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
}
