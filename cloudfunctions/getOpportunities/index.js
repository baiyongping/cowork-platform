// 云函数：获取商机列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 1. 通过openid查询用户信息
    const userRes = await db.collection('users')
      .where({ wxOpenId: openId })
      .field({ _id: true, name: true })
      .get();

    if (!userRes.data.length) {
      return {
        success: false,
        message: '用户未绑定'
      };
    }

    const userId = userRes.data[0]._id;

    // 2. 查询用户的商机
    const opportunitiesRes = await db.collection('opportunities')
      .where({
        isDeleted: false,
        owner: userId
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const opportunities = opportunitiesRes.data.map(opp => ({
      _id: opp._id,
      name: opp.name,
      customerName: opp.customerName || '未填写',
      estimatedAmount: (opp.estimatedAmount || 0).toLocaleString(),
      stage: opp.stage || '初步接触'
    }));

    return {
      success: true,
      opportunities
    };
  } catch (err) {
    console.error('查询商机失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};
