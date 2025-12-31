const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 密钥（生产环境应使用环境变量）
const SECRET_KEY = process.env.SECRET_KEY || 'jihua-oa-platform-secret-key-2025';

/**
 * 生成Token（与auth云函数保持一致）
 */
function generateToken(userId, username, role) {
  const timestamp = Date.now();
  const expiresAt = timestamp + 7 * 24 * 60 * 60 * 1000; // 7天后过期
  const payload = JSON.stringify({ userId, username, role, expiresAt });
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(payload + '.' + signature).toString('base64');
}

/**
 * 生成随机Scene ID
 */
function generateSceneId() {
  return 'login_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 微信扫码登录云函数
 * 
 * 功能:
 * 1. 生成登录二维码Scene (generateLoginScene)
 * 2. 检查登录状态 (checkLoginStatus)
 * 3. 扫码确认登录 (confirmLogin)
 */

/**
 * 1. 生成登录Scene
 * PC端调用,生成登录二维码场景值
 */
async function generateLoginScene() {
  try {
    // 生成Scene ID
    const sceneId = generateSceneId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    // 写入 wechat_sessions 集合
    await db.collection('wechat_sessions').add({
      data: {
        sceneId,
        type: 'login', // 登录类型
        userId: null,
        username: null,
        status: 'pending', // 待扫码
        openid: null,
        unionid: null,
        createdAt: new Date(),
        expiresAt,
        scannedAt: null,
        confirmedAt: null
      }
    });

    return {
      code: 200,
      message: '生成成功',
      data: {
        sceneId,
        expiresAt: expiresAt.toISOString()
      }
    };
  } catch (error) {
    console.error('生成登录Scene失败:', error);
    return {
      code: 500,
      message: '生成失败: ' + error.message
    };
  }
}

/**
 * 2. 检查登录状态
 * PC端轮询调用,检查是否已完成登录
 */
async function checkLoginStatus(event) {
  const { sceneId } = event;

  if (!sceneId) {
    return {
      code: 400,
      message: '缺少sceneId'
    };
  }

  try {
    const sessionResult = await db.collection('wechat_sessions')
      .where({ sceneId })
      .get();

    if (sessionResult.data.length === 0) {
      return {
        code: 404,
        message: '会话不存在'
      };
    }

    const session = sessionResult.data[0];

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt)) {
      return {
        code: 410,
        message: '二维码已过期',
        data: { status: 'expired' }
      };
    }

    // 如果已完成登录,返回Token和用户信息
    if (session.status === 'completed' && session.userId) {
      // 查询用户完整信息
      const userResult = await db.collection('users').doc(session.userId).get();
      if (!userResult.data || userResult.data.length === 0) {
        return {
          code: 404,
          message: '用户不存在'
        };
      }

      const user = userResult.data[0];

      // 生成Token
      const token = generateToken(user._id, user.username, user.role);

      // 删除已完成的Session（清理数据）
      await db.collection('wechat_sessions').doc(session._id).remove();

      return {
        code: 200,
        message: '登录成功',
        data: {
          status: 'completed',
          token,
          user: {
            userId: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            avatar: user.avatar
          }
        }
      };
    }

    return {
      code: 200,
      message: '查询成功',
      data: {
        status: session.status,
        scannedAt: session.scannedAt
      }
    };
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return {
      code: 500,
      message: '检查失败: ' + error.message
    };
  }
}

/**
 * 3. 扫码确认登录
 * 小程序端调用,确认登录操作
 */
async function confirmLogin(event, context) {
  const { sceneId, openid: eventOpenid } = event;

  if (!sceneId) {
    return {
      code: 400,
      message: '缺少sceneId'
    };
  }

  try {
    // 获取OpenID: 优先使用传入的openid（模拟器测试），否则从微信上下文获取
    let openid;
    if (eventOpenid) {
      openid = eventOpenid; // 模拟器传入
      console.log('🔧 使用模拟器传入的OpenID:', openid);
    } else {
      const wxContext = cloud.getWXContext();
      openid = wxContext.OPENID;
      console.log('📱 使用微信上下文OpenID:', openid);
    }

    if (!openid) {
      return {
        code: 400,
        message: '缺少openid'
      };
    }

    // 查询Session
    const sessionResult = await db.collection('wechat_sessions')
      .where({ sceneId })
      .get();

    console.log('🔍 查询会话结果:', JSON.stringify(sessionResult));

    if (sessionResult.data.length === 0) {
      return {
        code: 404,
        message: '会话不存在或已过期'
      };
    }

    const session = sessionResult.data[0];
    console.log('📦 获取的会话对象:', JSON.stringify(session));

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt)) {
      return {
        code: 410,
        message: '二维码已过期'
      };
    }

    // 根据OpenID查找已绑定的用户
    const userResult = await db.collection('users')
      .where({ wechatOpenId: openid })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: 404,
        message: '该微信未绑定任何账号',
        data: {
          needBind: true,
          openid
        }
      };
    }

    const user = userResult.data[0];

    // 检查用户状态
    if (!user.isActive) {
      return {
        code: 403,
        message: '账号已被禁用'
      };
    }

    if (user.approvalStatus !== 'approved') {
      return {
        code: 403,
        message: '账号审核未通过'
      };
    }

    // 更新Session状态 - 标记为已完成
    console.log('📝 准备更新会话:', { sessionId: session._id || session.id, sceneId });
    
    const sessionId = session._id || session.id;
    if (!sessionId) {
      throw new Error('无法获取会话ID');
    }
    
    await db.collection('wechat_sessions').doc(sessionId).update({
      data: {
        status: 'completed',
        userId: user._id || user.id,
        username: user.username,
        openid,
        confirmedAt: new Date()
      }
    });

    // 更新用户最后登录时间
    await db.collection('users').doc(user._id).update({
      data: {
        lastLoginAt: new Date()
      }
    });

    return {
      code: 200,
      message: '登录确认成功',
      data: {
        userId: user._id,
        username: user.username,
        name: user.name
      }
    };
  } catch (error) {
    console.error('登录确认失败:', error);
    return {
      code: 500,
      message: '登录确认失败: ' + error.message
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'generateLoginScene':
      return await generateLoginScene();
    case 'checkLoginStatus':
      return await checkLoginStatus(event);
    case 'confirmLogin':
      return await confirmLogin(event, context);
    default:
      return {
        code: 400,
        message: '未知的操作: ' + action
      };
  }
};
