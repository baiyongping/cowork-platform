// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 目标分解表管理云函数
 * 操作: create, list, update, delete, get, toggleStatus
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createTable(data, wxContext);
      case 'list':
        return await listTables(data);
      case 'get':
        return await getTable(data);
      case 'update':
        return await updateTable(data, wxContext);
      case 'delete':
        return await deleteTable(data);
      case 'toggleStatus':
        return await toggleTableStatus(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[decomposition-tables] ${action} error:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 创建分解表
 */
async function createTable(data, wxContext) {
  const { name, horizontalDimension, verticalDimension, unit, showRowTotal, showColumnTotal } = data;

  // 1. 校验必填字段
  if (!name?.trim()) {
    throw new Error('表名不能为空');
  }
  
  // 验证一级横轴维度
  if (!horizontalDimension?.primary?.dimensionId || 
      !horizontalDimension?.primary?.dimensionName || 
      !horizontalDimension?.primary?.values?.length) {
    throw new Error('一级横轴维度配置不完整');
  }
  
  // 验证一级纵轴维度
  if (!verticalDimension?.primary?.dimensionId || 
      !verticalDimension?.primary?.dimensionName || 
      !verticalDimension?.primary?.values?.length) {
    throw new Error('一级纵轴维度配置不完整');
  }
  
  // 如果有二级横轴维度，验证其完整性
  if (horizontalDimension?.secondary) {
    if (!horizontalDimension.secondary.dimensionId || 
        !horizontalDimension.secondary.dimensionName || 
        !horizontalDimension.secondary.values?.length) {
      throw new Error('二级横轴维度配置不完整');
    }
  }
  
  // 如果有二级纵轴维度，验证其完整性
  if (verticalDimension?.secondary) {
    if (!verticalDimension.secondary.dimensionId || 
        !verticalDimension.secondary.dimensionName || 
        !verticalDimension.secondary.values?.length) {
      throw new Error('二级纵轴维度配置不完整');
    }
  }
  
  if (!unit?.trim()) {
    throw new Error('单位不能为空');
  }

  // 2. 检查表名唯一性
  const existingTable = await db.collection('decompositionTables')
    .where({ name: name.trim() })
    .count();

  if (existingTable.total > 0) {
    throw new Error(`表名"${name}"已存在，请使用其他名称`);
  }

  // 3. 创建分解表
  const now = new Date();
  const tableData = {
    name: name.trim(),
    horizontalDimension: {
      primary: horizontalDimension.primary
    },
    verticalDimension: {
      primary: verticalDimension.primary
    },
    unit: unit.trim(),
    showRowTotal: showRowTotal === true,
    showColumnTotal: showColumnTotal === true,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
    createdBy: wxContext.OPENID
  };
  
  // 添加二级维度（如果有）
  if (horizontalDimension.secondary) {
    tableData.horizontalDimension.secondary = horizontalDimension.secondary;
  }
  if (verticalDimension.secondary) {
    tableData.verticalDimension.secondary = verticalDimension.secondary;
  }
  
  const result = await db.collection('decompositionTables').add({
    data: tableData
  });

  return {
    success: true,
    data: {
      _id: result._id,
      message: '分解表创建成功'
    }
  };
}

/**
 * 查询分解表列表
 */
async function listTables(data) {
  const { page = 1, limit = 20, keyword } = data || {};

  // 构建查询条件
  const query = {};
  if (keyword?.trim()) {
    query.name = db.RegExp({
      regexp: keyword.trim(),
      options: 'i'
    });
  }

  // 查询数据
  const result = await db.collection('decompositionTables')
    .where(query)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  // 查询总数
  const countResult = await db.collection('decompositionTables')
    .where(query)
    .count();

  return {
    success: true,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      limit
    }
  };
}

/**
 * 获取单个分解表详情
 */
