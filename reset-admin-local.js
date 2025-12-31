const crypto = require('crypto');
const cloudbase = require('@cloudbase/node-sdk');

// 密钥
const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

// 密码哈希函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

// 初始化CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

async function resetAdminPassword() {
  const password = 'admin123';
  const hashedPassword = hashPassword(password);
  
  console.log('🔐 原始密码:', password);
  console.log('🔒 哈希后密码:', hashedPassword);
  
  try {
    // 查找admin用户
    const result = await db.collection('users')
      .where({ username: 'admin' })
      .get();
    
    if (result.data.length === 0) {
      console.log('❌ 未找到admin用户');
      return;
    }
    
    const adminUser = result.data[0];
    console.log('📝 当前admin用户信息:', {
      userId: adminUser._id,
      username: adminUser.username,
      currentPassword: adminUser.password
    });
    
    // 更新密码
    await db.collection('users')
      .doc(adminUser._id)
      .update({
        password: hashedPassword,
        updatedAt: new Date()
      });
    
    console.log('✅ admin密码已重置为: admin123');
    console.log('📊 新密码哈希:', hashedPassword);
    
    // 验证
    const verifyResult = await db.collection('users')
      .doc(adminUser._id)
      .get();
    
    console.log('🔍 验证密码是否更新:', verifyResult.data[0].password === hashedPassword ? '✅成功' : '❌失败');
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  }
}

resetAdminPassword();
