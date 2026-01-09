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
 * 简单的密码哈希（使用Node.js内置crypto）
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

/**
 * 生成简单Token（用户ID + 时间戳 + 签名）
 */
function generateToken(userId, username, role) {
  const timestamp = Date.now();
  const expiresAt = timestamp + 7 * 24 * 60 * 60 * 1000; // 7天后过期
  const payload = JSON.stringify({ userId, username, role, expiresAt });
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(payload + '.' + signature).toString('base64');
}

/**
 * 验证Token
 */
function verifyTokenString(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [payloadStr, signature] = decoded.split('.');
    
    // 验证签名
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');
    if (signature !== expectedSignature) {
      return { valid: false, message: '令牌无效' };
    }
    
    const payload = JSON.parse(payloadStr);
    
    // 检查是否过期
    if (Date.now() > payload.expiresAt) {
      return { valid: false, message: '令牌已过期' };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, message: '令牌格式错误' };
  }
}

/**
 * 用户注册
 */
async function register(event) {
  const { username, password, email, name, department = '' } = event;

  // 参数验证
  if (!username || !password) {
    return {
      code: 400,
      message: '用户名和密码不能为空'
    };
  }

  if (password.length < 6) {
    return {
      code: 400,
      message: '密码长度不能少于6位'
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      code: 400,
      message: '邮箱格式不正确'
    };
  }

  try {
    // 检查用户名是否已存在
    const existingUser = await db.collection('users')
      .where({ username })
      .get();

    if (existingUser.data.length > 0) {
      return {
        code: 409,
        message: '用户名已存在'
      };
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await db.collection('users')
        .where({ email })
        .get();

      if (existingEmail.data.length > 0) {
        return {
          code: 409,
          message: '邮箱已被注册'
        };
      }
    }

    // 密码加密
    const hashedPassword = hashPassword(password);

    // ✅ v2.2.0: 新用户默认无角色，只能访问工作台和个人信息
    // 创建用户
    const result = await db.collection('users').add({
      data: {
        username,
        password: hashedPassword,
        email: email || '',
        name: name || username,
        role: '',           // ✅ 不分配role
        roles: [],          // ✅ 不分配roles
        department,
        avatar: '',
        isActive: true,
        approvalStatus: 'pending',
        needChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return {
      code: 201,
      message: '注册成功',
      data: {
        userId: result._id,
        username,
        name: name || username,
        role: ''
      }
    };
  } catch (error) {
    console.error('注册失败:', error);
    return {
      code: 500,
      message: '注册失败: ' + error.message
    };
  }
}

/**
 * 用户登录
 */
async function login(event) {
  const { username, password } = event;

  // 参数验证
  if (!username || !password) {
    return {
      code: 400,
      message: '用户名和密码不能为空'
    };
  }

  try {
    // 查询用户
    const userResult = await db.collection('users')
      .where({ username })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: 401,
        message: '用户名或密码错误'
      };
    }

    const user = userResult.data[0];

    // 检查用户是否已被禁用
    if (!user.isActive) {
      return {
        code: 403,
        message: '账号已被禁用，请联系管理员'
      };
    }

    // 🔧 修复：检查审核状态
    if (!user.approvalStatus || user.approvalStatus === 'pending') {
      return {
        code: 403,
        message: '账号正在审核中，请等待管理员审核'
      };
    }

    if (user.approvalStatus === 'rejected') {
      return {
        code: 403,
        message: '账号审核未通过，请联系管理员'
      };
    }

    // 验证密码
    const hashedInputPassword = hashPassword(password);
    
    // 🔍 调试日志
    console.log('🔐 密码验证:');
    console.log('  用户名:', username);
    console.log('  输入密码:', password);
    console.log('  SECRET_KEY:', SECRET_KEY);
    console.log('  输入哈希:', hashedInputPassword);
    console.log('  数据库哈希:', user.password);
    
    const isPasswordValid = hashedInputPassword === user.password;

    if (!isPasswordValid) {
      return {
        code: 401,
        message: '用户名或密码错误'
      };
    }

    // 更新最后登录时间
    // 🔧 同时更新 _openid（首次登录时设置）
    const auth = cloud.auth();
    const wxContext = auth.getWXContext();
    const currentOpenid = wxContext.OPENID;
    
    const updateData = {
      lastLoginAt: new Date()
    };
    
    // 如果用户文档中没有 _openid，或者 _openid 不正确，则更新
    if (!user._openid || user._openid !== currentOpenid) {
      console.log('🔧 更新用户 _openid:', {
        userId: user._id,
        username: user.username,
        oldOpenid: user._openid,
        newOpenid: currentOpenid
      });
      updateData._openid = currentOpenid;
    }
    
    await db.collection('users').doc(user._id).update({
      data: updateData
    });

    // 生成Token
    const token = generateToken(user._id, user.username, user.role);

    return {
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          userId: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          avatar: user.avatar,
          needChangePassword: user.needChangePassword
        }
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      code: 500,
      message: '登录失败: ' + error.message
    };
  }
}

/**
 * 验证Token
 */
