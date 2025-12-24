const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action, userInfo } = event;

  try {
    // 如果是保存用户信息
    if (action === 'saveUser') {
      const now = new Date();
      
      // 查询用户是否已存在
      const { data: users } = await db.collection('users').where({
        _openid: OPENID
      }).get();

      if (users.length > 0) {
        // 更新用户信息
        await db.collection('users').doc(users[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city,
            lastLoginAt: now
          }
        });
      } else {
        // 创建新用户
        await db.collection('users').add({
          data: {
            _openid: OPENID,
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city,
            createdAt: now,
            lastLoginAt: now
          }
        });
      }

      return {
        success: true,
        message: '保存成功'
      };
    }

    // 默认返回 OpenID (用于第一步授权)
    return {
      success: true,
      openid: OPENID
    };

  } catch (err) {
    console.error('云函数执行失败:', err);
    return {
      success: false,
      message: err.message || '操作失败'
    };
  }
};
