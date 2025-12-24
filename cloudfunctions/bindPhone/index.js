/**
 * 绑定手机号云函数
 * 功能：首次登录时绑定微信手机号
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action = 'bind', code, iv, encryptedData } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'bind':
        return await bindPhone(wxContext, code, iv, encryptedData);
      case 'check':
        return await checkPhoneBound(wxContext);
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('手机号绑定操作失败:', error);
    return {
      code: 500,
      message: error.message || '操作失败'
    };
  }
};

/**
 * 绑定手机号
 */
async function bindPhone(wxContext, code, iv, encryptedData) {
  try {
    // 1. 查询用户
    const { data: users } = await db.collection('users')
      .where({
        wxOpenId: wxContext.OPENID
      })
      .get();

    if (users.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = users[0];

    // 2. 检查是否已绑定
    if (user.isPhoneBound) {
      return {
        code: 400,
        message: '手机号已绑定'
      };
    }

    // 3. 使用微信官方API获取手机号
    // 注意：需要在云函数中调用 wx.getPhoneNumber
    let phoneNumber = '';
    
    if (code) {
      // 使用 code 方式获取手机号（新版API）
      const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({
        code: code
      });

      if (phoneResult.errcode === 0 && phoneResult.phone_info) {
        phoneNumber = phoneResult.phone_info.phoneNumber;
      } else {
        return {
          code: 400,
          message: '获取手机号失败: ' + phoneResult.errmsg
        };
      }
    } else if (iv && encryptedData) {
      // 使用加密数据方式获取手机号（旧版API）
      const pc = new cloud.WXSERVERAPI({
        appid: wxContext.APPID,
        sessionKey: wxContext.SESSION_KEY
      });

      const decryptResult = pc.decryptData(encryptedData, iv, 'phoneNumber');
      phoneNumber = decryptResult.phoneNumber;
    } else {
      return {
        code: 400,
        message: '缺少必要参数'
      };
    }

    // 4. 更新用户手机号
    await db.collection('users').doc(user._id).update({
      data: {
        phone: phoneNumber,
        isPhoneBound: true,
        phoneBindTime: Date.now()
      }
    });

    // 5. 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: user._id,
        action: '绑定手机号',
        module: '用户管理',
        content: `用户 ${user.name} 绑定了手机号 ${phoneNumber}`,
        createdAt: Date.now()
      }
    });

    return {
      code: 200,
      message: '手机号绑定成功',
      data: {
        phone: phoneNumber
      }
    };

  } catch (error) {
    console.error('绑定手机号失败:', error);
    throw error;
  }
}

/**
 * 检查手机号是否已绑定
 */
async function checkPhoneBound(wxContext) {
  const { data: users } = await db.collection('users')
    .where({
      wxOpenId: wxContext.OPENID
    })
    .get();

  if (users.length === 0) {
    return {
      code: 404,
      message: '用户不存在'
    };
  }

  const user = users[0];

  return {
    code: 200,
    data: {
      isPhoneBound: user.isPhoneBound || false,
      phone: user.phone || ''
    }
  };
}
