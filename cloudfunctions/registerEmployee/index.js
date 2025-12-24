/**
 * 员工注册云函数（小程序专用）
 * 功能：OpenID 注册新员工（个人开发者版）
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { name, nickName, avatarUrl, phoneCode } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  console.log('📝 注册请求 (OpenID方案):', {
    openid,
    name,
    nickName,
    hasAvatar: !!avatarUrl,
    hasPhoneCode: !!phoneCode
  });

  try {
    // 1. ⭐ 检查用户是否已存在（使用 _openid）
    const { data: existingUsers } = await db.collection('users')
      .where({ _openid: openid })
      .get();

    if (existingUsers.length > 0) {
      console.log('❌ 用户已存在:', existingUsers[0]._id);
      return {
        success: false,
        message: '您已注册，无需重复注册'
      };
    }

    // 2. 📱 处理手机号（如果提供了 phoneCode）
    let phoneNumber = null;
    if (phoneCode) {
      try {
        const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({
          code: phoneCode
        });
        phoneNumber = phoneRes.phoneInfo?.purePhoneNumber || phoneRes.phoneInfo?.phoneNumber;
        console.log('📞 获取手机号成功:', phoneNumber);
        
        // 检查手机号是否已被使用
        if (phoneNumber) {
          const { data: phoneUsers } = await db.collection('users')
            .where({ phoneNumber })
            .get();
          
          if (phoneUsers.length > 0) {
            return {
              success: false,
              message: '该手机号已被其他账号绑定'
            };
          }
        }
      } catch (phoneErr) {
        console.warn('⚠️ 获取手机号失败:', phoneErr);
        // 手机号非必填，失败不影响注册
      }
    }

    // 3. 🖼️ 处理头像上传到云存储
    let permanentAvatarUrl = avatarUrl;
    
    if (avatarUrl && (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://'))) {
      try {
        const fileExtension = 'png';
        const cloudPath = `avatars/${openid}_${Date.now()}.${fileExtension}`;
        
        // 下载临时文件
        const res = await cloud.downloadFile({
          fileID: avatarUrl
        });
        
        // 上传到云存储
        const uploadRes = await cloud.uploadFile({
          cloudPath,
          fileContent: res.fileContent
        });
        
        permanentAvatarUrl = uploadRes.fileID;
        console.log('✅ 头像上传成功:', permanentAvatarUrl);
        
      } catch (uploadErr) {
        console.warn('⚠️ 头像上传失败，使用临时URL:', uploadErr);
      }
    }

    // 4. 创建用户记录（OpenID方案）
    const now = new Date().getTime();
    const userData = {
      _openid: openid,  // ⭐ 使用 _openid 作为主键
      name: name,
      nickName: nickName || '',
      avatarUrl: permanentAvatarUrl || '',
      roles: ['employee'],
      departments: [],
      status: 'pending',
      approvalStatus: 'pending',
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };

    // 如果有手机号，添加到用户数据
    if (phoneNumber) {
      userData.phoneNumber = phoneNumber;
    }

    const addResult = await db.collection('users').add({
      data: userData
    });

    console.log('✅ 用户创建成功（待审核）:', addResult._id);

    return {
      success: true,
      _id: addResult._id,
      message: phoneNumber 
        ? '注册成功，等待管理员审核' 
        : '注册成功（建议绑定手机号以便账号找回）',
      data: {
        _id: addResult._id,
        hasPhoneNumber: !!phoneNumber,
        ...userData
      }
    };

  } catch (error) {
    console.error('❌ 注册失败:', error);
    return {
      success: false,
      message: error.message || '注册失败，请稍后重试'
    };
  }
};
