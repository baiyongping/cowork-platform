const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 例会管理云函数
 * 支持的操作:
 * - create: 创建会议
 * - update: 更新会议
 * - delete: 删除会议
 * - query: 查询会议列表
 * - detail: 获取会议详情
 * - addAgenda: 添加议题
 * - updateAgenda: 更新议题
 * - deleteAgenda: 删除议题
 * - updateMinutes: 更新会议纪要
 * - updateStatus: 更新会议状态
 * - moveToRecycleBin: 放入回收站
 * - restore: 从回收站恢复
 * - permanentDelete: 彻底删除
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  console.log('[meeting-management]', {
    action,
    openid,
    timestamp: new Date().toISOString()
  });

  try {
    switch (action) {
      case 'create':
        return await handleCreate(data, openid);
      case 'update':
        return await handleUpdate(data, openid);
      case 'delete':
        return await handleDelete(data, openid);
      case 'query':
        return await handleQuery(data, openid);
      case 'detail':
        return await handleDetail(data, openid);
      case 'addAgenda':
        return await handleAddAgenda(data, openid);
      case 'updateAgenda':
        return await handleUpdateAgenda(data, openid);
      case 'deleteAgenda':
        return await handleDeleteAgenda(data, openid);
      case 'updateMinutes':
        return await handleUpdateMinutes(data, openid);
      case 'updateStatus':
        return await handleUpdateStatus(data, openid);
      case 'moveToRecycleBin':
        return await handleMoveToRecycleBin(data, openid);
      case 'restore':
        return await handleRestore(data, openid);
      case 'permanentDelete':
        return await handlePermanentDelete(data, openid);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[${action}] Error:`, error);
    console.error(`[${action}] Error Stack:`, error.stack);
    console.error(`[${action}] Error Details:`, {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return {
      success: false,
      error: error.message,
      message: error.message, // 🔧 添加 message 字段保持兼容性
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};

/**
 * 创建会议
 */
async function handleCreate(data, openid) {
  const {
    title,
    type,
    scheduledTime,
    duration,
    location,
    attendees,
    organizer,
    host,        // 🔧 新增：会议主持人
    recorder,    // 🔧 新增：会议记录人
    description,
    timeDimension, // 🔧 新增：时间维度字段
    agendas, // 🔧 新增：议题数组
    // 关联业务数据
    relatedGoals,
    relatedTasks,
    relatedOpportunities,
    relatedProjects,
    relatedIssues,
    relatedBudgets,
    // 其它议题特殊字段
    agendaTopic,
    agendaContent
  } = data;

  // 调试日志
  console.log('[create] 接收到的数据:', {
    title,
    type,
    scheduledTime,
    timeDimension,
    typeOf: typeof type,
    typeValue: type,
    typeLength: type?.length
  });

  // 验证必填字段
  if (!title || !type || !scheduledTime) {
    throw new Error('会议标题、类型和计划时间不能为空');
  }

  // 验证会议类型（支持新的会议类型和旧的议题类型）
  const validMeetingTypes = ['周工作例会', '月度工作例会'];
  const validAgendaTypes = ['目标复盘', '任务汇报', '商机分析', '项目分析', '问题解决', '预算决策', '其它议题'];
  
  console.log('[create] 验证会议类型:', {
    type,
    isInMeetingTypes: validMeetingTypes.includes(type),
    isInAgendaTypes: validAgendaTypes.includes(type),
    validMeetingTypes,
    validAgendaTypes
  });
  
  if (!validMeetingTypes.includes(type) && !validAgendaTypes.includes(type)) {
    throw new Error('无效的会议类型');
  }

  // 验证其它议题的必填字段（仅对旧的议题类型）
  if (type === '其它议题') {
    if (!agendaTopic || !agendaContent) {
      throw new Error('其它议题类型需要填写会议议题和会议内容');
    }
  } else if (validAgendaTypes.includes(type)) {
    // 旧的议题类型需要至少有一项关联数据
    const hasRelatedData = 
      (relatedGoals && relatedGoals.length > 0) ||
      (relatedTasks && relatedTasks.length > 0) ||
      (relatedOpportunities && relatedOpportunities.length > 0) ||
      (relatedProjects && relatedProjects.length > 0) ||
      (relatedIssues && relatedIssues.length > 0) ||
      (relatedBudgets && relatedBudgets.length > 0);
    
    if (!hasRelatedData) {
      throw new Error('请至少选择一项关联内容');
    }
  }
  // 新的会议类型（周工作例会、月度工作例会）不需要额外的验证

  // 准备会议数据
  const meeting = {
    title,
    type,
    timeDimension: timeDimension || 'current', // 🔧 新增：时间维度字段
    status: '未开始',
    scheduledTime: new Date(scheduledTime),
    duration: duration || 60,
    location: location || '',
    attendees: attendees || [],
    organizer: organizer || openid,
    host: host || '',          // 🔧 新增：会议主持人
    recorder: recorder || '',  // 🔧 新增：会议记录人
    description: description || '',
    // 🔧 新增：议题数组（用于新的会议类型）
    agendas: agendas || [],
    // 关联业务数据
    relatedGoals: relatedGoals || [],
    relatedTasks: relatedTasks || [],
    relatedOpportunities: relatedOpportunities || [],
    relatedProjects: relatedProjects || [],
    relatedIssues: relatedIssues || [],
    relatedBudgets: relatedBudgets || [],
    // 其它议题特殊字段
    agendaTopic: type === '其它议题' ? (agendaTopic || '') : '',
    agendaContent: type === '其它议题' ? (agendaContent || '') : '',
    // 会议纪要
    minutes: '',
    // 创建信息
    createdAt: new Date(),
    createdBy: openid,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 插入数据库
  const result = await db.collection('meetings').add({
    data: meeting
  });

  console.log('[create] Meeting created:', result._id);

  return {
    success: true,
    data: {
      _id: result._id,
      ...meeting
    }
  };
}

/**
 * 更新会议
 */
async function handleUpdate(data, openid) {
  console.log('[update] 🔵 收到更新请求，原始数据:', JSON.stringify(data, null, 2));
  console.log('[update] 🔵 用户openid:', openid);
  
  // 🔧 修复：兼容多种参数格式
  const id = data._id || data.meetingId || data.data?._id || data.data?.meetingId;
  // 🔧 排除 _id、meetingId 和其他不应更新的字段
  const { _id, meetingId, minutesData, agendas, ...updates } = data;
  
  console.log('[update] 📋 解析后的数据:', {
    id,
    hasMinutesData: !!minutesData,
    hasAgendas: !!agendas,
    updatesKeys: Object.keys(updates),
    minutesDataKeys: minutesData ? Object.keys(minutesData) : [],
    agendasCount: agendas ? agendas.length : 0
  });

  console.log('[update] 📋 解析后的数据:', {
    id,
    hasMinutesData: !!minutesData,
    hasAgendas: !!agendas,
    updatesKeys: Object.keys(updates)
  });

  if (!id) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  console.log('[update] 🔍 检查会议是否存在，ID:', id);
  const meeting = await db.collection('meetings').doc(id).get();
  console.log('[update] 📄 会议查询结果:', {
    found: !!meeting.data,
    dataKeys: meeting.data ? Object.keys(meeting.data) : []
  });
  
  if (!meeting.data) {
    throw new Error(`会议不存在，ID: ${id}`);
  }

  // 验证权限（只有创建者、组织者和记录人可以修改）
  const isCreator = meeting.data.createdBy === openid;
  const isOrganizer = meeting.data.organizer === openid;
  const isRecorder = meeting.data.recorder === openid;
  
  console.log('[update] 🔐 权限验证:', {
    openid,
    createdBy: meeting.data.createdBy,
    organizer: meeting.data.organizer,
    recorder: meeting.data.recorder,
    isCreator,
    isOrganizer,
    isRecorder
  });
  
  if (!isCreator && !isOrganizer && !isRecorder) {
    throw new Error(`无权限修改此会议。当前用户: ${openid}, 创建者: ${meeting.data.createdBy}, 组织者: ${meeting.data.organizer}, 记录人: ${meeting.data.recorder}`);
  }

  // 如果更新会议类型，验证类型有效性
  if (updates && updates.type) {
    const validMeetingTypes = ['周工作例会', '月度工作例会'];
    const validAgendaTypes = ['目标复盘', '任务汇报', '商机分析', '项目分析', '问题解决', '预算决策', '其它议题'];
    
    if (!validMeetingTypes.includes(updates.type) && !validAgendaTypes.includes(updates.type)) {
      throw new Error('无效的会议类型');
    }
    
    // 如果改为其它议题，验证必填字段
    if (updates.type === '其它议题') {
      if (!updates.agendaTopic || !updates.agendaContent) {
        throw new Error('其它议题类型需要填写会议议题和会议内容');
      }
    } else if (validAgendaTypes.includes(updates.type)) {
      // 旧的议题类型需要至少有一项关联数据
      const hasRelatedData = 
        (updates.relatedGoals && updates.relatedGoals.length > 0) ||
        (updates.relatedTasks && updates.relatedTasks.length > 0) ||
        (updates.relatedOpportunities && updates.relatedOpportunities.length > 0) ||
        (updates.relatedProjects && updates.relatedProjects.length > 0) ||
        (updates.relatedIssues && updates.relatedIssues.length > 0) ||
        (updates.relatedBudgets && updates.relatedBudgets.length > 0);
      
      if (!hasRelatedData) {
        throw new Error('请至少选择一项关联内容');
      }
    }
    // 新的会议类型不需要额外的验证
  }

  // 准备更新数据
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 🔧 新增：如果提供了会议纪要数据，更新会议纪要
  if (minutesData) {
    console.log('[update] 📝 更新会议纪要数据:', minutesData);
    updateData.minutesData = minutesData;
    // 🔧 兼容旧数据：同时更新 minutes 字段
    updateData.minutes = minutesData.summary || '';
  }

  // 🔧 新增：如果提供了议题数据（包含议题结论），更新议题
  if (agendas) {
    console.log('[update] 📋 更新议题数据:', agendas);
    updateData.agendas = agendas;
  }

  // 特殊处理日期字段
  if (updates.scheduledTime) {
    updateData.scheduledTime = new Date(updates.scheduledTime);
  }

  // 执行更新
  console.log('[update] 🔄 准备更新会议数据:', {
    meetingId: id,
    hasMinutesData: !!minutesData,
    hasAgendas: !!agendas,
    updateDataKeys: Object.keys(updateData),
    updateDataSize: JSON.stringify(updateData).length
  });

  try {
    const updateResult = await db.collection('meetings').doc(id).update({
      data: updateData
    });
    console.log('[update] ✅ Meeting updated successfully:', {
      id,
      updateResult,
      updatedFields: Object.keys(updateData)
    });
  } catch (dbError) {
    console.error('[update] ❌ 数据库更新失败:', dbError);
    throw new Error(`数据库更新失败: ${dbError.message}`);
  }

  // 🔧 修复：返回更新后的会议数据（包括 _id）
  const updatedMeeting = await db.collection('meetings').doc(id).get();

  return {
    success: true,
    message: '会议更新成功',
    data: {
      _id: id,
      ...updatedMeeting.data
    }
  };
}

/**
 * 删除会议
 */
async function handleDelete(data, openid) {
  const { _id } = data;

  if (!_id) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(_id).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限（只有创建者可以删除）
  if (meeting.data.createdBy !== openid) {
    throw new Error('无权限删除此会议');
  }

  // 检查会议状态（已结束的会议不能删除）
  if (meeting.data.status === '已结束') {
    throw new Error('已结束的会议不能删除');
  }

  // 删除会议
  await db.collection('meetings').doc(_id).remove();

  console.log('[delete] Meeting deleted:', _id);

  return {
    success: true,
    message: '会议删除成功'
  };
}

/**
 * 查询会议列表
 */
async function handleQuery(data, openid) {
  const {
    type,
    status,
    startDate,
    endDate,
    keyword,
    page = 1,
    limit = 20,
    showDeleted = false  // 新增参数：是否查询已删除的会议
  } = data;

  // 构建查询条件
  const where = {};

  // 默认不显示已删除的会议
  if (!showDeleted) {
    where.isDeleted = _.neq(true);
  } else {
    // 查询回收站时，只显示已删除的会议
    where.isDeleted = true;
  }

  if (type && type !== 'all') {
    where.type = type;
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  // 时间范围筛选
  if (startDate || endDate) {
    where.scheduledTime = {};
    if (startDate) {
      where.scheduledTime[_.gte] = new Date(startDate);
    }
    if (endDate) {
      where.scheduledTime[_.lte] = new Date(endDate);
    }
  }

  // 关键词搜索
  if (keyword) {
    where.title = db.RegExp({
      regexp: keyword,
      options: 'i'
    });
  }

  // 查询数据 - 🔧 修改排序为 updatedAt 倒序
  const [listResult, countResult] = await Promise.all([
    db.collection('meetings')
      .where(where)
      .orderBy('updatedAt', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get(),
    db.collection('meetings')
      .where(where)
      .count()
  ]);

  console.log('[query] Meetings queried:', {
    total: countResult.total,
    page,
    limit
  });

  // 🔧 字段映射：将 attendees 映射为 participants（兼容性处理）
  const mappedItems = listResult.data.map(meeting => ({
    ...meeting,
    participants: meeting.attendees || meeting.participants || [],
    startTime: meeting.scheduledTime // 也映射时间字段
  }));

  return {
    success: true,
    data: {
      items: mappedItems,
      total: countResult.total,
      page,
      limit,
      hasMore: page * limit < countResult.total
    }
  };
}

/**
 * 获取会议详情
 */
async function handleDetail(data, openid) {
  const { _id } = data;

  if (!_id) {
    throw new Error('会议ID不能为空');
  }

  // 查询会议详情
  const result = await db.collection('meetings').doc(_id).get();

  if (!result.data) {
    throw new Error('会议不存在');
  }

  console.log('[detail] Meeting detail:', _id);

  // 🔧 字段映射：将 attendees 映射为 participants（兼容性处理）
  const mappedData = {
    ...result.data,
    participants: result.data.attendees || result.data.participants || [],
    startTime: result.data.scheduledTime // 也映射时间字段
  };

  return {
    success: true,
    data: mappedData
  };
}

/**
 * 添加议题
 */
async function handleAddAgenda(data, openid) {
  const { meetingId, agenda } = data;

  if (!meetingId || !agenda) {
    throw new Error('会议ID和议题信息不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限添加议题');
  }

  // 准备议题数据
  const newAgenda = {
    id: `agenda_${Date.now()}`,
    title: agenda.title,
    description: agenda.description || '',
    presenter: agenda.presenter || '',
    duration: agenda.duration || 10,
    order: (meeting.data.agendas || []).length + 1,
    status: '未开始',
    createdAt: new Date(),
    createdBy: openid
  };

  // 更新会议
  await db.collection('meetings').doc(meetingId).update({
    data: {
      agendas: _.push(newAgenda),
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[addAgenda] Agenda added:', newAgenda.id);

  return {
    success: true,
    data: newAgenda
  };
}

/**
 * 更新议题
 */
async function handleUpdateAgenda(data, openid) {
  const { meetingId, agendaId, updates } = data;

  if (!meetingId || !agendaId) {
    throw new Error('会议ID和议题ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限（会议记录人也可以更新议题结论）
  const isRecorder = meeting.data.recorder === openid;
  const isOrganizer = meeting.data.organizer === openid;
  const isCreator = meeting.data.createdBy === openid;
  
  if (!isRecorder && !isOrganizer && !isCreator) {
    throw new Error('无权限修改议题');
  }

  // 查找并更新议题
  const agendas = meeting.data.agendas || [];
  const agendaIndex = agendas.findIndex(a => a.id === agendaId);

  if (agendaIndex === -1) {
    throw new Error('议题不存在');
  }

  agendas[agendaIndex] = {
    ...agendas[agendaIndex],
    ...updates,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 更新会议
  await db.collection('meetings').doc(meetingId).update({
    data: {
      agendas,
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[updateAgenda] Agenda updated:', agendaId);

  return {
    success: true,
    data: agendas[agendaIndex]
  };
}

/**
 * 删除议题
 */
async function handleDeleteAgenda(data, openid) {
  const { meetingId, agendaId } = data;

  if (!meetingId || !agendaId) {
    throw new Error('会议ID和议题ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限删除议题');
  }

  // 过滤掉要删除的议题
  const agendas = (meeting.data.agendas || []).filter(a => a.id !== agendaId);

  // 重新排序
  agendas.forEach((agenda, index) => {
    agenda.order = index + 1;
  });

  // 更新会议
  await db.collection('meetings').doc(meetingId).update({
    data: {
      agendas,
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[deleteAgenda] Agenda deleted:', agendaId);

  return {
    success: true,
    message: '议题删除成功'
  };
}

/**
 * 更新会议纪要
 */
async function handleUpdateMinutes(data, openid) {
  const { meetingId, minutes } = data;

  if (!meetingId) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限修改会议纪要');
  }

  // 更新会议纪要
  await db.collection('meetings').doc(meetingId).update({
    data: {
      minutes: minutes || '',
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[updateMinutes] Minutes updated:', meetingId);

  return {
    success: true,
    message: '会议纪要更新成功'
  };
}

/**
 * 更新会议状态
 */
async function handleUpdateStatus(data, openid) {
  const { meetingId, status } = data;

  if (!meetingId || !status) {
    throw new Error('会议ID和状态不能为空');
  }

  // 验证状态
  const validStatuses = ['未开始', '进行中', '已结束', '已取消'];
  if (!validStatuses.includes(status)) {
    throw new Error('无效的会议状态');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限修改会议状态');
  }

  // 更新会议状态
  const updateData = {
    status,
    updatedAt: new Date(),
    updatedBy: openid
  };

  // 如果状态变为"进行中"，记录实际开始时间
  if (status === '进行中' && !meeting.data.actualStartTime) {
    updateData.actualStartTime = new Date();
  }

  // 如果状态变为"已结束"，记录实际结束时间
  if (status === '已结束' && !meeting.data.actualEndTime) {
    updateData.actualEndTime = new Date();
  }

  await db.collection('meetings').doc(meetingId).update({
    data: updateData
  });

  console.log('[updateStatus] Status updated:', meetingId, status);

  return {
    success: true,
    message: '会议状态更新成功'
  };
}

/**
 * 放入回收站（软删除）
 */
async function handleMoveToRecycleBin(data, openid) {
  const { meetingId } = data;

  if (!meetingId) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限删除此会议');
  }

  // 标记为已删除
  await db.collection('meetings').doc(meetingId).update({
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: openid,
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[moveToRecycleBin] Meeting moved to recycle bin:', meetingId);

  return {
    success: true,
    message: '会议已放入回收站'
  };
}

/**
 * 从回收站恢复
 */
async function handleRestore(data, openid) {
  const { meetingId } = data;

  if (!meetingId) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 检查是否在回收站
  if (!meeting.data.isDeleted) {
    throw new Error('会议不在回收站中');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限恢复此会议');
  }

  // 恢复会议
  await db.collection('meetings').doc(meetingId).update({
    data: {
      isDeleted: false,
      deletedAt: _.remove(),
      deletedBy: _.remove(),
      updatedAt: new Date(),
      updatedBy: openid
    }
  });

  console.log('[restore] Meeting restored:', meetingId);

  return {
    success: true,
    message: '会议已恢复'
  };
}

/**
 * 彻底删除
 */
async function handlePermanentDelete(data, openid) {
  const { meetingId } = data;

  if (!meetingId) {
    throw new Error('会议ID不能为空');
  }

  // 检查会议是否存在
  const meeting = await db.collection('meetings').doc(meetingId).get();
  if (!meeting.data) {
    throw new Error('会议不存在');
  }

  // 检查是否在回收站
  if (!meeting.data.isDeleted) {
    throw new Error('只能删除回收站中的会议');
  }

  // 验证权限
  if (meeting.data.createdBy !== openid && meeting.data.organizer !== openid) {
    throw new Error('无权限删除此会议');
  }

  // 彻底删除
  await db.collection('meetings').doc(meetingId).remove();

  console.log('[permanentDelete] Meeting permanently deleted:', meetingId);

  return {
    success: true,
    message: '会议已彻底删除'
  };
}
