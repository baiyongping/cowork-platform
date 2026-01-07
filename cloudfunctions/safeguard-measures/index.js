// 云函数：保障措施管理
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
      case 'queryByStrategy':
        return await queryByStrategy(data, wxContext);
      case 'calculateCompletion':
        return await calculateCompletion(data, wxContext);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[safeguard-measures][${action}] Error:`, error);
    return {
      success: false,
      code: 'ERROR',
      message: error.message
    };
  }
};

// 创建保障措施
async function createMeasure(data, wxContext) {
  const { strategyId, year, content, owner, deadline } = data;

  // 验证必填字段
  if (!strategyId || !year || !content || !owner || !deadline) {
    throw new Error('缺少必填字段');
  }

  const now = new Date();
  const measure = {
    strategyId,
    year,
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

  const result = await db.collection('safeguardMeasures').add({
    data: measure
  });

  return {
    success: true,
    code: 'SUCCESS',
    data: {
      _id: result._id,
      ...measure
    }
  };
}

// 更新保障措施
async function updateMeasure(data, wxContext) {
  const { _id, ...updates } = data;

  if (!_id) {
    throw new Error('缺少保障措施ID');
  }

  // 不允许直接修改完成度（由系统自动计算）
  delete updates.completionRate;
  
  updates.updatedAt = new Date();

  const result = await db.collection('safeguardMeasures')
    .doc(_id)
    .update({
      data: updates
    });

  return {
    success: true,
    code: 'SUCCESS',
    message: '更新成功',
    data: { updated: result.stats.updated }
  };
}

// 删除保障措施（软删除）
async function deleteMeasure(data, wxContext) {
  const { _id } = data;

  if (!_id) {
    throw new Error('缺少保障措施ID');
  }

  const result = await db.collection('safeguardMeasures')
    .doc(_id)
    .update({
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

  return {
    success: true,
    code: 'SUCCESS',
    message: '删除成功',
    data: { updated: result.stats.updated }
  };
}

// 查询保障措施
async function queryMeasures(data, wxContext) {
  const { year, strategyId, owner } = data;

  const query = {
    isDeleted: false
  };

  if (year) query.year = year;
  if (strategyId) query.strategyId = strategyId;
  if (owner) query.owner = owner;

  const result = await db.collection('safeguardMeasures')
    .where(query)
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    code: 'SUCCESS',
    data: result.data
  };
}

// 根据年度策略查询保障措施
async function queryByStrategy(data, wxContext) {
  const { strategyId } = data;

  if (!strategyId) {
    throw new Error('缺少年度策略ID');
  }

  const result = await db.collection('safeguardMeasures')
    .where({
      strategyId,
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

// 计算保障措施完成度（基于关联的季度措施）
async function calculateCompletion(data, wxContext) {
  const { measureId } = data;

  if (!measureId) {
    throw new Error('缺少保障措施ID');
  }

  // 查询关联的季度措施
  const quarterlyResult = await db.collection('quarterlyMeasures')
    .where({
      safeguardMeasureId: measureId,
      isDeleted: false
    })
    .get();

  const quarterlyMeasures = quarterlyResult.data;

  if (quarterlyMeasures.length === 0) {
    // 没有关联的季度措施，完成度为0
    await db.collection('safeguardMeasures')
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
  const totalCompletion = quarterlyMeasures.reduce((sum, measure) => {
    return sum + (measure.completionRate || 0);
  }, 0);

  const completionRate = Math.round(totalCompletion / quarterlyMeasures.length);

  // 更新保障措施完成度
  await db.collection('safeguardMeasures')
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

  await db.collection('safeguardMeasures')
    .doc(measureId)
    .update({
      data: {
        status,
        updatedAt: new Date()
      }
    });

  return {
    success: true,
    code: 'SUCCESS',
    data: { 
      completionRate,
      status,
      quarterlyMeasuresCount: quarterlyMeasures.length
    }
  };
}
