/**
 * 初始化 admin 用户
 * 用户名: admin
 * 密码: admin123
 */

const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  
  try {
    console.log('🔐 开始初始化 admin 用户...');
    
    // 密码加密密钥（与前端保持一致）
    const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';
    const password = 'admin123';
    
    // SHA-256 加密密码
    const hash = crypto.createHmac('sha256', SECRET_KEY)
      .update(password)
      .digest('hex');
    
    console.log('✅ 密码加密完成');
    
    // 检查 admin 用户是否已存在
    const existingUser = await db.collection('users')
      .where({ username: 'admin' })
      .limit(1)
      .get();
    
    if (existingUser.data && existingUser.data.length > 0) {
      console.log('⚠️ admin 用户已存在，更新密码...');
      
      // 更新密码
      await db.collection('users')
        .where({ username: 'admin' })
        .update({
          password: hash,
          updatedAt: new Date().toISOString()
        });
      
      return {
        success: true,
        message: 'admin 用户密码已更新为 admin123',
        user: {
          username: 'admin',
          name: existingUser.data[0].name
        }
      };
    }
    
    // 创建新的 admin 用户
    console.log('📝 创建新的 admin 用户...');
    
    const adminUser = {
      username: 'admin',
      password: hash,
      name: '系统管理员',
      phone: '13800138000',
      email: 'admin@jihua.com',
      department: '管理部',
      departmentId: 'dept-001',
      role: 'admin',
      approvalStatus: 'approved',
      status: 'active',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      loginHistory: []
    };
    
    await db.collection('users').add(adminUser);
    
    console.log('✅ admin 用户创建成功');
    
    return {
      success: true,
      message: 'admin 用户创建成功！用户名: admin, 密码: admin123',
      user: {
        username: 'admin',
        name: '系统管理员',
        email: 'admin@jihua.com'
      }
    };
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return {
      success: false,
      error: error.message,
      message: '初始化 admin 用户失败'
    };
  }
};
