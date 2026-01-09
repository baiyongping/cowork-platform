/**
 * 更新子模块统一标识到数据库
 * 
 * 功能:
 * 1. 统一所有子模块的ID为 parent.child 格式(驼峰命名)
 * 2. 添加标识字段便于查找和维护
 * 3. 确保与 constants/modules.ts 保持一致
 * 
 * 执行方式:
 * 通过云函数调用或直接使用 CloudBase MCP 工具
 */

// 使用 CloudBase Node SDK
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb',
  // 从环境变量读取凭证
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY
});

const db = app.database();
const _ = db.command;

/**
 * 子模块统一标识映射表
 * 格式: parent.child (驼峰命名)
 */
const UNIFIED_SUBMODULES = {
  // 🎯 目标管理 (7个子模块)
  goal: [
    { id: 'goal.salesGoal', name: '销售目标', order: 1 },
    { id: 'goal.productOrder', name: '产品目标', order: 2 },
    { id: 'goal.strategy', name: '年度策略', order: 3 },
    { id: 'goal.outcome', name: '成果目标', order: 4 },
    { id: 'goal.decomposition', name: '目标分解', order: 5 },
    { id: 'goal.executionMap', name: '执行力地图', order: 6 },
    { id: 'goal.dimensionSettings', name: '维度设置', order: 7 }
  ],
  
  // 💰 预算管理 (6个子模块)
  budget: [
    { id: 'budget.annual', name: '年度预算', order: 1 },
    { id: 'budget.execution', name: '预算执行', order: 2 },
    { id: 'budget.asset', name: '资产预算', order: 3 },
    { id: 'budget.cashFlow', name: '现金流管理', order: 4 },
    { id: 'budget.hr', name: '薪酬预算', order: 5 },
    { id: 'budget.parameters', name: '预算参数', order: 6 }
  ],
  
  // 👤 个人信息 (6个子模块)
  profile: [
    { id: 'profile.info', name: '基本信息', order: 1 },
    { id: 'profile.team', name: '团队', order: 2 },
    { id: 'profile.message', name: '消息', order: 3 },
    { id: 'profile.goals', name: '我的目标', order: 4 },
    { id: 'profile.execution', name: '执行力', order: 5 },
    { id: 'profile.performance', name: '绩效', order: 6 }
  ],
  
  // ⚙️ 系统设置 (7个子模块)
  settings: [
    { id: 'settings.userApproval', name: '用户审核', order: 1 },
    { id: 'settings.employees', name: '员工管理', order: 2 },
    { id: 'settings.departments', name: '部门管理', order: 3 },
    { id: 'settings.roles', name: '角色权限', order: 4 },
    { id: 'settings.typeSettings', name: '参数配置', order: 5 },
    { id: 'settings.operationLogs', name: '操作日志', order: 6 },
    { id: 'settings.moduleManagement', name: '功能模块', order: 7 }
  ]
};

/**
 * 更新或创建子模块
 */
