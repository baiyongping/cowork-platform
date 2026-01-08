/**
 * 数据迁移脚本：将用户的单角色字段转换为多角色数组
 * 执行方式：node scripts/migrate-roles-to-array.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb', // 生产环境ID
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY
});

const db = app.database();
const _ = db.command;

async function migrateRoles() {
  console.log('🚀 开始迁移用户角色数据...\n');

  try {
    // 1. 查询所有用户
    const result = await db.collection('users').get();
    const users = result.data;

    console.log(`📊 总用户数: ${users.length}`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. 遍历每个用户
    for (const user of users) {
      try {
        // 检查是否已经有 roles 数组
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          console.log(`⏭️  跳过用户 ${user.username} (${user.name}) - 已有roles数组:`, user.roles);
          skippedCount++;
          continue;
        }

        // 如果有 role 字段（单角色）
        if (user.role) {
          // 转换为 roles 数组
          const roles = [user.role];
          
          console.log(`✏️  迁移用户 ${user.username} (${user.name})`);
          console.log(`   原始role: ${user.role} → roles数组: ${JSON.stringify(roles)}`);

          // 更新数据库
          await db.collection('users').doc(user._id).update({
            roles: roles, // 新的多角色数组
            role: user.role, // 保留旧字段以兼容（可选）
            updatedAt: new Date()
          });

          console.log(`   ✅ 迁移成功\n`);
          migratedCount++;
        } else {
          // 既没有 roles 也没有 role
          console.log(`⚠️  用户 ${user.username} (${user.name}) 没有角色，设置为空数组`);
          
          await db.collection('users').doc(user._id).update({
            roles: [], // 设置为空数组
            updatedAt: new Date()
          });

          console.log(`   ✅ 设置完成\n`);
          migratedCount++;
        }

        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ 处理用户 ${user.username} 失败:`, error.message);
        errorCount++;
      }
    }

    // 3. 输出迁移统计
    console.log('\n' + '='.repeat(60));
    console.log('📊 迁移完成统计:');
    console.log('='.repeat(60));
    console.log(`✅ 成功迁移: ${migratedCount} 个用户`);
    console.log(`⏭️  跳过: ${skippedCount} 个用户（已有roles数组）`);
    console.log(`❌ 失败: ${errorCount} 个用户`);
    console.log(`📦 总计: ${users.length} 个用户`);
    console.log('='.repeat(60) + '\n');

    // 4. 验证迁移结果
    console.log('🔍 验证迁移结果...\n');
    
    const verifyResult = await db.collection('users').get();
    const verifyUsers = verifyResult.data;

    let withRolesArray = 0;
    let withoutRolesArray = 0;

    verifyUsers.forEach(user => {
      if (user.roles && Array.isArray(user.roles)) {
        withRolesArray++;
      } else {
        withoutRolesArray++;
        console.warn(`⚠️  用户 ${user.username} 仍然没有roles数组`);
      }
    });

    console.log('📊 验证结果:');
    console.log(`   ✅ 有roles数组: ${withRolesArray} 个用户`);
    console.log(`   ⚠️  无roles数组: ${withoutRolesArray} 个用户`);

    if (withoutRolesArray === 0) {
      console.log('\n🎉 所有用户已成功迁移！');
    } else {
      console.log('\n⚠️  部分用户未成功迁移，请检查日志');
    }

  } catch (error) {
    console.error('❌ 迁移过程出错:', error);
  }
}

// 执行迁移
migrateRoles()
  .then(() => {
    console.log('\n✅ 迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 迁移脚本执行失败:', error);
    process.exit(1);
  });
