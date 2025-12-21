/**
 * 修复Admin用户脚本
 * 使用后端CloudBase SDK直接操作数据库
 */

import cloudbase from '@cloudbase/node-sdk';
import crypto from 'crypto';

// 初始化CloudBase
const app = cloudbase.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = app.database();
const SECRET_KEY = 'jihua-oa-platform-secret-key-2025';

// 密码加密函数（与前端保持一致）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

// 查询Admin用户
async function queryAdminUser() {
  console.log('\n========== 步骤1: 查询Admin用户 ==========');
  
  try {
    const result = await db.collection('users')
      .where({ username: 'admin' })
      .get();

    if (result.data.length === 0) {
      console.log('❌ 未找到admin用户');
      return null;
    }

    const admin = result.data[0];
    console.log('✓ 找到admin用户:');
    console.log(JSON.stringify({
      _id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      approvalStatus: admin.approvalStatus,
      isActive: admin.isActive,
      status: admin.status,
      approvedBy: admin.approvedBy,
      approvedAt: admin.approvedAt,
      createdAt: admin.createdAt,
      password_preview: admin.password ? admin.password.substring(0, 20) + '...' : 'null'
    }, null, 2));

    // 检查问题
    const issues = [];
    if (admin.approvalStatus !== 'approved') {
      issues.push(`❌ approvalStatus = "${admin.approvalStatus}" (应该是 "approved")`);
    }
    if (!admin.isActive) {
      issues.push(`❌ isActive = ${admin.isActive} (应该是 true)`);
    }
    if (admin.status !== '在职') {
      issues.push(`❌ status = "${admin.status}" (应该是 "在职")`);
    }

    if (issues.length > 0) {
      console.log('\n⚠️  发现问题:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✓ 所有字段正常');
    }

    return admin;

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    return null;
  }
}

// 测试密码哈希
async function testPasswordHash(admin) {
  console.log('\n========== 步骤2: 测试密码哈希 ==========');
  
  const testPassword = 'admin123';
  const generatedHash = hashPassword(testPassword);
  
  console.log('密码:', testPassword);
  console.log('使用密钥:', SECRET_KEY);
  console.log('生成的哈希:', generatedHash);
  
  if (admin && admin.password) {
    console.log('数据库哈希:', admin.password);
    
    const match = generatedHash === admin.password;
    console.log('匹配结果:', match ? '✓ 匹配' : '✗ 不匹配');
    
    return match;
  }
  
  return false;
}

// 修复Admin用户
async function fixAdminUser(adminId) {
  console.log('\n========== 步骤3: 修复Admin用户 ==========');
  
  try {
    const passwordHash = hashPassword('admin123');
    const now = new Date();

    const updateData = {
      password: passwordHash,
      approvalStatus: 'approved',
      isActive: true,
      status: '在职',
      approvedBy: 'system',
      approvedAt: now,
      rejectReason: null,
      updatedAt: now
    };

    if (adminId) {
      // 更新现有用户
      await db.collection('users')
        .doc(adminId)
        .update(updateData);
      
      console.log('✓ Admin用户更新成功！');
    } else {
      // 创建新用户
      updateData.username = 'admin';
      updateData.name = '系统管理员';
      updateData.email = 'admin@jihua.com';
      updateData.phone = '13800138000';
      updateData.role = 'admin';
      updateData.department = '';
      updateData.avatar = '';
      updateData.needChangePassword = false;
      updateData.lastLoginAt = null;
      updateData.createdAt = now;

      const result = await db.collection('users').add(updateData);
      console.log('✓ Admin用户创建成功！ID:', result.id);
    }

    console.log('\n更新的字段:');
    console.log('- password: 重置为 admin123 (已加密)');
    console.log('- approvalStatus: approved');
    console.log('- isActive: true');
    console.log('- status: 在职');
    console.log('- approvedBy: system');
    console.log('- approvedAt:', now.toISOString());

    return true;

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    return false;
  }
}

// 测试登录流程
async function testLogin() {
  console.log('\n========== 步骤4: 测试登录流程 ==========');
  
  const username = 'admin';
  const password = 'admin123';
  
  try {
    // 1. 查询用户
    const userResult = await db.collection('users')
      .where({ username })
      .get();
    
    if (userResult.data.length === 0) {
      console.log('✗ 步骤1: 用户不存在');
      return false;
    }
    console.log('✓ 步骤1: 找到用户', username);

    const user = userResult.data[0];

    // 2. 检查isActive
    if (!user.isActive) {
      console.log('✗ 步骤2: 账号已被禁用');
      return false;
    }
    console.log('✓ 步骤2: 账号已激活');

    // 3. 检查approvalStatus
    if (user.approvalStatus === 'pending') {
      console.log('✗ 步骤3: 账号正在审核中');
      return false;
    }
    if (user.approvalStatus === 'rejected') {
      console.log('✗ 步骤3: 账号审核未通过');
      return false;
    }
    if (user.approvalStatus !== 'approved') {
      console.log(`✗ 步骤3: 账号状态异常 (approvalStatus = "${user.approvalStatus}")`);
      return false;
    }
    console.log('✓ 步骤3: 审核状态正常 (approved)');

    // 4. 验证密码
    const hashedInputPassword = hashPassword(password);
    if (hashedInputPassword !== user.password) {
      console.log('✗ 步骤4: 密码错误');
      console.log('  输入密码哈希:', hashedInputPassword);
      console.log('  数据库密码哈希:', user.password);
      return false;
    }
    console.log('✓ 步骤4: 密码验证通过');

    // 5. 登录成功
    console.log('\n🎉 登录测试成功！');
    console.log('用户信息:');
    console.log('- ID:', user._id);
    console.log('- 用户名:', user.username);
    console.log('- 姓名:', user.name);
    console.log('- 角色:', user.role);
    console.log('- 部门:', user.department || '无');

    return true;

  } catch (error) {
    console.error('❌ 登录测试失败:', error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🔧 Admin用户诊断与修复工具');
  console.log('================================\n');

  try {
    // 步骤1: 查询
    const admin = await queryAdminUser();
    
    // 步骤2: 测试密码
    const passwordMatch = await testPasswordHash(admin);
    
    // 步骤3: 修复
    const needsFix = !admin || 
                     admin.approvalStatus !== 'approved' || 
                     !admin.isActive || 
                     admin.status !== '在职' ||
                     !passwordMatch;
    
    if (needsFix) {
      console.log('\n⚠️  需要修复admin用户');
      const fixed = await fixAdminUser(admin ? admin._id : null);
      
      if (!fixed) {
        console.log('\n❌ 修复失败，请检查错误信息');
        process.exit(1);
      }
    } else {
      console.log('\n✓ Admin用户状态正常，无需修复');
    }
    
    // 步骤4: 测试登录
    const loginSuccess = await testLogin();
    
    if (loginSuccess) {
      console.log('\n================================');
      console.log('✅ 所有检查通过！');
      console.log('\n现在可以使用以下账号登录:');
      console.log('用户名: admin');
      console.log('密码: admin123');
      console.log('================================\n');
    } else {
      console.log('\n================================');
      console.log('❌ 登录测试失败');
      console.log('请检查上面的错误信息');
      console.log('================================\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  }
}

// 运行
main();
