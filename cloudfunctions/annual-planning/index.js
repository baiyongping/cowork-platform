const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 年度经营计划管理云函数
 * 支持年度计划的分解、维度管理等操作
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  console.log('[annual-planning] 收到请求:', { action, openid: wxContext.OPENID });

  try {
    switch (action) {
      // 维度管理
      case 'getDimensions':
        return await getDimensions(wxContext);
      case 'addDimension':
        return await addDimension(data, wxContext);
      case 'updateDimension':
        return await updateDimension(data, wxContext);
      case 'deleteDimension':
        return await deleteDimension(data, wxContext);
      case 'clearDimensions':
        return await clearDimensions(wxContext);

      // 年度计划分解表管理
      case 'getDecompositionTables':
        return await getDecompositionTables(data, wxContext);
      case 'getDecompositionTable':
        return await getDecompositionTable(data, wxContext);
      case 'createDecompositionTable':
        return await createDecompositionTable(data, wxContext);
      case 'updateDecompositionTable':
        return await updateDecompositionTable(data, wxContext);
      case 'deleteDecompositionTable':
        return await deleteDecompositionTable(data, wxContext);
      case 'toggleDecompositionTableStatus':
        return await toggleDecompositionTableStatus(data, wxContext);

      // 分解表数据操作
      case 'getDecompositionData':
        return await getDecompositionData(data, wxContext);
      case 'saveDecompositionData':
        return await saveDecompositionData(data, wxContext);

      default:
        throw new Error(`未知的操作类型: ${action}`);
    }
  } catch (error) {
    console.error(`[annual-planning] ${action} 错误:`, error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};

// ==================== 维度管理 ====================

/**
 * 获取维度设置
 */
async function getDimensions(wxContext) {
  try {
    const result = await db.collection('goalSettings')
      .where({
        type: 'dimension'
      })
      .orderBy('createdAt', 'asc')
      .get();

    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    console.error('[getDimensions] 错误:', error);
    throw error;
  }
}

/**
 * 添加维度
 */
async function addDimension(data, wxContext) {
  const { dimensionName } = data;

  if (!dimensionName || !dimensionName.trim()) {
    throw new Error('维度名称不能为空');
  }

  // 检查维度名称是否已存在
  const existing = await db.collection('goalSettings')
    .where({
      type: 'dimension',
      name: dimensionName.trim()
    })
    .count();

  if (existing.total > 0) {
    throw new Error('该维度名称已存在');
  }

  const result = await db.collection('goalSettings').add({
    data: {
      type: 'dimension',
      name: dimensionName.trim(),
      attributes: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      createdBy: wxContext.OPENID
    }
  });

  return {
    success: true,
    data: {
      _id: result._id,
      name: dimensionName.trim()
    }
  };
}

/**
 * 更新维度
 */
async function updateDimension(data, wxContext) {
  const { dimensionId, dimensionName, attributes } = data;

  if (!dimensionId) {
    throw new Error('维度ID不能为空');
  }

  const updateData = {
    updatedAt: db.serverDate()
  };

  if (dimensionName !== undefined) {
    if (!dimensionName.trim()) {
      throw new Error('维度名称不能为空');
    }
    
    // 检查新名称是否与其他维度重复
    const existing = await db.collection('goalSettings')
      .where({
        type: 'dimension',
        name: dimensionName.trim(),
        _id: _.neq(dimensionId)
      })
      .count();

    if (existing.total > 0) {
      throw new Error('该维度名称已存在');
    }

    updateData.name = dimensionName.trim();
  }

  if (attributes !== undefined) {
    updateData.attributes = attributes;
  }

  await db.collection('goalSettings')
    .doc(dimensionId)
    .update({
      data: updateData
    });

  return {
    success: true,
    message: '维度更新成功'
  };
}

/**
 * 删除维度
 */
async function deleteDimension(data, wxContext) {
  const { dimensionId } = data;

  if (!dimensionId) {
    throw new Error('维度ID不能为空');
  }

  // 检查是否有分解表正在使用该维度
  const tablesUsingDimension = await db.collection('annualDecompositionTables')
    .where({
      $or: [
        { 'dimensions.firstLevel': dimensionId },
        { 'dimensions.secondLevel': dimensionId }
      ]
    })
    .count();

  if (tablesUsingDimension.total > 0) {
    throw new Error('该维度正在被分解表使用，无法删除');
  }

  await db.collection('goalSettings')
    .doc(dimensionId)
    .remove();

  return {
    success: true,
    message: '维度删除成功'
  };
}

/**
 * 清空所有维度
 */
async function clearDimensions(wxContext) {
  // 检查是否有分解表
  const tablesCount = await db.collection('annualDecompositionTables').count();
  
  if (tablesCount.total > 0) {
    throw new Error('存在分解表，无法清空维度设置');
  }

  // 获取所有维度
  const dimensions = await db.collection('goalSettings')
    .where({ type: 'dimension' })
    .get();

  // 删除所有维度
  const deletePromises = dimensions.data.map(dim => 
    db.collection('goalSettings').doc(dim._id).remove()
  );

  await Promise.all(deletePromises);

  return {
    success: true,
    message: '维度设置已清空'
  };
}

// ==================== 分解表管理 ====================

/**
 * 获取分解表列表
 */
async function getDecompositionTables(data, wxContext) {
  const { year } = data;
  
  const query = db.collection('annualDecompositionTables');
  
  if (year) {
    query.where({ year: parseInt(year) });
  }

  const result = await query
    .orderBy('year', 'desc')
    .orderBy('createdAt', 'desc')
    .get();

  return {
    success: true,
    data: result.data || []
  };
}

/**
 * 获取单个分解表详情
 */
async function getDecompositionTable(data, wxContext) {
  const { tableId } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  const result = await db.collection('annualDecompositionTables')
    .doc(tableId)
    .get();

  if (!result.data.length) {
    throw new Error('分解表不存在');
  }

  return {
    success: true,
    data: result.data[0]
  };
}

/**
 * 创建分解表
 */
async function createDecompositionTable(data, wxContext) {
  const { year, name, dimensions } = data;

  if (!year) {
    throw new Error('年份不能为空');
  }

  if (!name || !name.trim()) {
    throw new Error('分解表名称不能为空');
  }

  if (!dimensions || !dimensions.firstLevel) {
    throw new Error('必须选择一级维度');
  }

  // 检查同一年度是否已存在同名分解表
  const existing = await db.collection('annualDecompositionTables')
    .where({
      year: parseInt(year),
      name: name.trim()
    })
    .count();

  if (existing.total > 0) {
    throw new Error(`${year}年度已存在名为"${name}"的分解表`);
  }

  const result = await db.collection('annualDecompositionTables').add({
    data: {
      year: parseInt(year),
      name: name.trim(),
      dimensions: {
        firstLevel: dimensions.firstLevel,
        secondLevel: dimensions.secondLevel || null
      },
      isEnabled: true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      createdBy: wxContext.OPENID
    }
  });

  return {
    success: true,
    data: {
      _id: result._id,
      year: parseInt(year),
      name: name.trim()
    }
  };
}

/**
 * 更新分解表
 */
async function updateDecompositionTable(data, wxContext) {
  const { tableId, name, dimensions } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  const updateData = {
    updatedAt: db.serverDate()
  };

  if (name !== undefined) {
    if (!name.trim()) {
      throw new Error('分解表名称不能为空');
    }

    // 获取当前分解表信息
    const current = await db.collection('annualDecompositionTables')
      .doc(tableId)
      .get();

    if (!current.data.length) {
      throw new Error('分解表不存在');
    }

    // 检查同一年度是否已存在同名分解表
    const existing = await db.collection('annualDecompositionTables')
      .where({
        year: current.data[0].year,
        name: name.trim(),
        _id: _.neq(tableId)
      })
      .count();

    if (existing.total > 0) {
      throw new Error(`该年度已存在名为"${name}"的分解表`);
    }

    updateData.name = name.trim();
  }

  if (dimensions !== undefined) {
    if (!dimensions.firstLevel) {
      throw new Error('必须选择一级维度');
    }
    updateData.dimensions = {
      firstLevel: dimensions.firstLevel,
      secondLevel: dimensions.secondLevel || null
    };
  }

  await db.collection('annualDecompositionTables')
    .doc(tableId)
    .update({
      data: updateData
    });

  return {
    success: true,
    message: '分解表更新成功'
  };
}

/**
 * 删除分解表
 */
async function deleteDecompositionTable(data, wxContext) {
  const { tableId } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  // 删除分解表配置
  await db.collection('annualDecompositionTables')
    .doc(tableId)
    .remove();

  // 删除关联的分解数据
  const decompositionData = await db.collection('annualDecompositionData')
    .where({ tableId })
    .get();

  if (decompositionData.data.length > 0) {
    const deletePromises = decompositionData.data.map(item =>
      db.collection('annualDecompositionData').doc(item._id).remove()
    );
    await Promise.all(deletePromises);
  }

  return {
    success: true,
    message: '分解表删除成功'
  };
}

/**
 * 切换分解表启用状态
 */
async function toggleDecompositionTableStatus(data, wxContext) {
  const { tableId, isEnabled } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  await db.collection('annualDecompositionTables')
    .doc(tableId)
    .update({
      data: {
        isEnabled: !!isEnabled,
        updatedAt: db.serverDate()
      }
    });

  return {
    success: true,
    message: `分解表已${isEnabled ? '启用' : '禁用'}`
  };
}

// ==================== 分解表数据操作 ====================

/**
 * 获取分解表数据
 */
async function getDecompositionData(data, wxContext) {
  const { tableId } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  const result = await db.collection('annualDecompositionData')
    .where({ tableId })
    .get();

  return {
    success: true,
    data: result.data || []
  };
}

/**
 * 保存分解表数据
 */
async function saveDecompositionData(data, wxContext) {
  const { tableId, dataRows } = data;

  if (!tableId) {
    throw new Error('分解表ID不能为空');
  }

  if (!dataRows || !Array.isArray(dataRows)) {
    throw new Error('数据格式错误');
  }

  // 获取现有数据
  const existing = await db.collection('annualDecompositionData')
    .where({ tableId })
    .get();

  const existingMap = {};
  existing.data.forEach(item => {
    const key = `${item.firstLevelValue}_${item.secondLevelValue || ''}`;
    existingMap[key] = item._id;
  });

  // 批量更新或插入数据
  const operations = [];

  for (const row of dataRows) {
    const key = `${row.firstLevelValue}_${row.secondLevelValue || ''}`;
    const existingId = existingMap[key];

    if (existingId) {
      // 更新现有数据
      operations.push(
        db.collection('annualDecompositionData')
          .doc(existingId)
          .update({
            data: {
              values: row.values || {},
              updatedAt: db.serverDate()
            }
          })
      );
    } else {
      // 插入新数据
      operations.push(
        db.collection('annualDecompositionData').add({
          data: {
            tableId,
            firstLevelValue: row.firstLevelValue,
            secondLevelValue: row.secondLevelValue || null,
            values: row.values || {},
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
      );
    }
  }

  await Promise.all(operations);

  return {
    success: true,
    message: '数据保存成功'
  };
}
