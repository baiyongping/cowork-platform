// cloudfunctions/checkUserExists/index.js
const cloud = require('wx-server-sdk');
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV 
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { unionid, openid } = event;
  
  console.log('🔍 checkUserExists 调用:', { unionid, openid });

  try {
    let query = {};
    
    // 优先使用 unionid 查询（如果有）
    if (unionid) {
      query.unionid = unionid;
    } else if (openid) {
      // 如果没有 unionid，使用 openid 查询（兼容旧数据）
      query.openid = openid;
    } else {
      return {
        success: false,
        code: 400,
        message: '请提供 unionid 或 openid'
      };
    }

    const result = await db.collection('users')
      .where(query)
      .limit(1)
      .get();

    const exists = result.data.length > 0;
    const user = result.data[0] || null;

    console.log('✅ 查询结果:', { exists, userId: user?._id });

    return {
      success: true,
      code: 200,
      data: {
        exists,
        user
      }
    };

  } catch (error) {
    console.error('❌ checkUserExists 错误:', error);
    return {
      success: false,
      code: 500,
      message: error.message || '查询失败'
    };
  }
};
