// 云函数：获取用户信息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 🔧 修复：通过 openid 字段查询用户信息（注册时保存的字段）
    const userRes = await db.collection('users')
      .where({ openid: openId })
      .get();

    if (!userRes.data.length) {
      return {
        success: false,
        message: '用户未绑定',
        openId
      };
    }

    const user = userRes.data[0];
    
    // 🔧 修复：返回完整的用户信息
    return {
      success: true,
      userInfo: {
        name: user.name || '未设置',
        role: user.role || '',
        roles: user.roles || [],
        department: user.department || '未分配',
        departments: user.departments || [],
        avatarUrl: user.avatarUrl || '',
        phone: user.phone || '',
        position: user.position || '',
        status: user.status || '在职',
        approvalStatus: user.approvalStatus || 'pending'
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
