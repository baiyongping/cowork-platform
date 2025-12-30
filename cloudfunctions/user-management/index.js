/**
 * 用户管理云函数
 * 提供用户密码重置等管理功能
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  const app = cloudbase.init({
    env: cloudbase.SYMBOL_CURRENT_ENV
  });
  
  const db = app.database();
  const auth = app.auth();

  const { action, userId, newPassword, password } = event;

  try {
    // 验证操作类型
    if (!action) {
      return {
        success: false,
        message: '缺少action参数'
      };
    }

    // 密码加密功能（用于前端加密回退）
    if (action === 'hashPassword') {
      if (!password) {
        return {
          success: false,
          message: '缺少password参数'
        };
      }

      const crypto = require('crypto');
      const SECRET_KEY = 'jihua-oa-platform-secret-key-2025'; // ✅ 修复：与前端保持完全一致
      const hash = crypto.createHash('sha256');
      hash.update(password + SECRET_KEY);
      const hashedPassword = hash.digest('hex');

      return {
        success: true,
        hash: hashedPassword
      };
    }

    // 密码重置功能
    if (action === 'resetPassword') {
      if (!userId) {
        return {
          success: false,
          message: '缺少userId参数'
        };
      }

      if (!newPassword) {
        return {
          success: false,
          message: '缺少newPassword参数'
        };
      }

      // 查询用户信息
      const userResult = await db.collection('users').doc(userId).get();
      if (!userResult.data || userResult.data.length === 0) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      const user = userResult.data[0];
      const username = user.username;

      if (!username) {
        return {
          success: false,
          message: '用户名不存在'
        };
      }

      try {
        // 🔧 使用与前端登录相同的SHA-256加密方式
        const crypto = require('crypto');
        const SECRET_KEY = 'jihua-oa-platform-secret-key-2025'; // ✅ 修复：与前端保持完全一致
        
        // SHA-256加密
        const hash = crypto.createHash('sha256');
        hash.update(newPassword + SECRET_KEY);
        const hashedPassword = hash.digest('hex');
        
        // 直接更新数据库中的密码
        await db.collection('users').doc(userId).update({
          password: hashedPassword,
          updatedAt: new Date()
        });

        console.log(`✅ 密码重置成功: 用户 ${username} (ID: ${userId})`);

        return {
          success: true,
          message: '密码重置成功',
          data: {
            userId: userId,
            username: username
          }
        };
      } catch (error) {
        console.error('❌ 密码重置失败:', error);
        return {
          success: false,
          message: '密码重置失败: ' + error.message
        };
      }
    }

    return {
      success: false,
      message: '未知的操作类型: ' + action
    };
  } catch (error) {
    console.error('❌ 云函数执行失败:', error);
    return {
      success: false,
      message: '操作失败: ' + error.message
    };
  }
};