async function getTable(data) {
  const { id } = data;

  if (!id) {
    throw new Error('缺少分解表ID');
  }

  const result = await db.collection('decompositionTables')
    .doc(id)
    .get();

  if (!result.data) {
    throw new Error('分解表不存在');
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * 更新分解表
 */
async function updateTable(data, wxContext) {
  const { id, name, horizontalDimension, verticalDimension, unit, showRowTotal, showColumnTotal } = data;

  if (!id) {
    throw new Error('缺少分解表ID');
  }

  // 1. 校验必填字段
  if (!name?.trim()) {
    throw new Error('表名不能为空');
  }
  
  // 验证一级横轴维度
  if (!horizontalDimension?.primary?.dimensionId || 
      !horizontalDimension?.primary?.dimensionName || 
      !horizontalDimension?.primary?.values?.length) {
    throw new Error('一级横轴维度配置不完整');
  }
  
  // 验证一级纵轴维度
  if (!verticalDimension?.primary?.dimensionId || 
      !verticalDimension?.primary?.dimensionName || 
      !verticalDimension?.primary?.values?.length) {
    throw new Error('一级纵轴维度配置不完整');
  }
  
  // 如果有二级横轴维度，验证其完整性
  if (horizontalDimension?.secondary) {
    if (!horizontalDimension.secondary.dimensionId || 
        !horizontalDimension.secondary.dimensionName || 
        !horizontalDimension.secondary.values?.length) {
      throw new Error('二级横轴维度配置不完整');
    }
  }
  
  // 如果有二级纵轴维度，验证其完整性
  if (verticalDimension?.secondary) {
    if (!verticalDimension.secondary.dimensionId || 
        !verticalDimension.secondary.dimensionName || 
        !verticalDimension.secondary.values?.length) {
      throw new Error('二级纵轴维度配置不完整');
    }
  }
  
  if (!unit?.trim()) {
    throw new Error('单位不能为空');
  }

  // 2. 检查表名唯一性（排除自身）
  const existingTable = await db.collection('decompositionTables')
    .where({
      name: name.trim(),
      _id: _.neq(id)
    })
    .count();

  if (existingTable.total > 0) {
    throw new Error(`表名"${name}"已存在，请使用其他名称`);
  }

  // 3. 更新分解表
  const updateData = {
    name: name.trim(),
    horizontalDimension: {
      primary: horizontalDimension.primary
    },
    verticalDimension: {
      primary: verticalDimension.primary
    },
    unit: unit.trim(),
    showRowTotal: showRowTotal === true,
    showColumnTotal: showColumnTotal === true,
    updatedAt: new Date()
  };
  
  // 添加二级维度（如果有）
  if (horizontalDimension.secondary) {
    updateData.horizontalDimension.secondary = horizontalDimension.secondary;
  }
  if (verticalDimension.secondary) {
    updateData.verticalDimension.secondary = verticalDimension.secondary;
  }
  
  const result = await db.collection('decompositionTables')
    .doc(id)
    .update({
      data: updateData
    });

  if (result.stats.updated === 0) {
    throw new Error('分解表不存在或更新失败');
  }

  return {
    success: true,
    data: {
      message: '分解表更新成功'
    }
  };
}

/**
 * 删除分解表
 */
async function deleteTable(data) {
  const { id } = data;

  if (!id) {
    throw new Error('缺少分解表ID');
  }

  const result = await db.collection('decompositionTables')
    .doc(id)
    .remove();

  if (result.stats.removed === 0) {
    throw new Error('分解表不存在或删除失败');
  }

  return {
    success: true,
    data: {
      message: '分解表删除成功'
    }
  };
}

/**
 * 切换分解表启用/禁用状态
 */
async function toggleTableStatus(data) {
  const { id } = data;

  if (!id) {
    throw new Error('缺少分解表ID');
  }

  // 1. 获取当前状态
  const table = await db.collection('decompositionTables')
    .doc(id)
    .get();

  if (!table.data) {
    throw new Error('分解表不存在');
  }

  // 2. 切换状态
  const newStatus = !table.data.isEnabled;
  const result = await db.collection('decompositionTables')
    .doc(id)
    .update({
      data: {
        isEnabled: newStatus,
        updatedAt: new Date()
      }
    });

  if (result.stats.updated === 0) {
    throw new Error('状态切换失败');
  }

  return {
    success: true,
    data: {
      isEnabled: newStatus,
      message: `分解表已${newStatus ? '启用' : '禁用'}`
    }
  };
}
