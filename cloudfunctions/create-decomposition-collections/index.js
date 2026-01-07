// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 创建目标分解多表功能所需的数据库集合
 * 一次性运行,创建后可删除此云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const results = [];

  try {
    // 1. 创建 decompositionTables 集合
    try {
      await db.createCollection('decompositionTables');
      results.push('✅ decompositionTables 集合创建成功');
      console.log('✅ decompositionTables 集合创建成功');
    } catch (error) {
      if (error.message.includes('exists')) {
        results.push('ℹ️ decompositionTables 集合已存在');
      } else {
        throw error;
      }
    }

    // 2. 创建 decompositionTableConfigs 集合  
    try {
      await db.createCollection('decompositionTableConfigs');
      results.push('✅ decompositionTableConfigs 集合创建成功');
      console.log('✅ decompositionTableConfigs 集合创建成功');
    } catch (error) {
      if (error.message.includes('exists')) {
        results.push('ℹ️ decompositionTableConfigs 集合已存在');
      } else {
        throw error;
      }
    }

    // 3. 等待集合创建完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 创建示例维度数据 (可选)
    const existingDimensions = await db.collection('decompositionDimensions')
      .where({ isActive: true })
      .count();

    if (existingDimensions.total === 0) {
      // 创建默认维度
      const defaultDimensions = [
        {
          name: '时间维度',
          type: 'time',
          description: '按季度划分',
          isActive: true,
          sortOrder: 1,
          options: ['Q1', 'Q2', 'Q3', 'Q4'],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: wxContext.OPENID
        },
        {
          name: '部门维度',
          type: 'department',
          description: '按销售部门划分',
          isActive: true,
          sortOrder: 2,
          options: ['销售一部', '销售二部', '销售三部', '销售四部', '销售五部'],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: wxContext.OPENID
        },
        {
          name: '区域维度',
          type: 'region',
          description: '按销售区域划分',
          isActive: true,
          sortOrder: 3,
          options: ['华北区', '华东区', '华南区', '西南区', '东北区'],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: wxContext.OPENID
        }
      ];

      for (const dim of defaultDimensions) {
        try {
          await db.collection('decompositionDimensions').add({
            data: dim
          });
          results.push(`✅ 默认维度 "${dim.name}" 创建成功`);
        } catch (error) {
          results.push(`⚠️ 维度 "${dim.name}" 创建失败: ${error.message}`);
        }
      }
    } else {
      results.push(`ℹ️ 已有 ${existingDimensions.total} 个维度,跳过默认维度创建`);
    }

    return {
      success: true,
      message: '数据库集合创建成功',
      results: results,
      summary: {
        operator: wxContext.OPENID,
        timestamp: new Date().toISOString(),
        collectionsCreated: [
          'decompositionTables',
          'decompositionTableConfigs'
        ]
      }
    };
  } catch (error) {
    console.error('创建集合失败:', error);
    return {
      success: false,
      error: error.message,
      results: results
    };
  }
};
