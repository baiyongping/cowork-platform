import { db, auth, ensureAuth, app } from './cloudbase';
import { sendVerificationCodeSms } from './sms-service';

// 密码加密密钥（与初始化脚本保持一致）
const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

// 确保CloudBase已认证（调用 cloudbase.ts 中的认证函数）
async function ensureCloudBaseAuth() {
  try {
    // ✅ 关键修复：注册时需要清除退出标记，允许重新认证
    const { clearLogoutFlag } = await import('./cloudbase');
    clearLogoutFlag();
    
    await ensureAuth();
    console.log('✓ CloudBase 认证已完成');
  } catch (error) {
    console.error('❌ CloudBase认证失败:', error);
    throw new Error('系统初始化失败，请刷新页面重试');
  }
}

// SHA-256密码哈希函数（与初始化脚本保持一致）
async function hashPassword(password: string): Promise<string> {
  // 🔒 强制使用云函数加密，确保前后端算法完全一致
  console.log('🔐 使用云函数加密密码...');
  
  // 确保 CloudBase 已完成认证
  await ensureAuth();
  
  const result = await app.callFunction({
    name: 'user-management',
    data: {
      action: 'hashPassword',
      password: password
    }
  });
  
  if (!result.result || !result.result.success) {
    throw new Error('密码加密失败');
  }
  
  console.log('✅ 密码加密成功:', result.result.hash.substring(0, 8) + '...');
  return result.result.hash;
}


export interface UserData {
  username: string;
  password: string;
  email?: string;
  name?: string;
  role?: string;
  department?: string;
  phone?: string;
  verificationCode?: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  userId?: string; // 添加 userId 字段支持
  user?: {
    userId: string;
    username: string;
    name: string;
    email: string;
    role: string;
    roles?: string[]; // 添加 roles 数组支持
    departments?: string[]; // 添加 departments 数组支持
    department: string;
    avatar: string;
    position?: string; // 添加职务
    supervisorId?: string; // 添加上级ID
    status?: string; // 添加状态
  };
  token?: string;
}

/**
 * 发送短信验证码
 */
