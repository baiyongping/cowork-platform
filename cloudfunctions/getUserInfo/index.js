// 云函数：获取用户信息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('🔍 getUserInfo 函数被调用');
  
  const wxContext = cloud.getWXContext();
  console.log('🔍 wxContext:', wxContext);
  
  const openId = wxContext.OPENID;
  console.log('🔍 openId:', openId, typeof openId);

  try {
    // 🔧 修复：如果 openId 不存在，直接返回
    if (!openId) {
      console.log('❌ openId 为空');
      return {
        success: false,
        message: '用户未登录',
        openId
      };
    }
    
    console.log('🔍 开始查询用户...');
    // 🔧 修复：通过 wechatOpenId 字段查询用户信息
    const userRes = await db.collection('users')
      .where({ wechatOpenId: openId })
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
