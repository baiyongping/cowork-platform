// 云函数：获取用户信息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 通过openid查询用户信息
    const userRes = await db.collection('users')
      .where({ wxOpenId: openId })
      .get();

    if (!userRes.data.length) {
      return {
        success: false,
        message: '用户未绑定',
        openId
      };
    }

    const user = userRes.data[0];

    return {
      success: true,
      userInfo: {
        name: user.name || '未设置',
        role: user.role || '员工',
        department: user.department || '未分配',
        avatarUrl: user.avatarUrl || '',
        phone: user.phone || ''
      }
    };
  } catch (err) {
    console.error('查询用户信息失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};
