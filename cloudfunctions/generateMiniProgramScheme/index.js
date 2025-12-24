const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 生成小程序 URL Scheme
 * 用于生成可以通过微信扫一扫打开小程序的链接
 */
exports.main = async (event, context) => {
  try {
    const { path = 'pages/register/register', query = '' } = event;

    console.log('生成 URL Scheme:', { path, query });

    // 调用微信API生成 URL Scheme
    const result = await cloud.openapi.urlscheme.generate({
      jumpWxa: {
        path: path,
        query: query
      },
      // 有效期30天
      expireType: 1,
      expireInterval: 30
    });

    console.log('URL Scheme 生成结果:', result);

    if (result.errCode === 0) {
      return {
        success: true,
        openlink: result.openlink
      };
    } else {
      throw new Error(result.errMsg || '生成失败');
    }

  } catch (error) {
    console.error('生成 URL Scheme 失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
