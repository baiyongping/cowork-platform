/**
 * 为 users 集合创建 UnionID 唯一索引
 * 
 * 使用方法：
 * 1. 在云开发控制台 > 数据库 > 集合 users
 * 2. 点击"索引"标签
 * 3. 点击"添加索引"
 * 4. 使用以下配置
 */

const indexConfig = {
  name: 'unionid_unique',
  keys: {
    unionid: 1
  },
  options: {
    unique: true,
    sparse: true,  // 允许空值，兼容旧数据
    background: true
  }
};

console.log('UnionID 索引配置:');
console.log(JSON.stringify(indexConfig, null, 2));

/**
 * 或者使用云函数创建索引：
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 创建 UnionID 唯一索引
    await db.collection('users').createIndex({
      keys: { unionid: 1 },
      options: {
        unique: true,
        sparse: true,
        name: 'unionid_unique',
        background: true
      }
    });

    console.log('✅ UnionID 索引创建成功');
    
    return {
      success: true,
      message: 'UnionID 索引创建成功'
    };
  } catch (error) {
    console.error('❌ 索引创建失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
