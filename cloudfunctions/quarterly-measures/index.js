// 云函数：季度措施管理
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createMeasure(data, wxContext);
      case 'update':
        return await updateMeasure(data, wxContext);
      case 'delete':
        return await deleteMeasure(data, wxContext);
      case 'query':
        return await queryMeasures(data, wxContext);
      case 'queryBySafeguard':
        return await queryBySafeguard(data, wxContext);
      case 'calculateCompletion':
        return await calculateCompletion(data, wxContext);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[quarterly-measures][${action}] Error:`, error);
    return {
      success: false,
      code: 'ERROR',
      message: error.message
    };
  }
};

// 创建季度措施
async function createMeasure(data, wxContext) {
  const { safeguardMeasureId, year, quarter, content, owner, deadline } = data;

  // 验证必填字段
  if (!safeguardMeasureId || !year || !quarter || !content || !owner || !deadline) {
    throw new Error('缺少必填字段');
  }

  const now = new Date();
  const measure = {
    safeguardMeasureId,  // 关联保障措施
    year,
    quarter,
    content,
    owner,
    deadline: new Date(deadline),
    completionRate: 0,
    status: '进行中',
    createdAt: now,
    updatedAt: now,
    createdBy: wxContext.OPENID,
    isDeleted: false
  };

  const result = await db.collection('quarterlyMeasures').add({
    data: measure
  });

  // 自动触发保障措施完成度计算
  await triggerSafeguardCompletion(safeguardMeasureId);

  return {
    success: true,
    code: 'SUCCESS',
    data: {
      _id: result._id,
      ...measure
    }
  };
}

// 更新季度措施
async function updateMeasure(data, wxContext) {
  const { _id, safeguardMeasureId, ...updates } = data;

  if (!_id) {
    throw new Error('缺少季度措施ID');
  }

  // 获取原始数据（用于触发完成度计算）
  const original = await db.collection('quarterlyMeasures').doc(_id).get();
  const originalSafeguardId = original.data.safeguardMeasureId;

  // 不允许直接修改完成度（由系统自动计算）
  delete updates.completionRate;
  
  updates.updatedAt = new Date();

  // 如果修改了关联的保障措施
  if (safeguardMeasureId && safeguardMeasureId !== originalSafeguardId) {
    updates.safeguardMeasureId = safeguardMeasureId;
  }

  const result = await db.collection('quarterlyMeasures')
    .doc(_id)
    .update({
      data: updates
    });

  // 触发相关保障措施的完成度计算
  await triggerSafeguardCompletion(originalSafeguardId);
  if (safeguardMeasureId && safeguardMeasureId !== originalSafeguardId) {
    await triggerSafeguardCompletion(safeguardMeasureId);
  }

  return {
    success: true,
    code: 'SUCCESS',
    message: '更新成功',
    data: { updated: result.stats.updated }
  };
}

// 删除季度措施（软删除）
async function deleteMeasure(data, wxContext) {
  const { _id } = data;

  if (!_id) {
    throw new Error('缺少季度措施ID');
  }

  // 获取原始数据
  const original = await db.collection('quarterlyMeasures').doc(_id).get();
  const safeguardMeasureId = original.data.safeguardMeasureId;

  const result = await db.collection('quarterlyMeasures')
    .doc(_id)
    .update({
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

  // 触发保障措施完成度计算
  await triggerSafeguardCompletion(safeguardMeasureId);

  return {
    success: true,
    code: 'SUCCESS',
    message: '删除成功',
    data: { updated: result.stats.updated }
  };
}

// 查询季度措施
async function queryMeasures(data, wxContext) {
  const { year, quarter, safeguardMeasureId, owner } = data;

  const query = {
    isDeleted: false
  };

  if (year) query.year = year;
  if (quarter) query.quarter = quarter;
  if (safeguardMeasureId) query.safeguardMeasureId = safeguardMeasureId;
  if (owner) query.owner = owner;

  const result = await db.collection('quarterlyMeasures')
    .where(query)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    code: 'SUCCESS',
    data: result.data
  };
}

// 根据保障措施查询季度措施
async function queryBySafeguard(data, wxContext) {
  const { safeguardMeasureId } = data;

  if (!safeguardMeasureId) {
    throw new Error('缺少保障措施ID');
  }

  const result = await db.collection('quarterlyMeasures')
    .where({
      safeguardMeasureId,
      isDeleted: false
    })
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    code: 'SUCCESS',
    data: result.data
  };
}

// 计算季度措施完成度（基于关联的团队月计划）
async function calculateCompletion(data, wxContext) {
  const { measureId } = data;

  if (!measureId) {
    throw new Error('缺少季度措施ID');
  }

  // 查询关联的团队月计划
  const monthlyResult = await db.collection('tasks')
    .where({
      type: '团队月计划',
      relatedTo: measureId,
      isDeleted: false
    })
    .get();

  const monthlyPlans = monthlyResult.data;

  if (monthlyPlans.length === 0) {
    // 没有关联的团队月计划，完成度为0
    await db.collection('quarterlyMeasures')
      .doc(measureId)
      .update({
        data: {
          completionRate: 0,
          updatedAt: new Date()
        }
      });

    return {
      success: true,
      code: 'SUCCESS',
      data: { completionRate: 0 }
    };
  }

  // 计算平均完成度
  const totalCompletion = monthlyPlans.reduce((sum, plan) => {
    return sum + (plan.progress || 0);
  }, 0);

  const completionRate = Math.round(totalCompletion / monthlyPlans.length);

  // 更新季度措施完成度
  await db.collection('quarterlyMeasures')
    .doc(measureId)
    .update({
      data: {
        completionRate,
        updatedAt: new Date()
      }
    });

  // 根据完成度更新状态
  let status = '进行中';
  if (completionRate >= 100) {
    status = '已完成';
  } else if (completionRate === 0) {
    status = '未开始';
  }

  await db.collection('quarterlyMeasures')
    .doc(measureId)
    .update({
      data: {
        status,
        updatedAt: new Date()
      }
    });

  // 触发保障措施完成度计算
  const measure = await db.collection('quarterlyMeasures').doc(measureId).get();
  if (measure.data && measure.data.safeguardMeasureId) {
    await triggerSafeguardCompletion(measure.data.safeguardMeasureId);
  }

  return {
    success: true,
    code: 'SUCCESS',
    data: { 
      completionRate,
      status,
      monthlyPlansCount: monthlyPlans.length
    }
  };
}

// 触发保障措施完成度计算
async function triggerSafeguardCompletion(safeguardMeasureId) {
  if (!safeguardMeasureId) return;

  try {
    await cloud.callFunction({
      name: 'safeguard-measures',
      data: {
        action: 'calculateCompletion',
        data: { measureId: safeguardMeasureId }
      }
    });
  } catch (error) {
    console.error('触发保障措施完成度计算失败:', error);
  }
}
