// 采购任务管理云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 采购任务管理云函数
 * 支持任务完成触发下一阶段解锁
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  try {
    switch (action) {
      case 'complete':
        return await completeTask(event, userId);
      case 'updateProgress':
        return await updateTaskProgress(event, userId);
      case 'checkCanStart':
        return await checkCanStart(event, userId);
      default:
        return { success: false, error: '不支持的操作类型' };
    }
  } catch (error) {
    console.error('采购任务管理错误:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 完成任务并解锁下一阶段
 */
async function completeTask(event, userId) {
  const { taskId } = event;

  if (!taskId) {
    throw new Error('缺少任务ID');
  }

  // 获取任务信息
  const taskRes = await db.collection('tasks').doc(taskId).get();
  if (!taskRes.data || taskRes.data.length === 0) {
    throw new Error('任务不存在');
  }

  const task = taskRes.data[0] || taskRes.data;

  // 检查是否为采购任务
  if (task.type !== '采购任务') {
    throw new Error('该任务不是采购任务');
  }

  // 更新任务状态为已完成
  await db.collection('tasks').doc(taskId).update({
    data: {
      status: '已完成',
      progress: 100,
      updatedAt: db.serverDate()
    }
  });

  // 获取下一阶段
  const nextPhase = getNextPhase(task.purchasePhase);

  if (nextPhase) {
    // 解锁下一阶段任务
    const nextTasks = await db.collection('tasks')
      .where({
        purchaseBatchId: task.purchaseBatchId,
        purchasePhase: nextPhase
      })
      .get();

    for (const nextTask of nextTasks.data) {
      await db.collection('tasks').doc(nextTask._id).update({
        data: {
          canStart: true,
          status: '未开始',
          updatedAt: db.serverDate()
        }
      });
    }
  }

  // 更新批次状态和进度
  await updateBatchStatus(task.purchaseBatchId);

  // 更新项目进度
  await updateProjectProgress(task.purchaseProjectId);

  return {
    success: true,
    message: `任务完成${nextPhase ? '，已解锁下一阶段任务' : ''}`,
    nextPhase
  };
}

/**
 * 更新任务进度
 */
async function updateTaskProgress(event, userId) {
  const { taskId, progress, actualAmount } = event;

  if (!taskId) {
    throw new Error('缺少任务ID');
  }

  const updates = {
    updatedAt: db.serverDate()
  };

  if (progress !== undefined) {
    updates.progress = progress;
    if (progress > 0 && progress < 100) {
      updates.status = '进行中';
    }
  }

  await db.collection('tasks').doc(taskId).update({
    data: updates
  });

  // 如果是执行阶段且提供了实际金额，更新批次实际支出
  const taskRes = await db.collection('tasks').doc(taskId).get();
  const task = taskRes.data[0] || taskRes.data;

  if (task.purchasePhase === '采购执行' && actualAmount !== undefined) {
    await db.collection('purchaseBatches')
      .doc(task.purchaseBatchId)
      .update({
        data: {
          batchActual: actualAmount,
          updatedAt: db.serverDate()
        }
      });

    // 更新项目实际支出
    await updateProjectActualAmount(task.purchaseProjectId);
  }

  // 更新批次状态
  await updateBatchStatus(task.purchaseBatchId);

  return {
    success: true,
    message: '任务进度更新成功'
  };
}

/**
 * 检查任务是否可以启动
 */
async function checkCanStart(event, userId) {
  const { taskId } = event;

  if (!taskId) {
    throw new Error('缺少任务ID');
  }

  const taskRes = await db.collection('tasks').doc(taskId).get();
  if (!taskRes.data || taskRes.data.length === 0) {
    throw new Error('任务不存在');
  }

  const task = taskRes.data[0] || taskRes.data;

  if (task.type !== '采购任务') {
    return { success: true, canStart: true, reason: '非采购任务' };
  }

  if (task.canStart) {
    return { success: true, canStart: true };
  }

  // 检查前置任务是否完成
  const prerequisitePhase = task.prerequisitePhase;
  if (!prerequisitePhase) {
    return { success: true, canStart: true };
  }

  const prerequisiteTasks = await db.collection('tasks')
    .where({
      purchaseBatchId: task.purchaseBatchId,
      purchasePhase: prerequisitePhase
    })
    .get();

  const allCompleted = prerequisiteTasks.data.every(t => t.status === '已完成');

  return {
    success: true,
    canStart: allCompleted,
    reason: allCompleted ? '' : `需要先完成"${prerequisitePhase}"任务`
  };
}

/**
 * 获取下一阶段
 */
function getNextPhase(currentPhase) {
  const phases = ['采购申请', '采购执行', '采购验收'];
  const index = phases.indexOf(currentPhase);
  return index < phases.length - 1 ? phases[index + 1] : null;
}

/**
 * 更新批次状态
 */
async function updateBatchStatus(batchId) {
  if (!batchId) return;

  // 获取批次所有任务
  const tasks = await db.collection('tasks')
    .where({
      purchaseBatchId: batchId
    })
    .get();

  if (tasks.data.length === 0) return;

  // 计算进度
  const totalProgress = tasks.data.reduce((sum, task) => sum + (task.progress || 0), 0);
  const avgProgress = Math.round(totalProgress / tasks.data.length);

  // 判断状态
  let status = '未开始';
  const allCompleted = tasks.data.every(t => t.status === '已完成');
  const anyInProgress = tasks.data.some(t => t.status === '进行中');

  if (allCompleted) {
    status = '已完成';
  } else if (anyInProgress) {
    const currentTask = tasks.data.find(t => t.status === '进行中');
    status = currentTask.purchasePhase === '采购申请' ? '申请中' :
             currentTask.purchasePhase === '采购执行' ? '执行中' :
             currentTask.purchasePhase === '采购验收' ? '验收中' : '进行中';
  }

  await db.collection('purchaseBatches').doc(batchId).update({
    data: {
      status,
      progress: avgProgress,
      updatedAt: db.serverDate()
    }
  });
}

/**
 * 更新项目进度
 */
async function updateProjectProgress(projectId) {
  if (!projectId) return;

  // 获取所有批次
  const batches = await db.collection('purchaseBatches')
    .where({
      budgetProjectId: projectId
    })
    .get();

  if (batches.data.length === 0) return;

  // 计算总进度
  const totalProgress = batches.data.reduce((sum, batch) => sum + (batch.progress || 0), 0);
  const avgProgress = Math.round(totalProgress / batches.data.length);

  // 计算完成批次数
  const completedBatches = batches.data.filter(b => b.status === '已完成').length;

  // 判断项目状态
  let status = '未开始';
  const allCompleted = batches.data.every(b => b.status === '已完成');
  const anyInProgress = batches.data.some(b => b.status !== '未开始' && b.status !== '已完成');

  if (allCompleted) {
    status = '已完成';
  } else if (anyInProgress) {
    status = '进行中';
  }

  await db.collection('assetBudgetProjects').doc(projectId).update({
    data: {
      status,
      progress: avgProgress,
      completedBatches,
      updatedAt: db.serverDate()
    }
  });
}

/**
 * 更新项目实际支出
 */
async function updateProjectActualAmount(projectId) {
  if (!projectId) return;

  // 获取所有批次
  const batches = await db.collection('purchaseBatches')
    .where({
      budgetProjectId: projectId
    })
    .get();

  // 计算总实际支出
  const totalActual = batches.data.reduce((sum, batch) => sum + (batch.batchActual || 0), 0);

  await db.collection('assetBudgetProjects').doc(projectId).update({
    data: {
      actualAmount: totalActual,
      updatedAt: db.serverDate()
    }
  });
}
