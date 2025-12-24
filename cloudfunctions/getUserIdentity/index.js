// cloudfunctions/getUserIdentity/index.js
// ⭐ OpenID方案 - 个人开发者版（无需开放平台配置）
const cloud = require('wx-server-sdk');
cloud.init({ 
  env: cloud.DYNAMIC_CURRENT_ENV 
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  console.log('📱 getUserIdentity 调用 (OpenID方案)');

  try {
    // ⭐ 直接从云函数上下文获取 OpenID（无需 code2session）
    const openid = wxContext.OPENID;
    
    if (!openid) {
      throw new Error('无法获取用户OpenID');
    }

    console.log('✅ OpenID 获取成功:', openid);

    return {
      success: true,
      openid,
      message: 'OpenID获取成功'
    };

  } catch (error) {
    console.error('❌ getUserIdentity 错误:', error);
    return {
      success: false,
      message: error.message || '获取用户身份失败'
    };
  }
};
