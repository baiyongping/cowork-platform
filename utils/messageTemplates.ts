/**
 * 消息模板生成工具
 * 用于自动生成各类消息的标题和内容
 */

// 消息类型定义
export type MessageType = 'system' | 'task' | 'opportunity' | 'project' | 'goal' | 'strategy' | 'mention';

// 消息模板返回结果
export interface MessageTemplate {
  title: string;
  content: string;
  link?: string;
}

// 任务相关数据类型
interface TaskMessageData {
  creator?: string;
  level?: string;
  taskName: string;
  taskId: string;
  newStatus?: string;
  days?: number;
  commenter?: string;
}

// 商机相关数据类型
interface OpportunityMessageData {
  creator?: string;
  oppName: string;
  oppId: string;
  oldStatus?: string;
  newStatus?: string;
  commenter?: string;
}

// 项目相关数据类型
interface ProjectMessageData {
  creator?: string;
  projectName: string;
  projectId: string;
  newPhase?: string;
  milestone?: string;
  commenter?: string;
}

// 目标相关数据类型
interface GoalMessageData {
  goalName: string;
  goalId: string;
  changeType: string;  // '数量' | '金额'
  oldValue: number | string;
  newValue: number | string;
}

// 策略相关数据类型
interface StrategyMessageData {
  strategyName?: string;
  measureName?: string;
  strategyId: string;
}

// @提醒数据类型
interface MentionMessageData {
  mentioner: string;
  relatedName: string;
  link: string;
}

// 系统消息数据类型
interface SystemMessageData {
  content?: string;
  link?: string;
  newRole?: string;
  oldDept?: string;
  newDept?: string;
}

/**
 * 消息模板库
 */
