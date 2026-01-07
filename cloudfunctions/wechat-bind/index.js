const tcb = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});

const db = app.database();
const _ = db.command;

/**
 * 微信绑定云函数
 * 
 * 功能:
 * 1. 生成二维码Scene (generateScene)
 * 2. 检查绑定状态 (checkStatus)
 * 3. 获取Session信息 (getSessionInfo) - 小程序端用
 * 3.1. 获取Scene信息 (getSceneInfo) - H5端用，返回基础信息
 * 4. 扫码确认绑定 (confirmBind)
 * 5. 解绑微信 (unbind)
 */

/**
 * 生成随机Scene ID
 */
function generateSceneId() {
  return 'bind_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 1. 生成绑定Scene
 * PC端调用,生成二维码场景值
 */
async function generateScene(event) {
  const { userId, token } = event;

  if (!userId || !token) {
    return {
      code: 400,
      message: '缺少必要参数'
    };
  }

  try {
    // 验证Token (简化版,实际应该调用auth云函数验证)
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data || Object.keys(userResult.data).length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = userResult.data;

    // 生成Scene ID
    const sceneId = generateSceneId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

    // 写入 wechat_sessions 集合
    await db.collection('wechat_sessions').add({
      sceneId,
      type: 'bind', // 绑定类型
      userId,
      username: user.username,
      status: 'pending', // 待扫码
      openid: null,
      unionid: null,
      createdAt: new Date(),
      expiresAt,
      scannedAt: null,
      confirmedAt: null
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
    console.error('生成Scene失败:', error);
    return {
      code: 500,
      message: '生成失败: ' + error.message
    };
  }
}

/**
 * 2. 检查绑定状态
 * PC端轮询调用,检查是否已完成绑定
 */
async function checkStatus(event) {
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

    return {
      code: 200,
      message: '查询成功',
      data: {
        status: session.status,
        scannedAt: session.scannedAt,
        confirmedAt: session.confirmedAt
      }
    };
  } catch (error) {
    console.error('检查状态失败:', error);
    return {
      code: 500,
      message: '检查失败: ' + error.message
    };
  }
}

/**
 * 4. 扫码确认绑定
 * H5端和小程序端调用,确认绑定操作
 */
async function confirmBind(event) {
  const { sceneId, openid } = event;

  if (!sceneId) {
    return {
      success: false,
      error: '缺少sceneId'
    };
  }

  if (!openid) {
    return {
      success: false,
      error: '缺少openid'
    };
  }

  try {
    // 查询Session
    const sessionResult = await db.collection('wechat_sessions')
      .where({ sceneId })
      .get();

    if (sessionResult.data.length === 0) {
      return {
        success: false,
        error: '绑定场景不存在或已过期'
      };
    }

    const session = sessionResult.data[0];

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt)) {
      return {
        success: false,
        error: '二维码已过期'
      };
    }

    // 检查是否已被绑定
    if (session.status === 'completed') {
      return {
        success: false,
        error: '该二维码已被使用'
      };
    }

    // 检查该OpenID是否已绑定其他账号
    const existingUser = await db.collection('users')
      .where({ 
        wechatOpenId: openid,
        _id: _.neq(session.userId) // 排除当前要绑定的用户
      })
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        error: '该微信已绑定其他账号'
      };
    }

    // 更新用户信息 - 绑定OpenID
    await db.collection('users').doc(session.userId).update({
      wechatOpenId: openid,
      wechatBoundAt: new Date(),
      updatedAt: new Date()
    });

    // 更新Session状态
    await db.collection('wechat_sessions').doc(session._id).update({
      status: 'completed',
      openid,
      confirmedAt: new Date()
    });

    console.log('✓ [confirmBind] 绑定成功:', {
      userId: session.userId,
      username: session.username,
      openid
    });

    return {
      success: true,
      data: {
        userId: session.userId,
        username: session.username,
        wechatOpenId: openid
      }
    };
  } catch (error) {
    console.error('❌ [confirmBind] 失败:', error);
    return {
      success: false,
      error: '绑定失败: ' + error.message
    };
  }
}

