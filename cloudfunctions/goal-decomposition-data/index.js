// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'query':
        return await query(data, wxContext);
      case 'batchSave':
        return await batchSave(data, wxContext);
      case 'delete':
        return await deleteData(data, wxContext);
      default:
        return {
          success: false,
          error: '未知操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 查询目标分解数据
 */
async function query(data, wxContext) {
  try {
    const { goalTypeId, tableIds, year } = data;  // 🆕 添加 year 参数

    if (!goalTypeId) {
      return {
        success: false,
        error: '缺少必要参数 goalTypeId'
      };
    }

    // 构建查询条件
    const where = { goalTypeId };
    
    // 🆕 添加年度过滤（如果提供）
    if (year) {
      where.year = year;
    }
    
    if (tableIds && tableIds.length > 0) {
      where.tableId = _.in(tableIds);
    }

    // 查询数据
    const result = await db.collection('goalDecompositionData')
      .where(where)
      .orderBy('tableId', 'asc')
      .orderBy('rowIndex', 'asc')
      .orderBy('colIndex', 'asc')
      .get();

    return {
      success: true,
      data: {
        list: result.data,
        total: result.data.length
      }
    };
  } catch (error) {
    console.error('查询失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 批量保存目标分解数据
 */
async function batchSave(data, wxContext) {
  try {
    const { goalTypeId, year, items } = data;  // 🆕 添加 year 参数

    if (!goalTypeId || !items || items.length === 0) {
      return {
        success: false,
        error: '缺少必要参数'
      };
    }

    const timestamp = new Date();
    let successCount = 0;
    let failCount = 0;

    // 逐个保存数据项
    for (const item of items) {
      try {
        // 🆕 检查条件增加年度
        const where = {
          goalTypeId,
          tableId: item.tableId,
          rowIndex: item.rowIndex,
          colIndex: item.colIndex
        };
        
        // 🆕 如果提供了年度，添加年度过滤
        if (year) {
          where.year = year;
        }
        
        // 检查是否已存在
        const existing = await db.collection('goalDecompositionData')
          .where(where)
          .get();

        if (existing.data.length > 0) {
          // 更新现有数据
          await db.collection('goalDecompositionData')
            .doc(existing.data[0]._id)
            .update({
              data: {
                value: item.value,
                rowValue: item.rowValue,
                colValue: item.colValue,
                updatedAt: timestamp,
                updatedBy: wxContext.OPENID
              }
            });
        } else {
          // 创建新数据
          const newData = {
            goalTypeId,
            tableId: item.tableId,
            tableName: item.tableName,
            rowDimensionId: item.rowDimensionId,
            rowDimensionName: item.rowDimensionName,
            rowValue: item.rowValue,
            rowIndex: item.rowIndex,
            colDimensionId: item.colDimensionId,
            colDimensionName: item.colDimensionName,
            colValue: item.colValue,
            colIndex: item.colIndex,
            value: item.value,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: wxContext.OPENID,
            updatedBy: wxContext.OPENID
          };
          
          // 🆕 如果提供了年度，添加年度字段
          if (year) {
            newData.year = year;
          }
          
          await db.collection('goalDecompositionData')
            .add({
              data: newData
            });
        }
        successCount++;
      } catch (err) {
        console.error('保存单项失败:', err);
        failCount++;
      }
    }

    return {
      success: true,
      data: {
        successCount,
        failCount,
        total: items.length
      }
    };
  } catch (error) {
    console.error('批量保存失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 删除目标分解数据
 */
async function deleteData(data, wxContext) {
  try {
    const { _id, goalTypeId, tableId } = data;

    if (_id) {
      // 删除单条数据
      await db.collection('goalDecompositionData')
        .doc(_id)
        .remove();
    } else if (goalTypeId && tableId) {
      // 删除指定表的所有数据
      await db.collection('goalDecompositionData')
        .where({
          goalTypeId,
          tableId
        })
        .remove();
    } else if (goalTypeId) {
      // 删除指定目标类型的所有数据
      await db.collection('goalDecompositionData')
        .where({
          goalTypeId
        })
        .remove();
    } else {
      return {
        success: false,
        error: '缺少必要参数'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('删除失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
