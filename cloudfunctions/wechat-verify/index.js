const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// Token（与微信公众平台填写的保持一致）
const TOKEN = 'jihuaoa2026token';

exports.main = async (event, context) => {
  console.log('微信验证请求:', JSON.stringify(event, null, 2));
  
  // 获取微信发来的参数
  const query = event.queryStringParameters || event;
  const { signature, timestamp, nonce, echostr } = query;
  
  console.log('验证参数:', { signature, timestamp, nonce, echostr });
  
  // 验证请求是否来自微信服务器
  if (signature && timestamp && nonce) {
    // 1. 将 token、timestamp、nonce 三个参数进行字典序排序
    const arr = [TOKEN, timestamp, nonce].sort();
    
    // 2. 将三个参数字符串拼接成一个字符串进行sha1加密
    const sha1 = crypto.createHash('sha1');
    sha1.update(arr.join(''));
    const result = sha1.digest('hex');
    
    console.log('计算的签名:', result);
    console.log('微信签名:', signature);
    
    // 3. 加密后的字符串与signature对比
    if (result === signature) {
      console.log('验证成功');
      // 验证成功，返回echostr
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain'
        },
        body: echostr || 'success'
      };
    } else {
      console.log('签名不匹配');
    }
  } else {
    console.log('参数不完整');
  }
  
  // 验证失败
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'text/plain'
    },
    body: 'Forbidden'
  };
};