async function updateSubmodules() {
  console.log('📝 开始更新子模块统一标识...\n');
  
  let updateCount = 0;
  let createCount = 0;
  let errorCount = 0;
  
  for (const [parentCode, submodules] of Object.entries(UNIFIED_SUBMODULES)) {
    console.log(`\n🎯 处理 ${parentCode} 的子模块 (${submodules.length}个):`);
    
    // 获取父模块信息
    const parentResult = await db.collection('modulesConfig')
      .where({ _id: `module-${parentCode}` })
      .get();
    
    if (parentResult.data.length === 0) {
      console.error(`❌ 父模块 module-${parentCode} 不存在`);
      continue;
    }
    
    const parent = parentResult.data[0];
    
    for (const submodule of submodules) {
      try {
        // 检查子模块是否存在
        const existing = await db.collection('modulesConfig')
          .where({ _id: submodule.id })
          .get();
        
        const submoduleData = {
          _id: submodule.id,
          name: submodule.name,
          parentId: parent._id,
          parentCode: parentCode,
          level: 2,
          order: submodule.order,
          isEnabled: true,
          isCustom: false,
          icon: parent.icon || 'Settings',
          description: '',
          defaultPermission: 'view',
          metadata: {
            collections: [],
            apis: [],
            routes: [],
            fields: {}
          },
          // 🔍 添加统一标识字段
          unifiedId: submodule.id,
          moduleType: 'submodule',
          parentModule: parentCode,
          updatedAt: db.serverDate()
        };
        
        if (existing.data.length > 0) {
          // 更新现有记录
          await db.collection('modulesConfig').doc(submodule.id).update({
            data: {
              ...submoduleData,
              _id: _.remove() // 移除_id字段，因为update不能修改_id
            }
          });
          console.log(`  ✓ 更新: ${submodule.id} (${submodule.name})`);
          updateCount++;
        } else {
          // 创建新记录
          submoduleData.createdAt = db.serverDate();
          await db.collection('modulesConfig').add({
            data: submoduleData
          });
          console.log(`  + 创建: ${submodule.id} (${submodule.name})`);
          createCount++;
        }
      } catch (error) {
        console.error(`  ❌ 处理失败: ${submodule.id} - ${error.message}`);
        errorCount++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 更新统计:');
  console.log(`   ✓ 更新: ${updateCount} 个`);
  console.log(`   + 创建: ${createCount} 个`);
  console.log(`   ❌ 失败: ${errorCount} 个`);
  console.log(`   📋 总计: ${updateCount + createCount + errorCount} 个子模块`);
  console.log('='.repeat(50) + '\n');
  
  if (errorCount === 0) {
    console.log('✅ 所有子模块统一标识更新完成！');
  } else {
    console.log('⚠️ 部分子模块更新失败，请检查错误信息');
  }
}

/**
 * 验证更新结果
 */
async function verifyUpdate() {
  console.log('\n🔍 验证更新结果...\n');
  
  // 统计各父模块的子模块数量
  const stats = {};
  
  for (const parentCode of Object.keys(UNIFIED_SUBMODULES)) {
    const result = await db.collection('modulesConfig')
      .where({
        parentCode: parentCode,
        level: 2
      })
      .count();
    
    stats[parentCode] = result.total;
  }
  
  console.log('📊 子模块统计:');
  console.log('┌─────────────┬──────────┬──────────┐');
  console.log('│   父模块    │ 预期数量 │ 实际数量 │');
  console.log('├─────────────┼──────────┼──────────┤');
  
  let allMatch = true;
  for (const [parentCode, expected] of Object.entries(UNIFIED_SUBMODULES)) {
    const actual = stats[parentCode] || 0;
    const match = expected.length === actual ? '✓' : '✗';
    console.log(`│ ${parentCode.padEnd(11)} │    ${expected.length}     │    ${actual}     │ ${match}`);
    if (expected.length !== actual) allMatch = false;
  }
  
  console.log('└─────────────┴──────────┴──────────┘\n');
  
  if (allMatch) {
    console.log('✅ 验证通过！所有子模块数量匹配');
  } else {
    console.log('⚠️ 验证失败！部分子模块数量不匹配');
  }
  
  // 查询所有子模块的统一标识
  console.log('\n📋 统一标识列表:');
  const allSubmodules = await db.collection('modulesConfig')
    .where({
      level: 2,
      unifiedId: _.exists(true)
    })
    .orderBy('parentCode', 'asc')
    .orderBy('order', 'asc')
    .get();
  
  let currentParent = '';
  for (const module of allSubmodules.data) {
    if (module.parentCode !== currentParent) {
      console.log(`\n🎯 ${module.parentCode}:`);
      currentParent = module.parentCode;
    }
    console.log(`   ${module.unifiedId} - ${module.name}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`总计: ${allSubmodules.data.length} 个子模块已标识`);
  console.log('='.repeat(50));
}

/**
 * 清理旧的不规范ID
 */
async function cleanupOldIds() {
  console.log('\n🧹 检查需要清理的旧ID...\n');
  
  // 查找可能的旧ID格式(不符合 parent.child 驼峰命名规范)
  const oldFormats = await db.collection('modulesConfig')
    .where({
      level: 2,
      _id: _.or([
        _.regex({ regexp: '^[^.]+$' }), // 没有点号
        _.regex({ regexp: '_' })         // 包含下划线
      ])
    })
    .get();
  
  if (oldFormats.data.length === 0) {
    console.log('✅ 没有需要清理的旧ID');
    return;
  }
  
  console.log(`⚠️ 发现 ${oldFormats.data.length} 个可能需要清理的记录:`);
  for (const module of oldFormats.data) {
    console.log(`   ${module._id} - ${module.name}`);
  }
  
  console.log('\n请手动检查这些记录是否需要删除或更新');
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 际华协同办公平台 - 子模块统一标识更新工具');
    console.log('='.repeat(50) + '\n');
    
    // 1. 更新子模块
    await updateSubmodules();
    
    // 2. 验证结果
    await verifyUpdate();
    
    // 3. 清理检查
    await cleanupOldIds();
    
    console.log('\n✅ 所有操作完成！');
    console.log('\n💡 提示:');
    console.log('   1. 请在控制台查看更新结果');
    console.log('   2. 建议重启应用以生效');
    console.log('   3. 控制台链接: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/modulesConfig');
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 执行
main();
