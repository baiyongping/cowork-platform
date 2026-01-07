const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// ⚠️ 重要：需要在微信开放平台配置以下信息
const WECHAT_CONFIG = {
  appid: process.env.WECHAT_OPEN_APPID || 'your_wechat_open_appid',  // 微信开放平台 AppID
  secret: process.env.WECHAT_OPEN_SECRET || 'your_wechat_open_secret'  // 微信开放平台 AppSecret
};

/**
 * 微信网页授权云函数
 * 
 * 功能：
 * 1. 生成微信授权 URL
 * 2. 用 code 换取 access_token 和 openid
 * 3. 获取用户信息（可选）
 * 
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型：'getAuthUrl' | 'getOpenId' | 'getUserInfo'
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'getAuthUrl':
        return await getAuthUrl(event);
      
      case 'getOpenId':
        return await getOpenId(event);
      
      case 'getUserInfo':
        return await getUserInfo(event);
      
      default:
        throw new Error(`未知操作: ${action}`);
    }
  } catch (error) {
    console.error(`❌ [wechat-oauth] ${action} 失败:`, error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};

/**
 * 生成微信授权 URL
 * 
 * @param {Object} params
 * @param {string} params.redirectUri - 授权回调地址
 * @param {string} params.scope - 授权作用域：'snsapi_login'（微信开放平台-网站应用）
 * @param {string} params.state - 自定义参数（可选）
 */
async function getAuthUrl({ redirectUri, scope = 'snsapi_login', state = 'STATE' }) {
  console.log('🔗 [getAuthUrl] 生成授权URL:', { redirectUri, scope });

  // 编码回调地址
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  // ⚠️ 关键修正：使用微信开放平台-网站应用的授权端点
  // 公众号网页授权: https://open.weixin.qq.com/connect/oauth2/authorize
  // 开放平台网站应用: https://open.weixin.qq.com/connect/qrconnect
  const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_CONFIG.appid}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;

  console.log('✓ [getAuthUrl] 授权URL生成成功');

  return {
    success: true,
    data: {
      authUrl
    }
  };
}

/**
 * 用 code 换取 access_token 和 openid
 * 
 * 文档：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
 * 
 * @param {Object} params
 * @param {string} params.code - 微信授权code
 */
async function getOpenId({ code }) {
  console.log('🔑 [getOpenId] 换取 OpenID, code:', code);

  if (!code) {
    throw new Error('缺少参数: code');
  }

  try {
    // 调用微信API换取 access_token
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_CONFIG.appid}&secret=${WECHAT_CONFIG.secret}&code=${code}&grant_type=authorization_code`;
    
    const response = await axios.get(url);
    const data = response.data;

    console.log('📦 [getOpenId] 微信API返回:', data);

    if (data.errcode) {
      throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`);
    }

    console.log('✓ [getOpenId] 获取 OpenID 成功:', data.openid);

    return {
      success: true,
      data: {
        openid: data.openid,
        access_token: data.access_token,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        scope: data.scope,
        unionid: data.unionid  // 如果用户在多个公众号/小程序授权，会返回 unionid
      }
    };
  } catch (error) {
    console.error('❌ [getOpenId] 换取失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errmsg || error.message || '换取 OpenID 失败');
  }
}

/**
 * 获取用户信息（snsapi_login 作用域下可用）
 * 
 * @param {Object} params
 * @param {string} params.access_token - 访问令牌
 * @param {string} params.openid - 用户OpenID
 */
async function getUserInfo({ access_token, openid }) {
  console.log('👤 [getUserInfo] 获取用户信息:', { openid });

  if (!access_token || !openid) {
    throw new Error('缺少参数: access_token 或 openid');
  }

  try {
    // 调用微信API获取用户信息
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    
    const response = await axios.get(url);
    const data = response.data;

    console.log('📦 [getUserInfo] 微信API返回:', data);

    if (data.errcode) {
      throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`);
    }

    console.log('✓ [getUserInfo] 获取用户信息成功');

    return {
      success: true,
      data: {
        openid: data.openid,
        nickname: data.nickname,
        sex: data.sex,
        province: data.province,
        city: data.city,
        country: data.country,
        headimgurl: data.headimgurl,
        privilege: data.privilege,
        unionid: data.unionid
      }
    };
  } catch (error) {
    console.error('❌ [getUserInfo] 获取失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errmsg || error.message || '获取用户信息失败');
  }
}
