// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 分解表配置管理云函数
 * 管理目标类型与多个分解表的关联关系
 * 操作: saveConfig, getConfig, listByGoalType, reorderTables
 */
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'saveConfig':
        return await saveConfig(data, wxContext);
      case 'getConfig':
        return await getConfig(data);
      case 'listByGoalType':
        return await listByGoalType(data);
      case 'reorderTables':
        return await reorderTables(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`[decomposition-table-configs] ${action} error:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 保存分解表配置(创建或更新)
 */
async function saveConfig(data, wxContext) {
  const { goalTypeId, goalTypeName, tables } = data;

  // 1. 校验必填字段
  if (!goalTypeId || !goalTypeName) {
    throw new Error('目标类型信息不完整');
  }

  if (!Array.isArray(tables) || tables.length === 0) {
    throw new Error('至少需要关联一个分解表');
  }

  // 2. 验证所有表ID存在
  const tableIds = tables.map(t => t.tableId);
  const existingTables = await db.collection('decompositionTables')
    .where({
      _id: _.in(tableIds)
    })
    .field({ _id: true, name: true })
    .get();

  if (existingTables.data.length !== tableIds.length) {
    throw new Error('部分分解表不存在');
  }

  // 3. 检查是否已存在配置
  const existingConfig = await db.collection('decompositionTableConfigs')
    .where({ goalTypeId })
    .get();

  const now = new Date();

  // 4. 如果存在则更新,否则创建
  if (existingConfig.data.length > 0) {
    const result = await db.collection('decompositionTableConfigs')
      .doc(existingConfig.data[0]._id)
      .update({
        data: {
          goalTypeName,
          tables: tables.map((t, index) => ({
            tableId: t.tableId,
            tableName: t.tableName,
            sortOrder: index
          })),
          updatedAt: now
        }
      });

    if (result.stats.updated === 0) {
      throw new Error('配置更新失败');
    }

    return {
      success: true,
      data: {
        _id: existingConfig.data[0]._id,
        message: '分解表配置已更新'
      }
    };
  } else {
    const result = await db.collection('decompositionTableConfigs').add({
      data: {
        goalTypeId,
        goalTypeName,
        tables: tables.map((t, index) => ({
          tableId: t.tableId,
          tableName: t.tableName,
          sortOrder: index
        })),
        createdAt: now,
        updatedAt: now,
        createdBy: wxContext.OPENID
      }
    });

    return {
      success: true,
      data: {
        _id: result._id,
        message: '分解表配置创建成功'
      }
    };
  }
}

/**
 * 获取指定目标类型的分解表配置
 */
async function getConfig(data) {
  const { goalTypeId } = data;

  if (!goalTypeId) {
    throw new Error('缺少目标类型ID');
  }

  const result = await db.collection('decompositionTableConfigs')
    .where({ goalTypeId })
    .get();

  if (result.data.length === 0) {
    return {
      success: true,
      data: null
    };
  }

  return {
    success: true,
    data: result.data[0]
  };
}

/**
 * 查询指定目标类型关联的所有启用的分解表(含表详情)
 */
async function listByGoalType(data) {
  const { goalTypeId } = data;

  if (!goalTypeId) {
    throw new Error('缺少目标类型ID');
  }

  // 1. 获取配置
  const config = await db.collection('decompositionTableConfigs')
    .where({ goalTypeId })
    .get();

  if (config.data.length === 0 || !config.data[0].tables.length) {
    return {
      success: true,
      data: []
    };
  }

  // 2. 获取所有关联表的详情
  const tableIds = config.data[0].tables.map(t => t.tableId);
  const tablesData = await db.collection('decompositionTables')
    .where({
      _id: _.in(tableIds),
      isEnabled: true // 只返回启用的表
    })
    .get();

  // 3. 按sortOrder排序并合并数据
  const tableMap = new Map(tablesData.data.map(t => [t._id, t]));
  const sortedTables = config.data[0].tables
    .filter(t => tableMap.has(t.tableId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(t => ({
      ...tableMap.get(t.tableId),
      sortOrder: t.sortOrder
    }));

  return {
    success: true,
    data: sortedTables
  };
}

/**
 * 重新排序分解表
 */
async function reorderTables(data) {
  const { goalTypeId, tableOrders } = data;

  if (!goalTypeId) {
    throw new Error('缺少目标类型ID');
  }

  if (!Array.isArray(tableOrders) || tableOrders.length === 0) {
    throw new Error('排序信息不完整');
  }

  // 1. 获取现有配置
  const config = await db.collection('decompositionTableConfigs')
    .where({ goalTypeId })
    .get();

  if (config.data.length === 0) {
    throw new Error('配置不存在');
  }

  // 2. 更新排序
  const updatedTables = config.data[0].tables.map(table => {
    const newOrder = tableOrders.find(o => o.tableId === table.tableId);
    return {
      ...table,
      sortOrder: newOrder ? newOrder.sortOrder : table.sortOrder
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);

  const result = await db.collection('decompositionTableConfigs')
    .doc(config.data[0]._id)
    .update({
      data: {
        tables: updatedTables,
        updatedAt: new Date()
      }
    });

  if (result.stats.updated === 0) {
    throw new Error('排序更新失败');
  }

  return {
    success: true,
    data: {
      message: '排序已更新'
    }
  };
}
