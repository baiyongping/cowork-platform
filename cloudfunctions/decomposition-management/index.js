/**
 * 目标分解数据管理云函数
 * 负责分解数据的CRUD、版本管理、数据校验
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const MAX_VERSIONS = 10; // 保留最近10个版本

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'list':
        return await listDecompositions(data);
      case 'get':
        return await getDecomposition(data);
      case 'create':
        return await createDecomposition(data, wxContext);
      case 'update':
        return await updateDecomposition(data, wxContext);
      case 'delete':
        return await deleteDecomposition(data, wxContext);
      case 'validate':
        return await validateDecompositionData(data);
      case 'getHistory':
        return await getDecompositionHistory(data);
      case 'compareVersions':
        return await compareVersions(data);
      case 'rollbackVersion':
        return await rollbackVersion(data, wxContext);
      default:
        throw new Error(`未知操作: ${action}`);
    }
  } catch (error) {
    console.error(`[${action}] 错误:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 获取分解列表
 */
async function listDecompositions(data) {
  const { goalId, status = 'active' } = data || {};

  let query = db.collection('goalDecompositions');

  if (goalId) {
    query = query.where({ goalId });
  }

  if (status !== 'all') {
    query = query.where({ status });
  }

  const result = await query
    .orderBy('version', 'desc')
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    data: result.data
  };
}

/**
 * 获取分解详情
 */
async function getDecomposition(data) {
  const { decompositionId, goalId } = data;

  let query = db.collection('goalDecompositions');

  if (decompositionId) {
    const result = await query.doc(decompositionId).get();
    if (!result.data) {
      throw new Error('分解记录不存在');
    }
    return {
      success: true,
      data: result.data
    };
  }

  if (goalId) {
    // 获取最新活跃版本
    const result = await query
      .where({
        goalId,
        status: 'active'
      })
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    return {
      success: true,
      data: result.data[0] || null
    };
  }

  throw new Error('必须提供 decompositionId 或 goalId');
}

/**
 * 创建分解
 */
