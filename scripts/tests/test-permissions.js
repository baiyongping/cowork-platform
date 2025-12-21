// 测试脚本 - 检查baiyp02用户权限
import tcb from '@cloudbase/node-sdk';

const app = tcb.init({
  env: 'cowork-4g16vpke8dd2f5bf'
});

const db = app.database();

async function testPermissions() {
  try {
    console.log('=== 开始检查权限系统 ===\n');
    
    // 1. 查询baiyp02用户数据
    console.log('1. 查询baiyp02用户数据...');
    const userResult = await db.collection('users')
      .where({ username: 'baiyp02' })
      .get();
    
    if (userResult.data && userResult.data.length > 0) {
      const user = userResult.data[0];
      console.log('✓ 找到用户:', {
        username: user.username,
        name: user.name,
        role: user.role,
        roles: user.roles,
        _id: user._id
      });
      console.log('');
      
      // 2. 查询所有角色权限配置
      console.log('2. 查询所有角色权限配置...');
      const rolesResult = await db.collection('role_permissions').get();
      console.log(`✓ 找到 ${rolesResult.data.length} 个角色配置\n`);
      
      rolesResult.data.forEach((role, index) => {
        console.log(`角色 ${index + 1}: ${role.name} (${role.role})`);
        console.log('  ID:', role._id);
        console.log('  权限配置:', JSON.stringify(role.permissions, null, 2));
        console.log('');
      });
      
      // 3. 检查用户的角色权限
      console.log('3. 分析baiyp02用户的实际权限...');
      
      // 方式1: 检查user.role字段匹配的权限
      console.log('\n方式1: 通过user.role字段 (old format)');
      const rolePermsByRole = rolesResult.data.filter(r => r.role === user.role);
      console.log(`  user.role = "${user.role}"`);
      console.log(`  匹配到 ${rolePermsByRole.length} 个角色配置`);
      if (rolePermsByRole.length > 0) {
        rolePermsByRole.forEach(rp => {
          console.log(`    - ${rp.name} (${rp.role}): ${rp.moduleKey || rp.moduleName}`);
        });
      }
      
      // 方式2: 检查user.roles数组中的角色ID
      console.log('\n方式2: 通过user.roles数组 (new format)');
      if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        console.log(`  user.roles =`, user.roles);
        
        const rolePermsById = rolesResult.data.filter(r => 
          user.roles.includes(r._id) || user.roles.includes(r.role)
        );
        console.log(`  匹配到 ${rolePermsById.length} 个角色配置`);
        if (rolePermsById.length > 0) {
          rolePermsById.forEach(rp => {
            console.log(`    - ${rp.name} (ID: ${rp._id})`);
            console.log(`      权限:`, rp.permissions);
          });
        }
      } else {
        console.log('  user.roles 字段为空或不存在');
      }
      
      // 4. 诊断问题
      console.log('\n4. 问题诊断:');
      console.log('----------------------------------------');
      
      if (!user.roles || user.roles.length === 0) {
        console.log('❌ 问题: user.roles 数组为空');
        console.log('   原因: 用户没有被分配角色');
        console.log('   解决: 在员工管理中为该用户分配角色');
      } else if (rolePermsById.length === 0) {
        console.log('❌ 问题: user.roles中的角色ID在role_permissions表中找不到');
        console.log('   user.roles:', user.roles);
        console.log('   可用的角色ID:');
        rolesResult.data.forEach(r => {
          console.log(`     - ${r.name}: ${r._id} (role: ${r.role})`);
        });
        console.log('   解决: 确保user.roles中的ID与role_permissions中的_id匹配');
      } else {
        console.log('✓ 角色分配正常');
        console.log('\n  实际权限计算逻辑 (根据 permissionUtils.ts):');
        console.log('  - 如果 user.role === "admin", 返回全部权限');
        console.log(`  - 当前 user.role = "${user.role}", 不是admin`);
        console.log('  - 应该查找 role_permissions 中 role === user.role 的配置');
        console.log(`  - 匹配结果: ${rolePermsByRole.length} 条`);
        
        if (rolePermsByRole.length === 0) {
          console.log('\n❌ 核心问题: permissionUtils.ts 使用 user.role 字段匹配权限');
          console.log('   但该用户的 role 字段值在 role_permissions 表中找不到对应配置');
          console.log(`   user.role = "${user.role}"`);
          console.log('   可用的 role 值:');
          rolesResult.data.forEach(r => {
            console.log(`     - "${r.role}" (${r.name})`);
          });
        }
      }
      
    } else {
      console.log('❌ 未找到baiyp02用户');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    process.exit(0);
  }
}

testPermissions();