export async function sendVerificationCode(phone: string): Promise<{ success: boolean; message: string; verificationCode?: string }> {
  try {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // ✅ 关键修复：发送验证码时清除退出标记，允许重新认证
    const { clearLogoutFlag } = await import('./cloudbase');
    clearLogoutFlag();
    
    // 确保CloudBase已认证
    await ensureCloudBaseAuth();

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存验证码到数据库（5分钟有效期）
    await db.collection('sms_codes').add({
      phone,
      code,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      used: false
    });

    // 🧪 测试模式：直接弹窗显示验证码（避免配置腾讯云短信服务）
    // 生产环境请启用下面的短信发送代码
    
    console.log('🧪 测试环境 - 验证码已生成:', code);
    
    // ⚠️ 开发/测试环境：弹窗显示验证码
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (isDevelopment) {
      // 弹窗显示验证码（方便测试）
      const message = [
        '📱 测试环境 - 验证码已生成',
        '',
        `手机号: ${phone}`,
        `验证码: ${code}`,
        '',
        '有效期: 5分钟',
        '',
        '💡 生产环境将通过短信真实发送'
      ].join('\n');
      
      alert(message);
      return { 
        success: true, 
        message: `验证码已生成: ${code}`,
        verificationCode: code // 返回验证码供前端使用
      };
    }
    
    // 🚀 生产环境：真实发送短信
    try {
      const smsResult = await sendVerificationCodeSms(phone, code);
      
      if (smsResult.success) {
        return { success: true, message: '验证码已发送，请查收短信' };
      } else {
        // 即使短信发送失败，验证码已保存在数据库，可以继续使用
        return { success: true, message: '验证码已生成，请使用验证码：' + code };
      }
    } catch (smsError) {
      // 短信服务未配置或发送失败，仍返回验证码（测试用）
      console.warn('短信发送失败，返回验证码供测试:', smsError);
      alert(`⚠️ 短信发送失败\n\n验证码: ${code}\n\n请手动输入此验证码`);
      return { success: true, message: `验证码: ${code} (短信发送失败，请手动使用)` };
    }

  } catch (error: any) {
    console.error('发送验证码失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '发送验证码失败: ' + errorMsg };
  }
}

/**
 * 验证短信验证码
 */
async function verifyCode(phone: string, code: string): Promise<boolean> {
  try {
    const result = await db.collection('sms_codes')
      .where({
        phone,
        code,
        used: false
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return false;
    }

    const smsCode = result.data[0] as any;
    
    // 检查是否过期
    if (new Date(smsCode.expiresAt) < new Date()) {
      return false;
    }

    // 标记为已使用
    await db.collection('sms_codes').doc(smsCode._id).update({
      used: true
    });

    return true;
  } catch (error) {
    console.error('验证码验证失败:', error);
    return false;
  }
}

/**
 * 用户注册
 */
export async function register(userData: UserData): Promise<LoginResult> {
  try {
    // 确保CloudBase已认证
    await ensureCloudBaseAuth();
    
    const { 
      username, 
      password, 
      email = '', 
      name = username, 
      role = 'user', 
      department = '',
      phone = '',
      verificationCode = ''
    } = userData;

    // 参数验证
    if (!username || !password) {
      return { success: false, message: '用户名和密码不能为空' };
    }

    if (!phone) {
      return { success: false, message: '手机号不能为空' };
    }

    if (!verificationCode) {
      return { success: false, message: '验证码不能为空' };
    }

    if (password.length < 6) {
      return { success: false, message: '密码长度不能少于6位' };
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // 验证短信验证码
    const isCodeValid = await verifyCode(phone, verificationCode);
    if (!isCodeValid) {
      return { success: false, message: '验证码错误或已过期' };
    }

    // 检查用户名是否已存在
    const existingUser = await db.collection('users').where({ username }).get();
    if (existingUser.code) {
      console.error('❌ CloudBase查询错误:', existingUser.code, existingUser.message);
      return { success: false, message: '查询失败，请稍后重试' };
    }
    if (existingUser.data && existingUser.data.length > 0) {
      return { success: false, message: '用户名已被使用，请更换其他用户名' };
    }

    // 检查手机号是否已存在
    const existingPhone = await db.collection('users').where({ phone }).get();
    if (existingPhone.code) {
      console.error('❌ CloudBase查询错误:', existingPhone.code, existingPhone.message);
      return { success: false, message: '查询失败，请稍后重试' };
    }
    if (existingPhone.data && existingPhone.data.length > 0) {
      return { success: false, message: '手机号已被注册' };
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await db.collection('users').where({ email }).get();
      if (existingEmail.code) {
        console.error('❌ CloudBase查询错误:', existingEmail.code, existingEmail.message);
        return { success: false, message: '查询失败，请稍后重试' };
      }
      if (existingEmail.data && existingEmail.data.length > 0) {
        return { success: false, message: '邮箱已被注册' };
      }
    }

    // 密码加密（SHA-256）
    const hashedPassword = await hashPassword(password);

    // 创建用户（默认状态为待审核）
    const newUserData = {
      username,
      password: hashedPassword,
      email: email || null, // 🔧 修复：空email使用null而不是''，避免唯一索引冲突
      name,
      phone,
      role: 'user', // 🎯 固定为user，所有新用户默认为普通用户
      roles: ['user'], // ✅ 新增：默认分配user角色数组
      departments: [], // ✅ 新增：默认空部门数组
      department: department || '',
      avatar: '',
      position: '', // ✅ 新增：默认空职务
      supervisorId: '', // ✅ 新增：默认无上级
      status: '在职', // ✅ 新增：默认在职状态
      isActive: true,
      approvalStatus: 'pending', // 审核状态: pending-待审核, approved-已通过, rejected-已拒绝
      approvedBy: null,
      approvedAt: null,
      rejectReason: null,
      needChangePassword: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 准备创建用户
    
    const result = await db.collection('users').add(newUserData);

    return {
      success: true,
      message: '注册成功，等待管理员审核',
      userId: result.id || '未知ID'
    };
  } catch (error: any) {
    console.error('注册失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '注册失败: ' + errorMsg };
  }
}

/**
 * 用户登录
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    // ✅ 修复：登录时不需要检查认证状态，这是用户登录前的操作
    // 🔧 确保CloudBase SDK已初始化即可
    await ensureAuth();
    
    if (!username || !password) {
      return { success: false, message: '用户名和密码不能为空' };
    }

    // 🔧 正确流程：直接调用auth云函数，传明文密码
    // auth云函数内部会加密密码并验证
    console.log('🔐 调用auth云函数验证登录...');
    console.log('📤 发送数据:', { action: 'login', username, password: '***' });
    
    const result = await app.callFunction({
      name: 'auth',
      data: {
        action: 'login',
        username,
        password // 传明文密码
      }
    });

    console.log('📥 云函数返回:', result);

    if (!result.result) {
      console.error('❌ 云函数调用失败:', result);
      return { success: false, message: '登录失败，请稍后重试' };
    }

    // 🔧 修复：正确解析云函数返回格式
    const responseData = result.result as any;
    const { code, message, data } = responseData;
    
    // 从 data 对象中提取 user 和 token
    const user = data?.user;
    const token = data?.token;
    
    console.log('📊 解析结果:', { code, message, user: user?.username, hasToken: !!token });

    if (code !== 200) {
      return { success: false, message };
    }

    if (!user || !token) {
      console.error('❌ 云函数返回数据不完整:', { user, token });
      return { success: false, message: '登录数据不完整，请重试' };
    }

    console.log('✅ 登录成功');

    return {
      success: true,
      message: '登录成功',
      user: {
        userId: user.userId,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles || [],
        departments: user.departments || [],
        department: user.department,
        avatar: user.avatar || '',
        position: user.position || '',
        supervisorId: user.supervisorId || '',
        status: user.status || '在职'
      },
      token
    };
  } catch (error: any) {
    console.error('登录失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '登录失败: ' + errorMsg };
  }
}

/**
 * 验证Token
 */
export function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const payload = JSON.parse(atob(token));
    
    // 检查token是否过期（7天）
    const expiryTime = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.timestamp > expiryTime) {
      return { valid: false };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * 修改密码
 */
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // 确保CloudBase已认证
    await ensureAuth();
    
    if (!userId || !oldPassword || !newPassword) {
      return { success: false, message: '参数不完整' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: '新密码长度不能少于6位' };
    }

    console.log('🔐 开始修改密码:', { userId, hasOldPwd: !!oldPassword, hasNewPwd: !!newPassword });

    // 调用云函数修改密码
    const result = await app.callFunction({
      name: 'user-management',
      data: {
        action: 'updatePassword',
        userId, // ✅ 传递用户ID
        oldPassword,
        newPassword
      }
    });

    console.log('📥 云函数返回:', result);

    if (!result.result) {
      console.error('❌ 云函数调用失败:', result);
      return { success: false, message: '修改密码失败，请稍后重试' };
    }

    const responseData = result.result as any;
    
    if (!responseData.success) {
      return { success: false, message: responseData.error || responseData.message || '修改密码失败' };
    }

    return { success: true, message: '密码修改成功' };
  } catch (error: any) {
    console.error('修改密码失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '修改密码失败: ' + errorMsg };
  }
}

/**
 * 修改手机号（用户自己修改）
 */
export async function changePhone(
  userId: string, 
  newPhone: string, 
  verificationCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 确保CloudBase已认证
    await ensureCloudBaseAuth();
    
    if (!userId || !newPhone || !verificationCode) {
      return { success: false, message: '参数不完整' };
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(newPhone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // 验证短信验证码
    const isCodeValid = await verifyCode(newPhone, verificationCode);
    if (!isCodeValid) {
      return { success: false, message: '验证码错误或已过期' };
    }

    // 查询当前用户
    const currentUserResult = await db.collection('users').doc(userId).get();
    
    if (currentUserResult.code) {
      console.error('❌ CloudBase查询错误:', currentUserResult.code, currentUserResult.message);
      return { success: false, message: '查询失败，请稍后重试' };
    }
    
    if (!currentUserResult.data || currentUserResult.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }

    const currentUser = currentUserResult.data[0] as any;

    // 检查新手机号是否与当前手机号相同
    if (currentUser.phone === newPhone) {
      return { success: false, message: '新手机号与当前手机号相同' };
    }

    // 检查新手机号是否已被其他用户使用
    const existingPhoneResult = await db.collection('users')
      .where({ phone: newPhone })
      .get();
    
    if (existingPhoneResult.data.length > 0) {
      // 检查是否是其他用户（排除当前用户）
      const otherUser = existingPhoneResult.data.find((u: any) => u._id !== userId);
      if (otherUser) {
        return { success: false, message: '该手机号已被其他用户使用' };
      }
    }

    // 更新手机号
    await db.collection('users').doc(userId).update({
      phone: newPhone,
      updatedAt: new Date()
    });

    return { success: true, message: '手机号修改成功' };
  } catch (error: any) {
    console.error('修改手机号失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '修改手机号失败: ' + errorMsg };
  }
}
export async function resetPassword(phone: string, verificationCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // 确保CloudBase已认证
    await ensureCloudBaseAuth();
    
    if (!phone || !verificationCode || !newPassword) {
      return { success: false, message: '参数不完整' };
    }

    if (newPassword.length < 6) {
      return { success: false, message: '新密码长度不能少于6位' };
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { success: false, message: '手机号格式不正确' };
    }

    // 验证短信验证码
    const isCodeValid = await verifyCode(phone, verificationCode);
    if (!isCodeValid) {
      return { success: false, message: '验证码错误或已过期' };
    }

    // 查询用户（通过手机号）
    const userResult = await db.collection('users').where({ phone }).get();

    if (userResult.data.length === 0) {
      return { success: false, message: '该手机号未注册' };
    }

    const user = userResult.data[0] as any;

    // 加密新密码
    const hashedNewPassword = await hashPassword(newPassword);

    // 更新密码
    await db.collection('users').doc(user._id).update({
      password: hashedNewPassword,
      needChangePassword: false,
      updatedAt: new Date()
    });

    return { success: true, message: '密码重置成功，请使用新密码登录' };
  } catch (error: any) {
    console.error('重置密码失败:', error);
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '未知错误';
    return { success: false, message: '重置密码失败: ' + errorMsg };
  }
}
