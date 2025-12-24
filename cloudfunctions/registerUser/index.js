/**
 * 用户注册云函数
 * 功能：用户自主注册（无需邀请码）
 */
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 生成密码哈希
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.main = async (event, context) => {
  const { name } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 1. 验证必填参数
    if (!name) {
      return {
        code: 400,
        message: '请填写姓名'
      };
    }

    // 2. 使用 OpenID 作为用户名（确保唯一性）
    const username = wxContext.OPENID;

    // 3. 检查是否已注册
    const { data: existingUsers } = await db.collection('users')
      .where({
        wxOpenId: wxContext.OPENID
      })
      .get();

    if (existingUsers.length > 0) {
      return {
        code: 400,
        message: '您已注册，请直接登录'
      };
    }

    // 4. 生成默认密码（OpenID的前8位）
    const defaultPassword = wxContext.OPENID.substring(0, 8);
    const hashedPassword = hashPassword(defaultPassword);

    // 5. 创建用户记录
    const newUser = {
      username: username,
      password: hashedPassword,
      name: name,
      phone: '', // 待绑定
      email: '',
      departments: [],
      roles: ['employee'], // 默认员工角色
      isActive: false, // 待审核
      approvalStatus: 'pending', // 审核状态：pending/approved/rejected
      wxOpenId: wxContext.OPENID,
      wxNickname: '',
      wxAvatar: '',
      wxBindTime: Date.now(),
      phoneBindTime: null, // 手机号绑定时间
      isPhoneBound: false, // 是否已绑定手机号
      createdAt: Date.now(),
      createdBy: 'self-registration'
    };

    const { _id } = await db.collection('users').add({
      data: newUser
    });

    // 6. 创建操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: _id,
        action: '用户注册',
        module: '用户管理',
        content: `新用户 ${name} 自主注册`,
        createdAt: Date.now()
      }
    });

    return {
      code: 200,
      message: '注册成功，请等待管理员审核',
      data: {
        userId: _id,
        username: username,
        name: name,
        defaultPassword: defaultPassword // 返回默认密码供用户记录
      }
    };

  } catch (error) {
    console.error('注册失败:', error);
    return {
      code: 500,
      message: error.message || '注册失败，请稍后重试'
    };
  }
};
