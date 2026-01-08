/**
 * 更新数据库中现有角色的权限配置
 * 将新增的模块权限同步到所有角色
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = app.database();
const _ = db.command;

// 导入模块配置
const { SYSTEM_MODULES, generateDefaultPermissions } = require('./constants/modules');

// 获取新增的模块ID
function getNewModuleIds() {
  const newModules = {
    goal: ['outcome', 'decomposition', 'executionMap', 'dimensionSettings'],
    budget: ['cashFlow'],
    profile: ['info', 'team', 'message', 'goals', 'execution', 'performance']
  };
  return newModules;
}

// 生成单个模块的默认权限
function getDefaultPermissionForModule(parentId, childId) {
  const parent = SYSTEM_MODULES.find(m => m.id === parentId);
  if (parent?.children) {
    const child = parent.children.find(c => c.id === childId);
    return child?.defaultPermission || {
      view: true,
      create: true,
      edit: false,
      delete: false,
      export: false
    };
  }
  return null;
}

// 主执行函数
async function updateRolePermissions() {
  console.log('========================================');
  console.log('🔄 更新角色权限配置');
  console.log('========================================\n');

  try {
    // 1. 获取所有角色
    console.log('1️⃣ 查询现有角色...');
    const rolesResult = await db.collection('roles').get();
    const roles = rolesResult.data;
    console.log(`✅ 找到 ${roles.length} 个角色\n`);

    if (roles.length === 0) {
      console.log('⚠️ 未找到任何角色，无需更新');
      return;
    }

    // 2. 显示角色列表
    console.log('📋 现有角色列表:');
    roles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.name} (${role._id})`);
    });
    console.log('');

    // 3. 获取新增模块
    const newModules = getNewModuleIds();
    console.log('2️⃣ 需要新增的模块权限:');
    console.log('-------------------');
    Object.entries(newModules).forEach(([parent, children]) => {
      console.log(`📁 ${parent}:`);
      children.forEach(child => {
        console.log(`   - ${child}`);
      });
    });
    console.log('');

    // 4. 逐个更新角色
    console.log('3️⃣ 开始更新角色权限:');
    console.log('-------------------');
    
    let successCount = 0;
    let errorCount = 0;

    for (const role of roles) {
      try {
        console.log(`\n🔄 更新角色: ${role.name} (${role._id})`);
        
        // 确保 permissions 对象存在
        const permissions = role.permissions || {};
        let hasUpdates = false;

        // 更新目标管理权限
        if (!permissions.goal) {
          permissions.goal = {};
        }
        newModules.goal.forEach(moduleId => {
          if (!permissions.goal[moduleId]) {
            permissions.goal[moduleId] = getDefaultPermissionForModule('goal', moduleId);
            console.log(`   ✅ 新增 goal.${moduleId}`);
            hasUpdates = true;
          }
        });

        // 更新预算管理权限
        if (!permissions.budget) {
          permissions.budget = {};
        }
        newModules.budget.forEach(moduleId => {
          if (!permissions.budget[moduleId]) {
            permissions.budget[moduleId] = getDefaultPermissionForModule('budget', moduleId);
            console.log(`   ✅ 新增 budget.${moduleId}`);
            hasUpdates = true;
          }
        });

        // 新增个人信息权限
        if (!permissions.profile) {
          permissions.profile = {};
          newModules.profile.forEach(moduleId => {
            permissions.profile[moduleId] = getDefaultPermissionForModule('profile', moduleId);
            console.log(`   ✅ 新增 profile.${moduleId}`);
            hasUpdates = true;
          });
        }

        // 如果有更新,保存到数据库
        if (hasUpdates) {
          await db.collection('roles')
            .doc(role._id)
            .update({
              permissions: permissions,
              updatedAt: new Date()
            });
          console.log(`   ✅ 角色 ${role.name} 更新成功`);
          successCount++;
        } else {
          console.log(`   ℹ️ 角色 ${role.name} 无需更新(权限已是最新)`);
        }

      } catch (error) {
        console.error(`   ❌ 角色 ${role.name} 更新失败:`, error.message);
        errorCount++;
      }
    }

    // 5. 显示更新结果
    console.log('\n========================================');
    console.log('📊 更新结果统计:');
    console.log('-------------------');
    console.log(`✅ 成功更新: ${successCount} 个角色`);
    console.log(`❌ 更新失败: ${errorCount} 个角色`);
    console.log(`📋 总共处理: ${roles.length} 个角色`);
    console.log('========================================\n');

    // 6. 验证更新结果
    console.log('4️⃣ 验证更新结果:');
    console.log('-------------------');
    const updatedRolesResult = await db.collection('roles').get();
    const updatedRoles = updatedRolesResult.data;

    let verifySuccess = 0;
    let verifyFailed = 0;

    for (const role of updatedRoles) {
      console.log(`\n🔍 验证角色: ${role.name}`);
      
      const hasGoalOutcome = role.permissions?.goal?.outcome !== undefined;
      const hasProfileInfo = role.permissions?.profile?.info !== undefined;
      const hasBudgetCashFlow = role.permissions?.budget?.cashFlow !== undefined;

      console.log(`   - goal.outcome: ${hasGoalOutcome ? '✅' : '❌'}`);
      console.log(`   - profile.info: ${hasProfileInfo ? '✅' : '❌'}`);
      console.log(`   - budget.cashFlow: ${hasBudgetCashFlow ? '✅' : '❌'}`);

      if (hasGoalOutcome && hasProfileInfo && hasBudgetCashFlow) {
        verifySuccess++;
      } else {
        verifyFailed++;
      }
    }

    console.log('\n📊 验证结果:');
    console.log(`   ✅ 验证通过: ${verifySuccess} 个角色`);
    console.log(`   ❌ 验证失败: ${verifyFailed} 个角色`);

    if (verifyFailed === 0) {
      console.log('\n🎉 所有角色权限更新成功!');
    } else {
      console.log('\n⚠️ 部分角色权限更新失败,请检查!');
    }

  } catch (error) {
    console.error('\n❌ 更新过程出错:', error);
    throw error;
  }
}

// 执行更新
updateRolePermissions()
  .then(() => {
    console.log('\n✅ 更新脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 更新脚本执行失败:', error);
    process.exit(1);
  });
