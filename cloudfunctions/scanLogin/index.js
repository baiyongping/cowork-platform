/**
 * 扫码登录云函数
 * 功能：生成登录码、验证登录、轮询登录状态
 */
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const JWT_SECRET = process.env.JWT_SECRET || 'jihua-oa-secret-key-2025';

/**
 * 生成唯一登录码
 */
function generateLoginCode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 生成JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      name: user.name,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

exports.main = async (event, context) => {
  const { action = 'create' } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createLoginCode();
      case 'confirm':
        return await confirmLogin(event.code, wxContext);
      case 'check':
        return await checkLoginStatus(event.code);
      case 'cancel':
        return await cancelLogin(event.code);
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('扫码登录操作失败:', error);
    return {
      code: 500,
      message: error.message || '操作失败'
    };
  }
};

/**
 * 创建登录码
 */
async function createLoginCode() {
  const loginCode = generateLoginCode();
  const now = Date.now();
  const expireAt = now + 5 * 60 * 1000; // 5分钟有效期

  await db.collection('login_codes').add({
    data: {
      code: loginCode,
      status: 'pending', // pending/confirmed/expired/cancelled
      createdAt: now,
      expireAt: expireAt,
      openId: null,
      userId: null,
      userInfo: null,
      confirmedAt: null
    }
  });

  return {
    code: 200,
    message: '登录码生成成功',
    data: {
      loginCode,
      expireAt
    }
  };
}

/**
 * 确认登录（小程序端扫码后调用）
 */
async function confirmLogin(loginCode, wxContext) {
  if (!loginCode) {
    return {
      code: 400,
      message: '登录码不能为空'
    };
  }

  // 1. 查询登录码
  const { data: codes } = await db.collection('login_codes')
    .where({ code: loginCode })
    .get();

  if (codes.length === 0) {
    return {
      code: 404,
      message: '登录码不存在'
    };
  }

  const loginRecord = codes[0];

  // 2. 检查状态
  if (loginRecord.status === 'confirmed') {
    return {
      code: 400,
      message: '登录码已被使用'
    };
  }

  if (loginRecord.status === 'expired') {
    return {
      code: 400,
      message: '登录码已过期'
    };
  }

  if (Date.now() > loginRecord.expireAt) {
    await db.collection('login_codes').doc(loginRecord._id).update({
      data: { status: 'expired' }
    });
    return {
      code: 400,
      message: '登录码已过期'
    };
  }

  // 3. 查询用户信息
  const { data: users } = await db.collection('users')
    .where({
      wxOpenId: wxContext.OPENID,
      isActive: true // 只允许激活的用户登录
    })
    .get();

  if (users.length === 0) {
    return {
      code: 403,
      message: '用户不存在或未激活'
    };
  }

  const user = users[0];

  // 4. 更新登录码状态
  await db.collection('login_codes').doc(loginRecord._id).update({
    data: {
      status: 'confirmed',
      openId: wxContext.OPENID,
      userId: user._id,
      userInfo: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        departments: user.departments,
        roles: user.roles
      },
      confirmedAt: Date.now()
    }
  });

  // 5. 记录登录日志
  await db.collection('operation_logs').add({
    data: {
      userId: user._id,
      action: '扫码登录',
      module: '用户管理',
      content: `用户 ${user.name} 通过扫码登录`,
      createdAt: Date.now()
    }
  });

  return {
    code: 200,
    message: '登录确认成功'
  };
}

/**
 * 检查登录状态（Web端轮询）
 */
async function checkLoginStatus(loginCode) {
  if (!loginCode) {
    return {
      code: 400,
      message: '登录码不能为空'
    };
  }

  // 查询登录码
  const { data: codes } = await db.collection('login_codes')
    .where({ code: loginCode })
    .get();

  if (codes.length === 0) {
    return {
      code: 404,
      message: '登录码不存在'
    };
  }

  const loginRecord = codes[0];

  // 检查是否过期
  if (Date.now() > loginRecord.expireAt) {
    await db.collection('login_codes').doc(loginRecord._id).update({
      data: { status: 'expired' }
    });
    return {
      code: 400,
      message: '登录码已过期',
      data: { status: 'expired' }
    };
  }

  // 检查状态
  if (loginRecord.status === 'confirmed') {
    // 生成Token
    const token = generateToken(loginRecord.userInfo);

    // 删除或标记登录码已使用
    await db.collection('login_codes').doc(loginRecord._id).remove();

    return {
      code: 200,
      message: '登录成功',
      data: {
        status: 'confirmed',
        token,
        user: loginRecord.userInfo
      }
    };
  }

  // 返回当前状态
  return {
    code: 202, // 202表示等待中
    data: {
      status: loginRecord.status
    }
  };
}

/**
 * 取消登录
 */
async function cancelLogin(loginCode) {
  if (!loginCode) {
    return {
      code: 400,
      message: '登录码不能为空'
    };
  }

  const { data: codes } = await db.collection('login_codes')
    .where({ code: loginCode })
    .get();

  if (codes.length === 0) {
    return {
      code: 404,
      message: '登录码不存在'
    };
  }

  await db.collection('login_codes').doc(codes[0]._id).update({
    data: { status: 'cancelled' }
  });

  return {
    code: 200,
    message: '登录已取消'
  };
}
