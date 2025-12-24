/**
 * 为users集合创建UnionID唯一索引
 * 执行方式：在CloudBase控制台的云函数中运行此脚本
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: 'jihua-oa-dev-3goht9irae4d949f' });

const db = cloud.database();

async function createUnionIdIndex() {
  try {
    console.log('开始创建 unionid 唯一索引...');
    
    // 创建 unionid 的唯一索引
    const result = await db.collection('users').createIndex({
      keys: [{
        name: 'unionid',
        direction: '1'
      }],
      indexName: 'unionid_unique',
      unique: true,
      sparse: true  // 允许没有unionid字段的文档存在（兼容旧数据）
    });
    
    console.log('✅ unionid 唯一索引创建成功:', result);
    
    return {
      success: true,
      message: 'unionid索引创建成功',
      result
    };
    
  } catch (error) {
    console.error('❌ 索引创建失败:', error);
    
    // 如果索引已存在，返回成功
    if (error.message && error.message.includes('already exists')) {
      return {
        success: true,
        message: 'unionid索引已存在',
        error: error.message
      };
    }
    
    return {
      success: false,
      message: '索引创建失败',
      error: error.message
    };
  }
}

// 导出为云函数
exports.main = async (event, context) => {
  return await createUnionIdIndex();
};

// 本地测试
if (require.main === module) {
  createUnionIdIndex().then(console.log).catch(console.error);
}