export const MessageTemplates = {
  // 1. 任务相关消息
  task: {
    create: (data: TaskMessageData): MessageTemplate => ({
      title: '新任务分配',
      content: `${data.creator}分配了${data.level}任务"${data.taskName}"给你`,
      link: `/tasks/${data.taskId}`
    }),
    
    update: (data: TaskMessageData): MessageTemplate => ({
      title: '任务状态更新',
      content: `任务"${data.taskName}"状态变更为"${data.newStatus}"`,
      link: `/tasks/${data.taskId}`
    }),
    
    deadline: (data: TaskMessageData): MessageTemplate => ({
      title: '任务截止提醒',
      content: `任务"${data.taskName}"将于${data.days}天后截止`,
      link: `/tasks/${data.taskId}`
    }),
    
    comment: (data: TaskMessageData): MessageTemplate => ({
      title: '任务新评论',
      content: `${data.commenter}评论了任务"${data.taskName}"`,
      link: `/tasks/${data.taskId}`
    }),

    collaboratorChange: (data: TaskMessageData): MessageTemplate => ({
      title: '任务协同人变更',
      content: `您被添加为任务"${data.taskName}"的协同人`,
      link: `/tasks/${data.taskId}`
    })
  },
  
  // 2. 商机相关消息
  opportunity: {
    create: (data: OpportunityMessageData): MessageTemplate => ({
      title: '新商机分配',
      content: `${data.creator}分配了商机"${data.oppName}"给你`,
      link: `/opportunities/${data.oppId}`
    }),
    
    statusChange: (data: OpportunityMessageData): MessageTemplate => ({
      title: '商机状态变更',
      content: `商机"${data.oppName}"状态从"${data.oldStatus}"变更为"${data.newStatus}"`,
      link: `/opportunities/${data.oppId}`
    }),
    
    comment: (data: OpportunityMessageData): MessageTemplate => ({
      title: '商机新评论',
      content: `${data.commenter}评论了商机"${data.oppName}"`,
      link: `/opportunities/${data.oppId}`
    })
  },
  
  // 3. 项目相关消息
  project: {
    create: (data: ProjectMessageData): MessageTemplate => ({
      title: '新项目分配',
      content: `${data.creator}分配了项目"${data.projectName}"给你`,
      link: `/projects/${data.projectId}`
    }),
    
    phaseChange: (data: ProjectMessageData): MessageTemplate => ({
      title: '项目阶段变更',
      content: `项目"${data.projectName}"进入"${data.newPhase}"阶段`,
      link: `/projects/${data.projectId}`
    }),
    
    milestone: (data: ProjectMessageData): MessageTemplate => ({
      title: '项目里程碑',
      content: `项目"${data.projectName}"完成里程碑"${data.milestone}"`,
      link: `/projects/${data.projectId}`
    }),

    comment: (data: ProjectMessageData): MessageTemplate => ({
      title: '项目新评论',
      content: `${data.commenter}评论了项目"${data.projectName}"`,
      link: `/projects/${data.projectId}`
    }),

    memberChange: (data: ProjectMessageData): MessageTemplate => ({
      title: '项目成员变更',
      content: `您被添加为项目"${data.projectName}"的成员`,
      link: `/projects/${data.projectId}`
    })
  },
  
  // 4. 目标管理消息
  goal: {
    // 商机数量/金额变化
    opportunityChange: (data: GoalMessageData): MessageTemplate => ({
      title: '目标进度更新',
      content: `目标"${data.goalName}"的商机${data.changeType}变化: ${data.oldValue} → ${data.newValue}`,
      link: `/goals/${data.goalId}`
    }),
    
    // 销售数量/金额变化
    salesChange: (data: GoalMessageData): MessageTemplate => ({
      title: '目标进度更新',
      content: `目标"${data.goalName}"的销售${data.changeType}变化: ${data.oldValue} → ${data.newValue}`,
      link: `/goals/${data.goalId}`
    })
  },
  
  // 5. 策略/措施消息
  strategy: {
    // 年度策略完成
    annualComplete: (data: StrategyMessageData): MessageTemplate => ({
      title: '年度策略完成',
      content: `年度策略"${data.strategyName}"已完成`,
      link: `/strategies/${data.strategyId}`
    }),
    
    // 季度措施完成
    quarterlyComplete: (data: StrategyMessageData): MessageTemplate => ({
      title: '季度措施完成',
      content: `季度措施"${data.measureName}"已完成`,
      link: `/strategies/${data.strategyId}`
    })
  },
  
  // 6. @提醒消息
  mention: {
    comment: (data: MentionMessageData): MessageTemplate => ({
      title: '@提醒',
      content: `${data.mentioner}在"${data.relatedName}"中@了你`,
      link: data.link
    })
  },
  
  // 7. 系统消息
  system: {
    announcement: (data: SystemMessageData): MessageTemplate => ({
      title: '系统公告',
      content: data.content || '',
      link: data.link
    }),
    
    roleChange: (data: SystemMessageData): MessageTemplate => ({
      title: '角色变更通知',
      content: `您的角色已变更为"${data.newRole}"`,
      link: '/account'
    }),

    deptChange: (data: SystemMessageData): MessageTemplate => ({
      title: '部门调整通知',
      content: `您已从"${data.oldDept}"调整至"${data.newDept}"`,
      link: '/account'
    })
  },

  // 8. 重要提醒
  warning: {
    taskDeadline: (data: TaskMessageData): MessageTemplate => ({
      title: '任务延期预警',
      content: `任务"${data.taskName}"进度落后,可能无法按期完成(进度低于50%,距离截止仅剩1天)`,
      link: `/tasks/${data.taskId}`
    }),

    projectDelay: (data: ProjectMessageData): MessageTemplate => ({
      title: '项目延期预警',
      content: `项目"${data.projectName}"进度落后于计划,存在延期风险`,
      link: `/projects/${data.projectId}`
    }),

    opportunityFollow: (data: OpportunityMessageData): MessageTemplate => ({
      title: '商机跟进提醒',
      content: `商机"${data.oppName}"已超过7天未跟进,请及时跟进`,
      link: `/opportunities/${data.oppId}`
    })
  }
};

/**
 * 消息类型图标和颜色配置
 */
export const MessageTypeConfig: Record<MessageType, { icon: string; color: string; label: string }> = {
  system: {
    icon: '🔔',
    color: 'blue',
    label: '系统消息'
  },
  task: {
    icon: '✅',
    color: 'green',
    label: '任务消息'
  },
  opportunity: {
    icon: '💼',
    color: 'orange',
    label: '商机消息'
  },
  project: {
    icon: '📁',
    color: 'purple',
    label: '项目消息'
  },
  goal: {
    icon: '🎯',
    color: 'red',
    label: '目标消息'
  },
  strategy: {
    icon: '📊',
    color: 'indigo',
    label: '策略消息'
  },
  mention: {
    icon: '📢',
    color: 'pink',
    label: '@提醒'
  }
};

/**
 * 创建消息帮助函数
 */
export interface CreateMessageParams {
  type: MessageType;
  template: MessageTemplate;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  receiver: string;
  relatedId?: string;
  relatedType?: string;
  action?: string;
}

export function createMessage(params: CreateMessageParams) {
  const { type, template, sender, receiver, relatedId, relatedType, action } = params;
  
  return {
    type,
    title: template.title,
    content: template.content,
    sender,
    receiver,
    isRead: false,
    relatedId,
    relatedType,
    action,
    link: template.link,
    createdAt: new Date(),
    readAt: null
  };
}

/**
 * 批量创建消息
 */
export function createMessages(receivers: string[], params: Omit<CreateMessageParams, 'receiver'>) {
  return receivers.map(receiver => createMessage({ ...params, receiver }));
}
