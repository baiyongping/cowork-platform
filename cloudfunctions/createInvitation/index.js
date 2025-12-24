/**
 * 创建邀请注册码云函数
 * 功能：生成邀请码和小程序码
 * 
 * 使用HTTPS方式直接调用微信API，避免云开发环境权限配置问题
 */
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 小程序配置（从环境变量读取）
const APPID = 'wx79afc92f6fe01a31';
const SECRET = process.env.WX_APP_SECRET || '';

/**
 * 生成唯一邀请码
 */
function generateInvitationCode() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 获取微信 access_token
 */
function getAccessToken() {
  if (!SECRET) {
    throw new Error('未配置小程序 AppSecret，请在云函数环境变量中设置 WX_APP_SECRET');
  }
  
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            console.log('✅ access_token 获取成功');
            resolve(result.access_token);
          } else {
            reject(new Error(`获取access_token失败: ${result.errmsg || JSON.stringify(result)}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * 调用微信API生成小程序码
 */
function generateMiniProgramCode(accessToken, scene) {
  const postData = JSON.stringify({
    scene: scene,
    page: 'pages/register/register',
    check_path: false, // 开发阶段不检查路径
    env_version: 'develop', // 使用开发版
    width: 280,
    is_hyaline: true // 透明底色
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.weixin.qq.com',
      port: 443,
      path: `/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // 检查是否返回错误信息（JSON格式）
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            const error = JSON.parse(buffer.toString());
            reject(new Error(`微信API错误: ${error.errmsg} (${error.errcode})`));
          } catch {
            reject(new Error('生成小程序码失败'));
          }
        } else {
          // 返回图片Buffer
          console.log('✅ 小程序码生成成功');
          resolve(buffer);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.main = async (event, context) => {
  const { action = 'create' } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'create':
        return await createInvitation(wxContext);
      case 'verify':
        return await verifyInvitation(event.code);
      case 'list':
        return await listInvitations();
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('邀请码操作失败:', error);
    return {
      code: 500,
      message: error.message || '操作失败'
    };
  }
};

/**
 * 创建邀请码（用于生成小程序码）
 */
async function createInvitation(wxContext) {
  const invitationCode = generateInvitationCode();
  const now = Date.now();
  const expireAt = now + 1 * 24 * 60 * 60 * 1000; // 1天有效期

  // 插入邀请码记录
  await db.collection('invitation_codes').add({
    data: {
      code: invitationCode,
      status: 'active', // active/expired
      createdBy: wxContext.OPENID,
      createdAt: now,
      expireAt: expireAt,
      usageCount: 0, // 记录使用次数，但不限制
      usageHistory: [] // 记录使用历史
    }
  });

  console.log(`📝 邀请码创建成功: ${invitationCode}`);

  // 生成小程序码（使用HTTPS直连方式）
  try {
    // 1. 获取 access_token
    const accessToken = await getAccessToken();
    
    // 2. 调用微信API生成小程序码
    const qrCodeBuffer = await generateMiniProgramCode(accessToken, invitationCode);

    return {
      code: 200,
      message: '邀请码和小程序码生成成功',
      data: {
        invitationCode,
        expireAt,
        qrCodeBuffer: qrCodeBuffer // 返回小程序码图片buffer
      }
    };
  } catch (error) {
    console.error('❌ 生成小程序码失败:', error);
    
    // 返回邀请码和详细错误信息
    return {
      code: 200,
      message: '邀请码已生成，但小程序码生成失败',
      data: {
        invitationCode,
        expireAt,
        errorMessage: error.message || '小程序码生成失败',
        errorDetails: error.stack
      }
    };
  }
}

/**
 * 验证邀请码（可多次使用，只检查是否过期）
 */
async function verifyInvitation(code, openid = null) {
  if (!code) {
    return {
      code: 400,
      message: '邀请码不能为空'
    };
  }

  // 查询邀请码
  const { data: invitations } = await db.collection('invitation_codes')
    .where({
      code: code
    })
    .get();

  if (invitations.length === 0) {
    return {
      code: 404,
      message: '邀请码不存在'
    };
  }

  const invitation = invitations[0];
  const now = Date.now();

  // 检查是否过期
  if (now > invitation.expireAt) {
    // 更新状态为已过期
    await db.collection('invitation_codes').doc(invitation._id).update({
      data: {
        status: 'expired'
      }
    });

    return {
      code: 400,
      message: '邀请码已过期'
    };
  }

  // 记录使用（如果提供了openid）
  if (openid) {
    await db.collection('invitation_codes').doc(invitation._id).update({
      data: {
        usageCount: db.command.inc(1),
        usageHistory: db.command.push({
          openid: openid,
          usedAt: now
        })
      }
    });
  }

  return {
    code: 200,
    message: '邀请码有效',
    data: {
      valid: true,
      invitation
    }
  };
}

/**
 * 列出所有邀请码
 */
async function listInvitations() {
  const { data: invitations } = await db.collection('invitation_codes')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return {
    code: 200,
    data: {
      invitations
    }
  };
}