async function createDecomposition(data, wxContext) {
  const {
    goalId,
    dimensionIds,
    decompositionData,
    totalTarget
  } = data;

  // 数据验证
  if (!goalId) {
    throw new Error('目标ID不能为空');
  }

  if (!dimensionIds || dimensionIds.length === 0 || dimensionIds.length > 3) {
    throw new Error('必须选择1-3个维度');
  }

  if (!decompositionData || decompositionData.length === 0) {
    throw new Error('分解数据不能为空');
  }

  // 验证分解数据总和
  const validation = await validateDecompositionData({
    decompositionData,
    totalTarget
  });

  if (!validation.success) {
    throw new Error(validation.error);
  }

  // 获取当前最大版本号
  const versionResult = await db.collection('goalDecompositions')
    .where({ goalId })
    .orderBy('version', 'desc')
    .limit(1)
    .get();

  const newVersion = versionResult.data.length > 0 
    ? versionResult.data[0].version + 1 
    : 1;

  // 计算总实际值和完成率
  const totalActual = decompositionData.reduce(
    (sum, item) => sum + (item.actualValue || 0),
    0
  );
  const overallCompletionRate = totalTarget > 0 
    ? Math.round((totalActual / totalTarget) * 100) 
    : 0;

  // 创建分解记录
  const decomposition = {
    goalId,
    dimensionIds,
    decompositionData: decompositionData.map(item => ({
      ...item,
      completionRate: item.targetValue > 0
        ? Math.round(((item.actualValue || 0) / item.targetValue) * 100)
        : 0
    })),
    totalTarget,
    totalActual,
    overallCompletionRate,
    version: newVersion,
    status: 'active',
    createdBy: wxContext.OPENID,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('goalDecompositions')
    .add({
      data: decomposition
    });

  const decompositionId = result._id;

  // 创建历史记录
  await createHistoryRecord({
    goalId,
    decompositionId,
    version: newVersion,
    snapshotData: decomposition,
    changeType: 'created',
    changeDescription: '创建目标分解',
    changedFields: [],
    changedBy: wxContext.OPENID
  });

  // 清理旧版本
  await cleanupOldVersions(goalId);

  return {
    success: true,
    data: {
      _id: decompositionId,
      ...decomposition
    },
    message: '分解创建成功'
  };
}

/**
 * 更新分解
 */
async function updateDecomposition(data, wxContext) {
  const {
    decompositionId,
    decompositionData,
    totalTarget
  } = data;

  // 获取现有记录
  const existingResult = await db.collection('goalDecompositions')
    .doc(decompositionId)
    .get();

  if (!existingResult.data) {
    throw new Error('分解记录不存在');
  }

  const existing = existingResult.data;

  // 验证分解数据总和
  if (decompositionData && totalTarget) {
    const validation = await validateDecompositionData({
      decompositionData,
      totalTarget
    });

    if (!validation.success) {
      throw new Error(validation.error);
    }
  }

  // 计算变更字段
  const changedFields = [];
  if (decompositionData && JSON.stringify(decompositionData) !== JSON.stringify(existing.decompositionData)) {
    changedFields.push('decompositionData');
  }
  if (totalTarget && totalTarget !== existing.totalTarget) {
    changedFields.push('totalTarget');
  }

  // 计算新的总实际值和完成率
  const newData = decompositionData || existing.decompositionData;
  const newTarget = totalTarget || existing.totalTarget;

  const totalActual = newData.reduce(
    (sum, item) => sum + (item.actualValue || 0),
    0
  );
  const overallCompletionRate = newTarget > 0 
    ? Math.round((totalActual / newTarget) * 100) 
    : 0;

  // 更新数据
  const updateData = {
    decompositionData: newData.map(item => ({
      ...item,
      completionRate: item.targetValue > 0
        ? Math.round(((item.actualValue || 0) / item.targetValue) * 100)
        : 0
    })),
    totalTarget: newTarget,
    totalActual,
    overallCompletionRate,
    updatedAt: new Date()
  };

  await db.collection('goalDecompositions')
    .doc(decompositionId)
    .update({
      data: updateData
    });

  // 创建历史记录
  await createHistoryRecord({
    goalId: existing.goalId,
    decompositionId,
    version: existing.version,
    snapshotData: {
      ...existing,
      ...updateData
    },
    changeType: 'updated',
    changeDescription: '更新目标分解数据',
    changedFields,
    changedBy: wxContext.OPENID
  });

  // 清理旧版本
  await cleanupOldVersions(existing.goalId);

  return {
    success: true,
    message: '分解更新成功'
  };
}

/**
 * 删除分解
 */
async function deleteDecomposition(data, wxContext) {
  const { decompositionId } = data;

  // 获取现有记录
  const existingResult = await db.collection('goalDecompositions')
    .doc(decompositionId)
    .get();

  if (!existingResult.data) {
    throw new Error('分解记录不存在');
  }

  const existing = existingResult.data;

  // 创建历史记录
  await createHistoryRecord({
    goalId: existing.goalId,
    decompositionId,
    version: existing.version,
    snapshotData: existing,
    changeType: 'deleted',
    changeDescription: '删除目标分解',
    changedFields: [],
    changedBy: wxContext.OPENID
  });

  // 删除记录
  await db.collection('goalDecompositions')
    .doc(decompositionId)
    .remove();

  return {
    success: true,
    message: '分解删除成功'
  };
}

/**
 * 验证分解数据
 */
async function validateDecompositionData(data) {
  const { decompositionData, totalTarget } = data;

  // 计算分解总和
  const decompositionSum = decompositionData.reduce(
    (sum, item) => sum + (item.targetValue || 0),
    0
  );

  // 允许0.01的浮点误差
  if (Math.abs(decompositionSum - totalTarget) > 0.01) {
    return {
      success: false,
      error: `分解总和(${decompositionSum})必须等于目标总额(${totalTarget})`
    };
  }

  return {
    success: true
  };
}

/**
 * 获取历史版本
 */
async function getDecompositionHistory(data) {
  const { goalId, decompositionId } = data;

  let query = db.collection('goalDecompositionHistory');

  if (decompositionId) {
    query = query.where({ decompositionId });
  } else if (goalId) {
    query = query.where({ goalId });
  } else {
    throw new Error('必须提供 goalId 或 decompositionId');
  }

  const result = await query
    .orderBy('changedAt', 'desc')
    .get();

  return {
    success: true,
    data: result.data
  };
}

/**
 * 对比两个版本
 */
async function compareVersions(data) {
  const { version1Id, version2Id } = data;

  const [v1Result, v2Result] = await Promise.all([
    db.collection('goalDecompositionHistory').doc(version1Id).get(),
    db.collection('goalDecompositionHistory').doc(version2Id).get()
  ]);

  if (!v1Result.data || !v2Result.data) {
    throw new Error('版本记录不存在');
  }

  const v1 = v1Result.data;
  const v2 = v2Result.data;

  // 计算差异
  const differences = {
    totalTarget: v1.snapshotData.totalTarget !== v2.snapshotData.totalTarget,
    totalActual: v1.snapshotData.totalActual !== v2.snapshotData.totalActual,
    overallCompletionRate: v1.snapshotData.overallCompletionRate !== v2.snapshotData.overallCompletionRate,
    decompositionDataChanges: []
  };

  // 对比分解数据
  const v1Data = v1.snapshotData.decompositionData;
  const v2Data = v2.snapshotData.decompositionData;

  for (let i = 0; i < Math.max(v1Data.length, v2Data.length); i++) {
    const item1 = v1Data[i];
    const item2 = v2Data[i];

    if (JSON.stringify(item1) !== JSON.stringify(item2)) {
      differences.decompositionDataChanges.push({
        index: i,
        before: item1,
        after: item2
      });
    }
  }

  return {
    success: true,
    data: {
      version1: v1,
      version2: v2,
      differences
    }
  };
}

/**
 * 回滚到指定版本
 */
async function rollbackVersion(data, wxContext) {
  const { historyId } = data;

  // 获取历史记录
  const historyResult = await db.collection('goalDecompositionHistory')
    .doc(historyId)
    .get();

  if (!historyResult.data) {
    throw new Error('历史记录不存在');
  }

  const history = historyResult.data;
  const snapshotData = history.snapshotData;

  // 创建新的分解记录（作为新版本）
  const result = await createDecomposition({
    goalId: history.goalId,
    dimensionIds: snapshotData.dimensionIds,
    decompositionData: snapshotData.decompositionData,
    totalTarget: snapshotData.totalTarget
  }, wxContext);

  return {
    success: true,
    data: result.data,
    message: `已回滚到版本 ${history.version}`
  };
}

/**
 * 创建历史记录
 */
async function createHistoryRecord(historyData) {
  await db.collection('goalDecompositionHistory')
    .add({
      data: {
        ...historyData,
        changedAt: new Date()
      }
    });
}

/**
 * 清理旧版本（保留最近10个）
 */
async function cleanupOldVersions(goalId) {
  const result = await db.collection('goalDecompositionHistory')
    .where({ goalId })
    .orderBy('changedAt', 'desc')
    .skip(MAX_VERSIONS)
    .get();

  if (result.data.length > 0) {
    const deletePromises = result.data.map(record =>
      db.collection('goalDecompositionHistory')
        .doc(record._id)
        .remove()
    );

    await Promise.all(deletePromises);
    console.log(`清理了 ${result.data.length} 个旧版本`);
  }
}
