const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { code } = event;
  
  if (!code) {
    return {
      success: false,
      error: '缺少code参数'
    };
  }

  const appId = 'wx79afc92f6fe01a31';
  const appSecret = '2369d777cb90f5c22d27bc0c00d3939e';

  try {
    // 使用code换取OpenID
    const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
      params: {
        appid: appId,
        secret: appSecret,
        code: code,
        grant_type: 'authorization_code'
      }
    });

    if (response.data.errcode) {
      return {
        success: false,
        error: response.data.errmsg || '获取OpenID失败'
      };
    }

    return {
      success: true,
      openid: response.data.openid,
      unionid: response.data.unionid // 如果有的话
    };

  } catch (error) {
    console.error('获取OpenID失败:', error);
    return {
      success: false,
      error: error.message || '获取OpenID失败'
    };
  }
};
