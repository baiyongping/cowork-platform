const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 从会议生成团队任务云函数
 * 支持的操作:
 * - generateFromMeeting: 从会议生成团队任务
 * - generateFromAgenda: 从议题生成团队任务
 * - linkTask: 关联任务到会议
 * - unlinkTask: 取消关联任务
 * - queryRelatedTasks: 查询会议相关任务
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  console.log('[task-from-meeting]', {
    action,
    openid,
    timestamp: new Date().toISOString()
  });

  try {
    switch (action) {
      case 'generateFromMeeting':
        return await handleGenerateFromMeeting(data, openid);
      case 'generateFromAgenda':
        return await handleGenerateFromAgenda(data, openid);
      case 'linkTask':
        return await handleLinkTask(data, openid);
      case 'unlinkTask':
        return await handleUnlinkTask(data, openid);
      case 'queryRelatedTasks':
        return await handleQueryRelatedTasks(data, openid);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[${action}] Error:`, error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};

/**
 * 从整个会议生成团队任务
 */
async function handleGenerateFromMeeting(data, openid) {
  const { meetingId, taskData } = data;

  if (!meetingId || !taskData) {
    throw new Error('会议ID和任务数据不能为空');
  }

  // 获取会议信息
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 准备任务数据
  const task = {
    name: taskData.name || `【${meeting.data.title}】会议落实任务`,
    level: taskData.level || '团队级',
    type: taskData.type || '日常工作',
    status: '未开始',
    progress: 0,
    owner: taskData.owner || meeting.data.organizer || openid,
    collaborators: taskData.collaborators || meeting.data.attendees || [],
    team: taskData.team || '',
    startDate: taskData.startDate || new Date(),
    endDate: taskData.endDate || getDefaultEndDate(meeting.data.scheduledTime),
    description: taskData.description || generateTaskDescription(meeting.data),
    isPublic: true,
    relatedTo: meetingId,
    relatedType: 'meeting',
    source: '例会生成',
    sourceInfo: {
      meetingId: meetingId,
      meetingTitle: meeting.data.title,
      meetingType: meeting.data.type,
      meetingDate: meeting.data.scheduledTime
    },
    createdAt: new Date(),
    createdBy: openid,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 插入任务
  const taskResult = await db.collection('tasks').add({
    data: task
  });

  console.log('[generateFromMeeting] Task created from meeting:', taskResult._id);

  return {
    success: true,
    data: {
      taskId: taskResult._id,
      ...task
    }
  };
}

/**
 * 从议题生成团队任务
 */
async function handleGenerateFromAgenda(data, openid) {
  const { meetingId, agendaId, taskData } = data;

  if (!meetingId || !agendaId) {
    throw new Error('会议ID和议题ID不能为空');
  }

  // 获取会议信息
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 查找议题
  const agenda = (meeting.data.agendas || []).find(a => a.id === agendaId);
  if (!agenda) {
    throw new Error('议题不存在');
  }

  // 准备任务数据
  const task = {
    name: taskData.name || `【${meeting.data.title}】${agenda.title}`,
    level: taskData.level || '团队级',
    type: taskData.type || '日常工作',
    status: '未开始',
    progress: 0,
    owner: taskData.owner || agenda.presenter || meeting.data.organizer || openid,
    collaborators: taskData.collaborators || meeting.data.attendees || [],
    team: taskData.team || '',
    startDate: taskData.startDate || new Date(),
    endDate: taskData.endDate || getDefaultEndDate(meeting.data.scheduledTime),
    description: taskData.description || agenda.description || `议题：${agenda.title}`,
    isPublic: true,
    relatedTo: meetingId,
    relatedType: 'meeting',
    source: '例会议题',
    sourceInfo: {
      meetingId: meetingId,
      meetingTitle: meeting.data.title,
      agendaId: agendaId,
      agendaTitle: agenda.title,
      presenter: agenda.presenter
    },
    createdAt: new Date(),
    createdBy: openid,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 插入任务
  const taskResult = await db.collection('tasks').add({
    data: task
  });

  console.log('[generateFromAgenda] Task created from agenda:', taskResult._id);

  return {
    success: true,
    data: {
      taskId: taskResult._id,
      ...task
    }
  };
}

/**
 * 关联现有任务到会议
 */
async function handleLinkTask(data, openid) {
  const { meetingId, taskId } = data;

  if (!meetingId || !taskId) {
    throw new Error('会议ID和任务ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 检查任务是否存在
  const task = await db.collection('tasks').doc(taskId).get();
  if (!task.data) {
    throw new Error('任务不存在');
  }

  // 更新任务关联信息
  await db.collection('tasks').doc(taskId).update({
    data: {
      relatedTo: meetingId,
      relatedType: 'meeting',
      source: '例会关联',
      sourceInfo: {
        meetingId: meetingId,
        meetingTitle: meeting.data.title,
        linkedAt: new Date()
      },
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[linkTask] Task linked:', taskId, 'to meeting:', meetingId);

  return {
    success: true,
    message: '任务关联成功'
  };
}

/**
 * 取消关联任务
 */
async function handleUnlinkTask(data, openid) {
  const { meetingId, taskId } = data;

  if (!meetingId || !taskId) {
    throw new Error('会议ID和任务ID不能为空');
  }

  // 检查任务是否存在
  const task = await db.collection('tasks').doc(taskId).get();
  if (!task.data) {
    throw new Error('任务不存在');
  }

  // 清除任务关联信息
  await db.collection('tasks').doc(taskId).update({
    data: {
      relatedTo: null,
      relatedType: null,
      source: null,
      sourceInfo: null,
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[unlinkTask] Task unlinked:', taskId, 'from meeting:', meetingId);

  return {
    success: true,
    message: '取消关联成功'
  };
}

/**
 * 查询会议相关任务
 */
async function handleQueryRelatedTasks(data, openid) {
  const { meetingId } = data;

  if (!meetingId) {
    throw new Error('会议ID不能为空');
  }

  // 查询关联的任务
  const tasksResult = await db.collection('tasks')
    .where({
      relatedTo: meetingId,
      relatedType: 'meeting'
    })
    .orderBy('createdAt', 'desc')
    .get();

  console.log('[queryRelatedTasks] Found tasks:', tasksResult.data.length);

  return {
    success: true,
    data: tasksResult.data
  };
}

/**
 * 辅助函数：生成默认截止日期（会议后7天）
 */
function getDefaultEndDate(scheduledTime) {
  const endDate = new Date(scheduledTime);
  endDate.setDate(endDate.getDate() + 7);
  return endDate;
}

/**
 * 辅助函数：从会议生成任务描述
 */
function generateTaskDescription(meeting) {
  let description = `根据【${meeting.title}】会议内容生成的落实任务。\n\n`;
  
  if (meeting.description) {
    description += `会议概述：${meeting.description}\n\n`;
  }

  if (meeting.agendas && meeting.agendas.length > 0) {
    description += `会议议题：\n`;
    meeting.agendas.forEach((agenda, index) => {
      description += `${index + 1}. ${agenda.title}`;
      if (agenda.description) {
        description += ` - ${agenda.description}`;
      }
      description += `\n`;
    });
  }

  return description;
}
