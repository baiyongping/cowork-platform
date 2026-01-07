/**
 * 目标分解维度管理云函数
 * 负责维度的CRUD操作和排序
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  // 兼容两种调用方式:
  // 方式1: { action: 'list', ...params }
  // 方式2: { action: 'list', data: { ...params } }
  const action = event.action;
  const data = event.data || event; // 如果没有 data 字段，就使用整个 event
  const wxContext = cloud.getWXContext();
  
  console.log('🔍 [云函数入口] action:', action);
  console.log('🔍 [云函数入口] data:', JSON.stringify(data, null, 2));
  console.log('🔍 [云函数入口] event:', JSON.stringify(event, null, 2));

  try {
    switch (action) {
      case 'list':
        return await listDimensions(data);
      case 'get':
        return await getDimension(data);
      case 'create':
        return await createDimension(data, wxContext);
      case 'update':
        return await updateDimension(data, wxContext);
      case 'delete':
        return await deleteDimension(data, wxContext);
      case 'updateOrder':
        return await updateDimensionOrder(data, wxContext);
      case 'toggleStatus':
        return await toggleDimensionStatus(data, wxContext);
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
 * 获取维度列表
 */
async function listDimensions(data) {
  const { status = 'active', keyword } = data || {};

  let query = db.collection('goalDecompositionDimensions');

  // 状态筛选
  if (status !== 'all') {
    query = query.where({ status });
  }

  // 关键词搜索
  if (keyword) {
    query = query.where({
      dimensionName: db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    });
  }

  const result = await query
    .orderBy('createdAt', 'desc')
    .get();

  console.log('✅ [列表查询] 原始查询结果:', {
    total: result.data.length,
    sample: result.data[0]
  });

  // 🔄 转换数据格式: GoalDecompositionDimension -> DecompositionDimension
  const transformedData = result.data.map(dim => {
    const items = [];
    
    // 添加一级维度项
    if (dim.level1Items && dim.level1Items.length > 0) {
      dim.level1Items.forEach((name, index) => {
        items.push({
          id: `level1_${index}`,
          name: name,
          status: 'active'
        });
      });
    }
    
    // 如果有二级维度项,也添加进去
    if (dim.hasLevel2 && dim.level2Items && dim.level2Items.length > 0) {
      dim.level2Items.forEach((name, index) => {
        items.push({
          id: `level2_${index}`,
          name: name,
          status: 'active'
        });
      });
    }

    return {
      _id: dim._id,
      name: dim.dimensionName,
      description: `${dim.hasLevel2 ? '二级' : '一级'}维度，包含 ${items.length} 个选项`,
      items: items,
      status: dim.status,
      createdBy: dim.createdBy,
      createdAt: dim.createdAt,
      updatedAt: dim.updatedAt
    };
  });

  console.log('✅ [列表查询] 转换后的数据:', {
    total: transformedData.length,
    sample: transformedData[0]
  });

  return {
    success: true,
    data: transformedData
  };
}

/**
 * 获取单个维度详情
 */
