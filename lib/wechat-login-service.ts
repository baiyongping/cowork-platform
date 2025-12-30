import { auth, db } from './cloudbase';

/**
 * 微信扫码登录服务
 * 基于CloudBase微信登录能力
 */

export interface WechatLoginConfig {
  appid: string;
  redirect_uri: string;
}

export interface WechatUserInfo {
  openid: string;
  nickname?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  unionid?: string;
}

/**
 * 初始化微信登录(跳转到微信扫码页面)
 */
export async function initWechatLogin(): Promise<void> {
  try {
    console.log('🚀 开始微信扫码登录流程...');
    
    // 使用CloudBase内置的微信登录
    // signInWithRedirect会自动跳转到微信扫码授权页面
    await auth.signInWithRedirect({
      provider: 'weixinopen', // 微信开放平台网站应用
      redirect: true,
      state: btoa(JSON.stringify({
        timestamp: Date.now(),
        from: 'login-page'
      }))
    });
    
    console.log('✅ 跳转到微信扫码页面成功');
  } catch (error: any) {
    console.error('❌ 微信登录初始化失败:', error);
    throw new Error('微信登录初始化失败: ' + (error?.message || '未知错误'));
  }
}

/**
 * 处理微信登录回调
 * 在页面加载时自动调用,检查是否是微信回调
 */
export async function handleWechatCallback(): Promise<{
  success: boolean;
  user?: any;
  token?: string;
  message: string;
}> {
  try {
    console.log('🔍 检查是否是微信登录回调...');
    
    // ✅ 关键修复：检查URL是否包含微信回调参数
    const urlParams = new URLSearchParams(window.location.search);
    const hasWechatParams = urlParams.has('code') || urlParams.has('state');
    
    if (!hasWechatParams) {
      console.log('ℹ️ URL无微信回调参数,跳过检查');
      return { success: false, message: '非微信回调' };
    }
    
    // 获取当前登录状态
    const loginState = await auth.getLoginState();
    
    if (!loginState) {
      console.log('ℹ️ 未登录,不是微信回调');
      return { success: false, message: '未登录' };
    }
    
    // 检查是否是微信登录
    const user = loginState.user;
    if (!user || !user.uid) {
      console.log('ℹ️ 无用户信息,不是微信回调');
      return { success: false, message: '无用户信息' };
    }
    
    // ✅ 关键修复：检查登录方式是否为微信
    const loginType = loginState.loginType;
    if (loginType !== 'WECHAT-OPEN' && loginType !== 'weixinopen') {
      console.log('ℹ️ 非微信登录方式:', loginType);
      return { success: false, message: '非微信登录' };
    }
    
    console.log('✅ 检测到CloudBase微信登录:', user.uid);
    
    // 获取微信用户信息(CloudBase会自动存储)
    const wechatInfo = user.customUserId || user.uid; // CloudBase存储的微信openid
    
    console.log('📱 微信OpenID:', wechatInfo);
    
    // 查询或创建系统用户
    const systemUser = await findOrCreateUserByWechat(wechatInfo, {
      nickname: user.nickName,
      avatar: user.avatarUrl
    });
    
    if (!systemUser.success) {
      return systemUser;
    }
    
    // 生成系统token
    const token = btoa(JSON.stringify({
      userId: systemUser.user!._id,
      username: systemUser.user!.username,
      role: systemUser.user!.role,
      timestamp: Date.now()
    }));
    
    console.log('✅ 微信登录成功:', systemUser.user!.username);
    
    return {
      success: true,
      user: {
        userId: systemUser.user!._id,
        username: systemUser.user!.username,
        name: systemUser.user!.name,
        email: systemUser.user!.email || '',
        role: systemUser.user!.role,
        roles: systemUser.user!.roles || [], // ✅ 关键修复：包含roles数组
        departments: systemUser.user!.departments || [], // ✅ 包含部门数组
        department: systemUser.user!.department || '',
        avatar: systemUser.user!.avatar,
        position: systemUser.user!.position || '', // ✅ 包含职务
        supervisorId: systemUser.user!.supervisorId || '', // ✅ 包含上级ID
        status: systemUser.user!.status || '在职' // ✅ 包含员工状态
      },
      token,
      message: '微信登录成功'
    };
    
  } catch (error: any) {
    console.error('❌ 处理微信回调失败:', error);
    return {
      success: false,
      message: '微信登录失败: ' + (error?.message || '未知错误')
    };
  }
}

