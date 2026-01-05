// 云函数：获取任务列表
const cloud = require('wx-server-sdk');

exports.main = async (event, context) => {
  console.log('🔍 getTasks 函数被调用');
  
  try {
    // 初始化云开发
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const db = cloud.database();
    
    console.log('🔍 云开发初始化成功');
    
    // 获取微信上下文
    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;
    
    console.log('🔍 OpenID:', openId);
    
    if (!openId) {
      return {
        success: false,
        message: '用户未登录'
      };
    }
    
    // 🔧 简化：直接查询任务表，暂时不查询用户信息
    console.log('🔍 开始查询任务...');
    const tasksRes = await db.collection('tasks')
      .where({
        _openid: openId
      })
      .limit(10)
      .get();
    
    console.log('🔍 查询到任务数量:', tasksRes.data.length);

    return {
      success: true,
      tasks: tasksRes.data
    };
  } catch (err) {
    console.error('❌ 查询失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};
