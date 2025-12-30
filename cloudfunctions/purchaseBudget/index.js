// 采购预算管理云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 采购预算管理云函数
 * 支持操作: create, update, delete, get, list, addBatch, updateBatch
 */
exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;

  try {
    switch (action) {
      case 'create':
        return await createBudgetProject(event, userId);
      case 'update':
        return await updateBudgetProject(event, userId);
      case 'delete':
        return await deleteBudgetProject(event, userId);
      case 'get':
        return await getBudgetProject(event, userId);
      case 'list':
        return await listBudgetProjects(event, userId);
      case 'addBatch':
        return await addPurchaseBatch(event, userId);
      case 'updateBatch':
        return await updatePurchaseBatch(event, userId);
      case 'getBatch':
        return await getBatchDetail(event, userId);
      case 'listBatches':
        return await listBatches(event, userId);
      default:
        return { success: false, error: '不支持的操作类型' };
    }
  } catch (error) {
    console.error('采购预算管理错误:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 创建采购预算项目
 */
async function createBudgetProject(event, userId) {
  const {
    projectName,
    year,
    category,
    budgetAmount,
    owner,
    department,
    startDate,
    endDate,
    reason,
    specifications
  } = event;

  // 参数验证
  if (!projectName || !year || !category || !budgetAmount) {
    throw new Error('缺少必填字段');
  }

  // 创建项目
  const project = {
    projectName,
    year,
    category,
    budgetAmount,
    allocatedAmount: 0,
    actualAmount: 0,
    remainingBudget: budgetAmount,
    status: '未开始',
    progress: 0,
    totalBatches: 0,
    completedBatches: 0,
    owner: owner || userId,
    department: department || '',
    startDate,
    endDate,
    reason: reason || '',
    specifications: specifications || '',
    createdBy: userId,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
    isDeleted: false
  };

  const result = await db.collection('assetBudgetProjects').add({
    data: project
  });

  return {
    success: true,
    projectId: result._id,
    message: '采购预算项目创建成功'
  };
}

/**
 * 更新采购预算项目
 */
async function updateBudgetProject(event, userId) {
  const { projectId, updates } = event;

  if (!projectId) {
    throw new Error('缺少项目ID');
  }

  // 不允许直接修改的字段
  delete updates.allocatedAmount;
  delete updates.actualAmount;
  delete updates.remainingBudget;
  delete updates.totalBatches;
  delete updates.completedBatches;
  delete updates.createdBy;
  delete updates.createdAt;

  updates.updatedAt = db.serverDate();

  await db.collection('assetBudgetProjects').doc(projectId).update({
    data: updates
  });

  return {
    success: true,
    message: '采购预算项目更新成功'
  };
}

/**
 * 删除采购预算项目
 */
async function deleteBudgetProject(event, userId) {
  const { projectId } = event;

  if (!projectId) {
    throw new Error('缺少项目ID');
  }

  // 检查是否有未完成的批次
  const batches = await db.collection('purchaseBatches')
    .where({
      budgetProjectId: projectId,
      status: _.neq('已完成')
    })
    .count();

  if (batches.total > 0) {
    throw new Error('存在未完成的采购批次，无法删除');
  }

  // 软删除
  await db.collection('assetBudgetProjects').doc(projectId).update({
    data: {
      isDeleted: true,
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    message: '采购预算项目删除成功'
  };
}

/**
 * 获取采购预算项目详情
 */
async function getBudgetProject(event, userId) {
  const { projectId } = event;

  if (!projectId) {
    throw new Error('缺少项目ID');
  }

  const project = await db.collection('assetBudgetProjects')
    .doc(projectId)
    .get();

  if (!project.data || project.data.length === 0) {
    throw new Error('项目不存在');
  }

  // 获取批次列表
  const batches = await db.collection('purchaseBatches')
    .where({
      budgetProjectId: projectId
    })
    .orderBy('batchNo', 'asc')
    .get();

  return {
    success: true,
    project: project.data[0] || project.data,
    batches: batches.data
  };
}

/**
 * 获取采购预算项目列表
 */
async function listBudgetProjects(event, userId) {
  const { year, status, category, page = 1, pageSize = 20 } = event;

  const where = { isDeleted: false };
  
  if (year) where.year = year;
  if (status) where.status = status;
  if (category) where.category = category;

  const skip = (page - 1) * pageSize;

  const [list, total] = await Promise.all([
    db.collection('assetBudgetProjects')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('assetBudgetProjects')
      .where(where)
      .count()
  ]);

  return {
    success: true,
    list: list.data,
    total: total.total,
    page,
    pageSize
  };
}

/**
 * 添加采购批次
 */
async function addPurchaseBatch(event, userId) {
  const {
    budgetProjectId,
    batchName,
    batchBudget,
    purchaseItems,
    plannedStartDate,
    plannedEndDate
  } = event;

  // 参数验证
  if (!budgetProjectId || !batchName || !batchBudget) {
    throw new Error('缺少必填字段');
  }

  // 获取项目信息
  const projectRes = await db.collection('assetBudgetProjects')
    .doc(budgetProjectId)
    .get();

  if (!projectRes.data || projectRes.data.length === 0) {
    throw new Error('采购预算项目不存在');
  }

  const project = projectRes.data[0] || projectRes.data;

  // 检查剩余预算
  if (batchBudget > project.remainingBudget) {
    throw new Error(`批次预算(${batchBudget})超过剩余预算(${project.remainingBudget})`);
  }

  // 计算批次编号
  const batchNo = project.totalBatches + 1;

  // 创建批次
  const batch = {
    budgetProjectId,
    batchNo,
    batchName,
    batchBudget,
    batchActual: 0,
    status: '未开始',
    progress: 0,
    purchaseItems: purchaseItems || [],
    plannedStartDate: plannedStartDate || '',
    plannedEndDate: plannedEndDate || '',
    createdBy: userId,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const batchResult = await db.collection('purchaseBatches').add({
    data: batch
  });

  const batchId = batchResult._id;

  // 自动创建3个关联任务
  const tasks = [
    {
      name: `${batchName}-申请`,
      level: '团队级',
      type: '采购任务',
      status: '未开始',
      progress: 0,
      owner: userId,
      startDate: plannedStartDate || new Date().toISOString().split('T')[0],
      endDate: plannedEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchaseProjectId: budgetProjectId,
      purchaseBatchId: batchId,
      purchasePhase: '采购申请',
      canStart: true,
      createdBy: userId,
      createdAt: db.serverDate()
    },
    {
      name: `${batchName}-执行`,
      level: '团队级',
      type: '采购任务',
      status: '未开始',
      progress: 0,
      owner: userId,
      startDate: plannedStartDate || new Date().toISOString().split('T')[0],
      endDate: plannedEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchaseProjectId: budgetProjectId,
      purchaseBatchId: batchId,
      purchasePhase: '采购执行',
      canStart: false,
      prerequisitePhase: '采购申请',
      createdBy: userId,
      createdAt: db.serverDate()
    },
    {
      name: `${batchName}-验收`,
      level: '团队级',
      type: '采购任务',
      status: '未开始',
      progress: 0,
      owner: userId,
      startDate: plannedStartDate || new Date().toISOString().split('T')[0],
      endDate: plannedEndDate || new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchaseProjectId: budgetProjectId,
      purchaseBatchId: batchId,
      purchasePhase: '采购验收',
      canStart: false,
      prerequisitePhase: '采购执行',
      createdBy: userId,
      createdAt: db.serverDate()
    }
  ];

  // 批量创建任务
  for (const task of tasks) {
    await db.collection('tasks').add({ data: task });
  }

  // 更新项目的已分配金额和批次数
  await db.collection('assetBudgetProjects').doc(budgetProjectId).update({
    data: {
      allocatedAmount: _.inc(batchBudget),
      remainingBudget: _.inc(-batchBudget),
      totalBatches: _.inc(1),
      status: '进行中',
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    batchId,
    message: '采购批次创建成功，已自动创建3个关联任务'
  };
}

/**
 * 更新采购批次
 */
async function updatePurchaseBatch(event, userId) {
  const { batchId, updates } = event;

  if (!batchId) {
    throw new Error('缺少批次ID');
  }

  // 不允许直接修改的字段
  delete updates.budgetProjectId;
  delete updates.batchNo;
  delete updates.batchActual;
  delete updates.progress;
  delete updates.createdBy;
  delete updates.createdAt;

  updates.updatedAt = db.serverDate();

  await db.collection('purchaseBatches').doc(batchId).update({
    data: updates
  });

  return {
    success: true,
    message: '采购批次更新成功'
  };
}

/**
 * 获取批次详情
 */
async function getBatchDetail(event, userId) {
  const { batchId } = event;

  if (!batchId) {
    throw new Error('缺少批次ID');
  }

  const batch = await db.collection('purchaseBatches')
    .doc(batchId)
    .get();

  if (!batch.data || batch.data.length === 0) {
    throw new Error('批次不存在');
  }

  // 获取关联任务
  const tasks = await db.collection('tasks')
    .where({
      purchaseBatchId: batchId
    })
    .orderBy('purchasePhase', 'asc')
    .get();

  return {
    success: true,
    batch: batch.data[0] || batch.data,
    tasks: tasks.data
  };
}

/**
 * 获取批次列表
 */
async function listBatches(event, userId) {
  const { budgetProjectId } = event;

  if (!budgetProjectId) {
    throw new Error('缺少项目ID');
  }

  const batches = await db.collection('purchaseBatches')
    .where({
      budgetProjectId
    })
    .orderBy('batchNo', 'asc')
    .get();

  return {
    success: true,
    batches: batches.data
  };
}