/**
 * 根据微信OpenID查询或创建系统用户
 */
async function findOrCreateUserByWechat(
  wechatOpenId: string,
  wechatInfo: { nickname?: string; avatar?: string }
): Promise<{
  success: boolean;
  message: string;
  user?: any;
}> {
  try {
    console.log('🔍 查询微信用户:', wechatOpenId);
    
    // 1. 先查询是否已绑定
    const existingUser = await db.collection('users')
      .where({ wechatOpenId })
      .get();
    
    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0] as any;
      
      console.log('✅ 找到已绑定用户:', user.username);
      
      // 检查用户状态
      if (!user.isActive) {
        return { success: false, message: '账号已被禁用，请联系管理员' };
      }
      
      if (user.approvalStatus !== 'approved') {
        return { success: false, message: '账号审核未通过，无法登录' };
      }
      
      if (user.status === '离职') {
        return { success: false, message: '账号已离职，无法登录系统' };
      }
      
      if (user.status === '暂停使用') {
        return { success: false, message: '账号已暂停使用，请联系管理员' };
      }
      
      // 更新最后登录时间
      await db.collection('users').doc(user._id).update({
        lastLoginAt: new Date()
      });
      
      return { success: true, message: '登录成功', user };
    }
    
    // 2. 如果未绑定,创建新用户(待审核状态)
    console.log('ℹ️ 微信用户未绑定,创建新用户(待审核)...');
    
    // 生成唯一用户名(微信+时间戳)
    const username = `wx_${Date.now().toString(36)}`;
    
    const newUser = {
      username,
      password: '', // 微信登录无需密码
      email: null,
      name: wechatInfo.nickname || username,
      phone: '', // 微信登录暂不获取手机号
      role: '', // v2.2.0: 不再使用旧的role字段,改用roles数组
      roles: [], // v2.2.0: 新用户默认无角色,待管理员审核后分配
      department: '',
      avatar: wechatInfo.avatar || '',
      wechatOpenId, // 绑定微信OpenID
      loginType: 'wechat', // 登录类型标记
      isActive: true,
      approvalStatus: 'pending', // 首次微信登录需要审核
      approvedBy: null,
      approvedAt: null,
      needChangePassword: false,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').add(newUser);
    
    console.log('✅ 创建微信用户成功(待审核):', result.id);
    
    return {
      success: false, // 返回false表示需要审核
      message: '首次微信登录注册成功,请等待管理员审核后再次登录',
      user: { ...newUser, _id: result.id }
    };
    
  } catch (error: any) {
    console.error('❌ 查询或创建微信用户失败:', error);
    return {
      success: false,
      message: '查询用户失败: ' + (error?.message || '未知错误')
    };
  }
}

/**
 * 绑定微信到已有账号
 * 用于已有账号绑定微信
 */
export async function bindWechatToAccount(
  userId: string,
  wechatOpenId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 检查该微信是否已被其他账号绑定
    const existingBind = await db.collection('users')
      .where({ wechatOpenId })
      .get();
    
    if (existingBind.data.length > 0) {
      const existingUser = existingBind.data[0] as any;
      if (existingUser._id !== userId) {
        return { success: false, message: '该微信已被其他账号绑定' };
      }
      return { success: true, message: '该微信已绑定到当前账号' };
    }
    
    // 绑定微信
    await db.collection('users').doc(userId).update({
      wechatOpenId,
      updatedAt: new Date()
    });
    
    return { success: true, message: '微信绑定成功' };
    
  } catch (error: any) {
    console.error('绑定微信失败:', error);
    return {
      success: false,
      message: '绑定失败: ' + (error?.message || '未知错误')
    };
  }
}

/**
 * 解绑微信
 */
export async function unbindWechat(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    await db.collection('users').doc(userId).update({
      wechatOpenId: null,
      updatedAt: new Date()
    });
    
    return { success: true, message: '微信解绑成功' };
    
  } catch (error: any) {
    console.error('解绑微信失败:', error);
    return {
      success: false,
      message: '解绑失败: ' + (error?.message || '未知错误')
    };
  }
}