/**
 * 3. 获取Scene信息（H5端专用）
 * H5页面调用，只返回基础绑定信息
 */
async function getSceneInfo(event) {
  const { sceneId } = event;

  if (!sceneId) {
    return {
      success: false,
      error: '缺少sceneId'
    };
  }

  try {
    // 查询 wechat_sessions
    const sessionResult = await db.collection('wechat_sessions')
      .where({ sceneId })
      .get();

    if (sessionResult.data.length === 0) {
      return {
        success: false,
        error: '绑定场景不存在'
      };
    }

    const session = sessionResult.data[0];

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt)) {
      return {
        success: false,
        error: '二维码已过期'
      };
    }

    // 检查是否已被绑定
    if (session.status === 'completed') {
      return {
        success: false,
        error: '该二维码已被使用'
      };
    }

    // 获取用户信息
    const userResult = await db.collection('users').doc(session.userId).get();
    if (!userResult.data || Object.keys(userResult.data).length === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    const user = userResult.data;

    // 返回基础信息（用于H5确认页面）
    return {
      success: true,
      data: {
        userName: user.name,
        username: user.username,  // ✅ 添加登录用户名
        department: user.department || '未分配',
        position: user.position || '未设置'
      }
    };
  } catch (error) {
    console.error('❌ [getSceneInfo] 失败:', error);
    return {
      success: false,
      error: '获取绑定信息失败: ' + error.message
    };
  }
}

/**
 * 3. 获取Session信息（小程序端专用）
 * 小程序端调用,获取要绑定的用户信息
 */
async function getSessionInfo(event) {
  const { sceneId } = event;

  if (!sceneId) {
    return {
      code: 400,
      message: '缺少sceneId'
    };
  }

  try {
    // 查询Session
    const sessionResult = await db.collection('wechat_sessions')
      .where({ sceneId })
      .get();

    if (sessionResult.data.length === 0) {
      return {
        code: 404,
        message: '会话不存在或已过期'
      };
    }

    const session = sessionResult.data[0];

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt)) {
      return {
        code: 410,
        message: '二维码已过期'
      };
    }

    // 获取用户信息
    const userResult = await db.collection('users').doc(session.userId).get();
    if (!userResult.data || Object.keys(userResult.data).length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = userResult.data;

    // 返回用户信息（用于确认页面显示）
    return {
      code: 200,
      message: '查询成功',
      data: {
        userId: user._id,
        name: user.name,
        nickname: user.nickname || user.name, // 优先使用昵称
        avatar: user.avatar || '', // 头像URL
        department: user.department || '未分配',
        position: user.position || '未设置',
        username: user.username
      }
    };
  } catch (error) {
    console.error('获取Session信息失败:', error);
    return {
      code: 500,
      message: '获取信息失败: ' + error.message
    };
  }
}

/**
 * 5. 解绑微信
 * PC端调用,解除微信绑定
 */
async function unbind(event) {
  const { userId, token } = event;

  if (!userId || !token) {
    return {
      code: 400,
      message: '缺少必要参数'
    };
  }

  try {
    // 验证用户
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data || Object.keys(userResult.data).length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = userResult.data;

    if (!user.wechatOpenId) {
      return {
        code: 400,
        message: '该账号未绑定微信'
      };
    }

    // 清除绑定信息
    await db.collection('users').doc(userId).update({
      wechatOpenId: '',
      wechatBoundAt: null,
      updatedAt: new Date()
    });

    return {
      code: 200,
      message: '解绑成功'
    };
  } catch (error) {
    console.error('解绑失败:', error);
    return {
      code: 500,
      message: '解绑失败: ' + error.message
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'generateScene':
      return await generateScene(event);
    case 'checkStatus':
      return await checkStatus(event);
    case 'getSessionInfo':
      return await getSessionInfo(event);
    case 'getSceneInfo':  // ✅ 新增：H5端获取场景信息
      return await getSceneInfo(event);
    case 'confirmBind':
      return await confirmBind(event);
    case 'unbind':
      return await unbind(event);
    default:
      return {
        code: 400,
        message: '不支持的操作类型: ' + action
      };
  }
};
