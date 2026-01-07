const tcb = require('@cloudbase/node-sdk');
const axios = require('axios');

// 初始化CloudBase
const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});

const APPID = 'wx79afc92f6fe01a31';
const APPSECRET = '你的小程序AppSecret'; // ⚠️ 需要在微信公众平台获取

/**
 * 获取微信小程序 Access Token
 */
async function getAccessToken() {
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`;
    const response = await axios.get(url);
    
    if (response.data.errcode) {
      throw new Error(`获取Access Token失败: ${response.data.errmsg}`);
    }
    
    return response.data.access_token;
  } catch (error) {
    console.error('获取Access Token失败:', error);
    throw error;
  }
}

/**
 * 生成小程序码（推荐使用此方法）
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
 */
async function generateMiniProgramCode(scene, page = 'pages/wechat-bind/index') {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;
    
    // 请求参数
    const data = {
      scene: scene, // 场景值（最多32个字符）
      page: page,   // 小程序页面路径
      width: 280,   // 二维码宽度（默认280）
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 },
      is_hyaline: false
    };
    
    // 请求微信接口
    const response = await axios.post(url, data, {
      responseType: 'arraybuffer' // 返回二进制数据
    });
    
    // 检查是否返回错误
    if (response.headers['content-type'].includes('application/json')) {
      const errorData = JSON.parse(response.data.toString());
      throw new Error(`生成小程序码失败: ${errorData.errmsg}`);
    }
    
    // 返回 Base64 编码的图片
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/png;base64,${base64Image}`;
    
  } catch (error) {
    console.error('生成小程序码失败:', error);
    throw error;
  }
}

/**
 * 生成普通二维码（备用方案）
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/createQRCode.html
 */
async function generateQRCode(scene, page = 'pages/wechat-bind/index') {
  try {
    const accessToken = await getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=${accessToken}`;
    
    const data = {
      path: `${page}?scene=${scene}`,
      width: 280
    };
    
    const response = await axios.post(url, data, {
      responseType: 'arraybuffer'
    });
    
    if (response.headers['content-type'].includes('application/json')) {
      const errorData = JSON.parse(response.data.toString());
      throw new Error(`生成二维码失败: ${errorData.errmsg}`);
    }
    
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/png;base64,${base64Image}`;
    
  } catch (error) {
    console.error('生成二维码失败:', error);
    throw error;
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { sceneId, type = 'unlimited' } = event;
  
  if (!sceneId) {
    return {
      code: 400,
      message: '缺少sceneId参数'
    };
  }
  
  try {
    let qrCodeData;
    
    if (type === 'unlimited') {
      // 推荐：使用小程序码（永久有效，数量无限制）
      qrCodeData = await generateMiniProgramCode(sceneId);
    } else {
      // 备用：使用普通二维码
      qrCodeData = await generateQRCode(sceneId);
    }
    
    return {
      code: 200,
      message: '生成成功',
      data: {
        qrCodeUrl: qrCodeData, // Base64格式的图片
        sceneId
      }
    };
    
  } catch (error) {
    console.error('生成失败:', error);
    return {
      code: 500,
      message: '生成失败: ' + error.message
    };
  }
};