async function getDimension(data) {
  const { dimensionId } = data;

  const result = await db.collection('goalDecompositionDimensions')
    .doc(dimensionId)
    .get();

  if (!result.data) {
    throw new Error('维度不存在');
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * 创建维度
 */
async function createDimension(data, wxContext) {
  const {
    dimensionName,
    level1Items,
    hasLevel2 = false,
    level2Items = []
  } = data;

  // 数据验证
  if (!dimensionName || !dimensionName.trim()) {
    throw new Error('维度名称不能为空');
  }

  if (!level1Items || level1Items.length === 0) {
    throw new Error('一级维度项不能为空');
  }

  if (hasLevel2 && (!level2Items || level2Items.length === 0)) {
    throw new Error('启用二级维度时，二级维度项不能为空');
  }

  // 检查重名
  const existingResult = await db.collection('goalDecompositionDimensions')
    .where({
      dimensionName: dimensionName.trim()
    })
    .count();

  if (existingResult.total > 0) {
    throw new Error('该维度名称已存在');
  }

  // 创建维度
  const dimension = {
    dimensionName: dimensionName.trim(),
    level1Items: level1Items.map(item => item.trim()),
    level1Order: level1Items.map((_, index) => index),
    hasLevel2,
    level2Items: hasLevel2 ? level2Items.map(item => item.trim()) : [],
    level2Order: hasLevel2 ? level2Items.map((_, index) => index) : [],
    status: 'active',
    usageCount: 0,
    createdBy: wxContext.OPENID,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('goalDecompositionDimensions')
    .add({
      data: dimension
    });

  return {
    success: true,
    data: {
      _id: result._id,
      ...dimension
    },
    message: '维度创建成功'
  };
}

/**
 * 更新维度
 */
async function updateDimension(data, wxContext) {
  const {
    dimensionId,
    dimensionName,
    level1Items,
    hasLevel2,
    level2Items
  } = data;

  // 检查维度是否存在
  const existingResult = await db.collection('goalDecompositionDimensions')
    .doc(dimensionId)
    .get();

  if (!existingResult.data) {
    throw new Error('维度不存在');
  }

  // 检查重名（排除自己）
  if (dimensionName) {
    const duplicateResult = await db.collection('goalDecompositionDimensions')
      .where({
        dimensionName: dimensionName.trim(),
        _id: _.neq(dimensionId)
      })
      .count();

    if (duplicateResult.total > 0) {
      throw new Error('该维度名称已存在');
    }
  }

  // 构建更新数据
  const updateData = {
    updatedAt: new Date()
  };

  if (dimensionName) {
    updateData.dimensionName = dimensionName.trim();
  }

  if (level1Items) {
    updateData.level1Items = level1Items.map(item => item.trim());
    updateData.level1Order = level1Items.map((_, index) => index);
  }

  if (typeof hasLevel2 !== 'undefined') {
    updateData.hasLevel2 = hasLevel2;
  }

  if (level2Items) {
    updateData.level2Items = level2Items.map(item => item.trim());
    updateData.level2Order = level2Items.map((_, index) => index);
  }

  // 更新维度
  await db.collection('goalDecompositionDimensions')
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
 * 删除或停用维度
 */
async function deleteDimension(data, wxContext) {
  const { dimensionId } = data;

  // 检查维度是否存在
  const dimensionResult = await db.collection('goalDecompositionDimensions')
    .doc(dimensionId)
    .get();

  if (!dimensionResult.data) {
    throw new Error('维度不存在');
  }

  const dimension = dimensionResult.data;

  // 检查是否被使用
  const usageResult = await db.collection('goalDecompositions')
    .where({
      dimensionIds: dimensionId
    })
    .count();

  if (usageResult.total > 0) {
    // 已被使用，只能停用
    await db.collection('goalDecompositionDimensions')
      .doc(dimensionId)
      .update({
        data: {
          status: 'inactive',
          updatedAt: new Date()
        }
      });

    return {
      success: true,
      message: '该维度已被使用，已停用但保留数据',
      action: 'deactivated'
    };
  } else {
    // 未被使用，可以删除
    await db.collection('goalDecompositionDimensions')
      .doc(dimensionId)
      .remove();

    return {
      success: true,
      message: '维度删除成功',
      action: 'deleted'
    };
  }
}

/**
 * 更新维度项排序
 */
async function updateDimensionOrder(data, wxContext) {
  const { dimensionId, level, newOrder } = data;

  // level: 'level1' | 'level2'
  // newOrder: [0, 2, 1, 3] 新的排序索引数组

  const updateData = {
    updatedAt: new Date()
  };

  if (level === 'level1') {
    updateData.level1Order = newOrder;
  } else if (level === 'level2') {
    updateData.level2Order = newOrder;
  } else {
    throw new Error('无效的层级参数');
  }

  await db.collection('goalDecompositionDimensions')
    .doc(dimensionId)
    .update({
      data: updateData
    });

  return {
    success: true,
    message: '排序更新成功'
  };
}

/**
 * 切换维度状态
 */
async function toggleDimensionStatus(data, wxContext) {
  const { dimensionId, status } = data;

  await db.collection('goalDecompositionDimensions')
    .doc(dimensionId)
    .update({
      data: {
        status,
        updatedAt: new Date()
      }
    });

  return {
    success: true,
    message: `维度已${status === 'active' ? '启用' : '停用'}`
  };
}
