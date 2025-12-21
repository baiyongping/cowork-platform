/**
 * 移除废弃的user角色
 * 
 * 功能:
 * 1. 查找所有使用user角色的用户
 * 2. 将user角色清空,避免权限匹配失败
 * 3. 提示管理员为这些用户分配正确的角色
 */

import tcb from '@cloudbase/node-sdk';

const app = tcb.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = app.database();

async function removeUserRole() {
  try {
    console.log('🔍 开始查找使用user角色的用户...');
    
    // 查找所有role为user的用户
    const result = await db.collection('users')
      .where({
        role: 'user'
      })
      .get();
    
    const userRoleUsers = result.data;
    
    console.log(`📊 找到 ${userRoleUsers.length} 个使用user角色的用户`);
    
    if (userRoleUsers.length === 0) {
      console.log('✅ 没有用户使用user角色,无需处理');
      return;
    }
    
    // 显示用户信息
    console.log('\n📋 用户列表:');
    userRoleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.name}) - roles: ${JSON.stringify(user.roles || [])}`);
    });
    
    console.log('\n⏳ 开始更新用户数据...');
    
    // 批量更新用户
    let updateCount = 0;
    for (const user of userRoleUsers) {
      try {
        await db.collection('users').doc(user._id).update({
          role: '', // 清空旧的role字段
          roles: user.roles || [] // 确保有roles字段
        });
        
        updateCount++;
        console.log(`  ✅ 更新成功: ${user.username}`);
      } catch (error) {
        console.error(`  ❌ 更新失败: ${user.username}`, error.message);
      }
    }
    
    console.log(`\n✅ 更新完成! 成功更新 ${updateCount}/${userRoleUsers.length} 个用户`);
    
    // 提示管理员后续操作
    console.log('\n📌 后续操作提示:');
    console.log('1. 请管理员登录系统');
    console.log('2. 进入"系统设置 > 员工管理"');
    console.log('3. 为以下用户分配正确的角色:');
    userRoleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.name})`);
    });
    
  } catch (error) {
    console.error('❌ 处理失败:', error);
  } finally {
    process.exit(0);
  }
}

removeUserRole();
