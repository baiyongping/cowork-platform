const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 会议议程AI智能生成云函数
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  
  try {
    switch (action) {
      case 'generateAgenda':
        return await handleGenerateAgenda(data, wxContext.OPENID);
      default:
        throw new Error(`未知的操作类型: ${action}`);
    }
  } catch (error) {
    console.error(`[${action}] Error:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成会议议程
 */
async function handleGenerateAgenda(data, openid) {
  const { 
    meetingType,
    relatedGoals,
    relatedTasks,
    relatedOpportunities,
    relatedProjects,
    relatedIssues,
    relatedBudgets
  } = data;

  if (!meetingType) {
    throw new Error('会议类型不能为空');
  }

  // 根据会议类型和关联数据生成议程
  const agendaItems = [];

  switch (meetingType) {
    case '目标复盘':
      agendaItems.push(...await generateGoalReviewAgenda(relatedGoals));
      break;
    case '任务汇报':
      agendaItems.push(...await generateTaskReportAgenda(relatedTasks));
      break;
    case '商机分析':
      agendaItems.push(...await generateOpportunityAnalysisAgenda(relatedOpportunities));
      break;
    case '项目分析':
      agendaItems.push(...await generateProjectAnalysisAgenda(relatedProjects));
      break;
    case '问题解决':
      agendaItems.push(...await generateIssueSolutionAgenda(relatedIssues));
      break;
    case '预算决策':
      agendaItems.push(...await generateBudgetDecisionAgenda(relatedBudgets));
      break;
    default:
      throw new Error('不支持的会议类型');
  }

  console.log('[generateAgenda] Generated agenda items:', agendaItems.length);

  return {
    success: true,
    data: agendaItems
  };
}

/**
 * 生成目标复盘议程
 */
async function generateGoalReviewAgenda(goalIds) {
  if (!goalIds || goalIds.length === 0) {
    return [{
      title: '目标完成情况汇报',
      content: '各团队汇报目标完成进度及面临的挑战',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取目标详情
  const goals = await db.collection('goals')
    .where({
      _id: db.command.in(goalIds)
    })
    .get();

  goals.data.forEach((goal, index) => {
    agendaItems.push({
      title: `${goal.name} - 复盘分析`,
      content: `目标完成情况：${goal.progress}%\n分析原因、总结经验、制定改进措施`,
      duration: 20,
      order: index + 1,
      relatedGoal: goal._id
    });
  });

  // 添加总结环节
  agendaItems.push({
    title: '总结与下一步行动',
    content: '确定下一步行动计划和责任人',
    duration: 15,
    order: agendaItems.length + 1
  });

  return agendaItems;
}

/**
 * 生成任务汇报议程
 */
async function generateTaskReportAgenda(taskIds) {
  if (!taskIds || taskIds.length === 0) {
    return [{
      title: '任务进展汇报',
      content: '各团队汇报当前任务进展情况',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取任务详情
  const tasks = await db.collection('tasks')
    .where({
      _id: db.command.in(taskIds)
    })
    .get();

  // 按团队分组
  const tasksByTeam = {};
  tasks.data.forEach(task => {
    const team = task.team || '其他';
    if (!tasksByTeam[team]) {
      tasksByTeam[team] = [];
    }
    tasksByTeam[team].push(task);
  });

  let order = 1;
  Object.keys(tasksByTeam).forEach(team => {
    const teamTasks = tasksByTeam[team];
    agendaItems.push({
      title: `${team} - 任务汇报`,
      content: `汇报 ${teamTasks.length} 项任务的完成情况、遇到的问题及需要的支持`,
      duration: 15,
      order: order++,
      relatedTasks: teamTasks.map(t => t._id)
    });
  });

  // 添加讨论环节
  agendaItems.push({
    title: '问题讨论与资源协调',
    content: '讨论各团队遇到的共性问题，协调资源支持',
    duration: 20,
    order: order++
  });

  return agendaItems;
}

/**
 * 生成商机分析议程
 */
async function generateOpportunityAnalysisAgenda(opportunityIds) {
  if (!opportunityIds || opportunityIds.length === 0) {
    return [{
      title: '商机情况分析',
      content: '分析当前商机状态、竞争态势和推进策略',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取商机详情
  const opportunities = await db.collection('opportunities')
    .where({
      _id: db.command.in(opportunityIds)
    })
    .get();

  // 按状态分组
  const oppsByStatus = {};
  opportunities.data.forEach(opp => {
    if (!oppsByStatus[opp.status]) {
      oppsByStatus[opp.status] = [];
    }
    oppsByStatus[opp.status].push(opp);
  });

  let order = 1;
  Object.keys(oppsByStatus).forEach(status => {
    const statusOpps = oppsByStatus[status];
    agendaItems.push({
      title: `${status}商机分析`,
      content: `分析 ${statusOpps.length} 个商机的进展情况、存在的风险和下一步行动`,
      duration: 20,
      order: order++,
      relatedOpportunities: statusOpps.map(o => o._id)
    });
  });

  // 添加策略讨论环节
  agendaItems.push({
    title: '商机推进策略讨论',
    content: '讨论重点商机的推进策略和资源配置',
    duration: 25,
    order: order++
  });

  return agendaItems;
}

/**
 * 生成项目分析议程
 */
async function generateProjectAnalysisAgenda(projectIds) {
  if (!projectIds || projectIds.length === 0) {
    return [{
      title: '项目进展分析',
      content: '分析项目整体进展、风险和资源需求',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取项目详情
  const projects = await db.collection('projects')
    .where({
      _id: db.command.in(projectIds)
    })
    .get();

  projects.data.forEach((project, index) => {
    agendaItems.push({
      title: `${project.name} - 项目分析`,
      content: `项目进度：${project.progress}%\n分析项目健康度、风险清单和应对措施`,
      duration: 25,
      order: index + 1,
      relatedProject: project._id
    });
  });

  // 添加资源协调环节
  agendaItems.push({
    title: '项目资源协调',
    content: '协调各项目间的资源冲突，确定优先级',
    duration: 20,
    order: agendaItems.length + 1
  });

  return agendaItems;
}

/**
 * 生成问题解决议程
 */
async function generateIssueSolutionAgenda(issueIds) {
  if (!issueIds || issueIds.length === 0) {
    return [{
      title: '问题讨论与解决',
      content: '讨论当前面临的关键问题及解决方案',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取问题详情
  const issues = await db.collection('issueRecords')
    .where({
      _id: db.command.in(issueIds)
    })
    .get();

  // 按严重程度排序
  const sortedIssues = issues.data.sort((a, b) => {
    const severityOrder = { '严重': 1, '一般': 2, '轻微': 3 };
    return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
  });

  sortedIssues.forEach((issue, index) => {
    agendaItems.push({
      title: `${issue.severity} - ${issue.title}`,
      content: `问题描述、影响分析、解决方案讨论`,
      duration: 15,
      order: index + 1,
      relatedIssue: issue._id
    });
  });

  // 添加行动计划环节
  agendaItems.push({
    title: '行动计划制定',
    content: '确定解决方案、责任人和完成时间',
    duration: 15,
    order: agendaItems.length + 1
  });

  return agendaItems;
}

/**
 * 生成预算决策议程
 */
async function generateBudgetDecisionAgenda(budgetIds) {
  if (!budgetIds || budgetIds.length === 0) {
    return [{
      title: '预算申请审批',
      content: '审议预算申请，讨论资金分配方案',
      duration: 30,
      order: 1
    }];
  }

  const agendaItems = [];
  
  // 获取预算详情
  const budgets = await db.collection('budgetSubjects')
    .where({
      _id: db.command.in(budgetIds)
    })
    .get();

  // 按金额降序排序
  const sortedBudgets = budgets.data.sort((a, b) => b.amount - a.amount);

  sortedBudgets.forEach((budget, index) => {
    agendaItems.push({
      title: `${budget.subject} - 预算审批`,
      content: `预算金额：${budget.amount}元\n审议预算合理性、必要性和优先级`,
      duration: 15,
      order: index + 1,
      relatedBudget: budget._id
    });
  });

  // 添加决策环节
  agendaItems.push({
    title: '预算决策与资金分配',
    content: '做出预算审批决策，确定资金分配方案',
    duration: 20,
    order: agendaItems.length + 1
  });

  return agendaItems;
}
