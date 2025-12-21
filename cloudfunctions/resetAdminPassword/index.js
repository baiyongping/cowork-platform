const tcb = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});

const db = app.database();
const _ = db.command;

// 密码加密密钥（与前端系统保持一致）
const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

// SHA-256密码哈希函数（与前端系统保持一致）
function hashPassword(password) {
  const hash = crypto.createHash('sha256');
  hash.update(password + SECRET_KEY);
  return hash.digest('hex');
}

exports.main = async (event, context) => {
  try {
    // 解析请求体（HTTP 触发器）
    let requestData = event;
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        requestData = event;
      }
    }

    const { action, newPassword } = requestData;

    console.log('收到请求:', { action, newPassword });

    // 无论 action 是否为 reset，都执行密码重置
    // 因为这个云函数只有一个功能，就是重置密码
    
    // 生成新密码的哈希值（使用与前端系统完全一致的 SHA-256 算法）
    const hashedPassword = hashPassword(newPassword || 'admin123');

    console.log('密码哈希值:', hashedPassword);

    // 更新管理员密码
    const result = await db.collection('users')
      .where({
        username: 'admin'
      })
      .update({
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      });

    console.log('更新结果:', result);

    if (result.updated === 0) {
      return {
        success: false,
        message: '未找到管理员账户',
        code: 404
      };
    }

    return {
      success: true,
      message: '管理员密码重置成功',
      data: {
        username: 'admin',
        newPassword: newPassword || 'admin123',
        passwordHash: hashedPassword,
        resetTime: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('重置密码失败:', error);
    return {
      success: false,
      message: '重置密码失败: ' + error.message,
      code: 500
    };
  }
};