async function verifyToken(event) {
  const { token } = event;

  if (!token) {
    return {
      code: 401,
      message: '未提供访问令牌'
    };
  }

  try {
    const tokenVerification = verifyTokenString(token);
    
    if (!tokenVerification.valid) {
      return {
        code: 401,
        message: tokenVerification.message
      };
    }
    
    const decoded = tokenVerification.payload;

    // 查询用户最新信息
    const userResult = await db.collection('users')
      .doc(decoded.userId)
      .get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = userResult.data[0];

    if (!user.isActive) {
      return {
        code: 403,
        message: '账号已被禁用'
      };
    }

    return {
      code: 200,
      message: '验证成功',
      data: {
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
  } catch (error) {
    return {
      code: 401,
      message: '访问令牌无效'
    };
  }
}

/**
 * 修改密码
 */
async function changePassword(event) {
  const { userId, oldPassword, newPassword } = event;

  if (!userId || !oldPassword || !newPassword) {
    return {
      code: 400,
      message: '参数不完整'
    };
  }

  if (newPassword.length < 6) {
    return {
      code: 400,
      message: '新密码长度不能少于6位'
    };
  }

  try {
    // 查询用户
    const userResult = await db.collection('users')
      .doc(userId)
      .get();

    if (!userResult.data || userResult.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      };
    }

    const user = userResult.data[0];

    // 验证旧密码
    const hashedOldPassword = hashPassword(oldPassword);
    const isPasswordValid = hashedOldPassword === user.password;

    if (!isPasswordValid) {
      return {
        code: 401,
        message: '原密码错误'
      };
    }

    // 加密新密码
    const hashedPassword = hashPassword(newPassword);

    // 更新密码
    await db.collection('users').doc(userId).update({
      data: {
        password: hashedPassword,
        needChangePassword: false,
        updatedAt: new Date()
      }
    });

    return {
      code: 200,
      message: '密码修改成功'
    };
  } catch (error) {
    console.error('修改密码失败:', error);
    return {
      code: 500,
      message: '修改密码失败: ' + error.message
    };
  }
}

/**
 * 创建用户（管理员功能）
 */
async function createUser(event) {
  const { username, password, name, phone, status, createdBy } = event;

  // 参数验证
  if (!username || !password || !name) {
    console.error('❌ 参数验证失败: 用户名、密码或姓名为空');
    return {
      code: 400,
      message: '用户名、密码和姓名不能为空'
    };
  }

  try {
    console.log('🔍 [创建用户] 开始:', { username, name, phone });
    
    // 检查用户名是否已存在
    const existingUser = await db.collection('users')
      .where({ username })
      .get();

    if (existingUser.data.length > 0) {
      console.warn('⚠️ [创建用户] 用户名已存在:', username);
      return {
        code: 409,
        message: '用户名已存在'
      };
    }

    // 🔐 密码加密
    const hashedPassword = hashPassword(password);
    console.log('🔐 [创建用户] 密码加密成功');

    // 创建用户记录
    const userData = {
      username: username.trim(),
      password: hashedPassword, // ✅ 存储加密后的密码
      name: name.trim(),
      phone: phone || '',
      departments: [],
      role: 'employee',
      roles: ['user', 'employee'], // 🔧 添加默认角色数组
      status: status || '在职',
      approvalStatus: 'approved', // ✅ 管理员创建的员工自动审核通过
      isActive: true, // ✅ 账号激活状态
      deleted: false, // 🔧 明确标记未删除
      createdAt: new Date(),
      createdBy: createdBy || 'system',
      updatedAt: new Date()
    };

    console.log('📝 [创建用户] 准备写入数据库:', { username: userData.username, name: userData.name, roles: userData.roles });

    try {
      const result = await db.collection('users').add({
        data: userData
      });

      console.log('🔍 [创建用户] 数据库原始返回:', JSON.stringify(result));
      console.log('🔍 [创建用户] result._id:', result._id);
      console.log('🔍 [创建用户] result.id:', result.id);
      console.log('🔍 [创建用户] result.insertedId:', result.insertedId);

      // ✅ 详细的成功/失败判断
      if (result && (result._id || result.id || result.insertedId)) {
        const userId = result._id || result.id || result.insertedId;
        console.log('✅ [创建用户] 成功:', {
          id: userId,
          username: username,
          name: name
        });
        
        return {
          code: 200,
          message: '用户创建成功',
          data: {
            id: userId,
            username: username,
            name: name,
            created: true // 🔧 明确标记创建成功
          }
        };
      } else {
        console.error('❌ [创建用户] 数据库返回异常，result:', JSON.stringify(result));
        return {
          code: 500,
          message: '用户创建失败：数据库未返回有效ID'
        };
      }
    } catch (dbError) {
      console.error('❌ [创建用户] 数据库操作异常:', dbError);
      console.error('❌ [创建用户] 数据库错误详情:', {
        message: dbError.message,
        stack: dbError.stack,
        code: dbError.code,
        errCode: dbError.errCode,
        errMsg: dbError.errMsg
      });
      throw dbError; // 抛出错误,让外层catch捕获
    }
  } catch (error) {
    console.error('❌ [创建用户] 异常:', error);
    console.error('❌ [创建用户] 错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errCode: error.errCode,
      errMsg: error.errMsg
    });
    
    return {
      code: 500,
      message: '创建用户失败: ' + (error.message || error.errMsg || '未知错误')
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'register':
      return await register(event);
    case 'login':
      return await login(event);
    case 'verifyToken':
      return await verifyToken(event);
    case 'changePassword':
      return await changePassword(event);
    case 'createUser': // ✅ 新增：管理员创建用户
      return await createUser(event);
    default:
      return {
        code: 400,
        message: '未知的操作: ' + action
      };
  }
};
