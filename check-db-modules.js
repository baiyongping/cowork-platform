/**
 * 检查数据库中的模块配置
 * 对比 modulesConfig 集合与代码配置的一致性
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = cloud.database();

async function checkModules() {
  console.log('\n========================================');
  console.log('    数据库模块配置检查');
  console.log('========================================\n');

  try {
    // 查询所有模块配置
    const result = await db.collection('modulesConfig')
      .orderBy('order', 'asc')
      .get();

    console.log(`📊 数据库中的模块总数: ${result.data.length}\n`);

    // 按父模块分组
    const grouped = {};
    result.data.forEach(module => {
      const parent = module.parentId || 'root';
      if (!grouped[parent]) {
        grouped[parent] = [];
      }
      grouped[parent].push(module);
    });

    // 显示一级模块
    console.log('📋 一级模块:');
    if (grouped['root']) {
      grouped['root'].forEach(module => {
        console.log(`   ${module.isEnabled ? '✅' : '❌'} ${module._id.padEnd(20)} | ${module.name.padEnd(12)} | 排序: ${module.order}`);
      });
    }

    // 显示二级模块
    for (const [parentId, modules] of Object.entries(grouped)) {
      if (parentId === 'root') continue;
      
      console.log(`\n📋 ${parentId} 的子模块:`);
      modules.forEach(module => {
        console.log(`   ${module.isEnabled ? '✅' : '❌'} ${module._id.padEnd(30)} | ${module.name.padEnd(12)} | 排序: ${module.order}`);
      });
    }

    // 检查是否有重复的模块ID
    console.log('\n========================================');
    console.log('检查重复模块...');
    console.log('========================================\n');

    const idCount = {};
    result.data.forEach(module => {
      idCount[module._id] = (idCount[module._id] || 0) + 1;
    });

    const duplicates = Object.entries(idCount).filter(([id, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('⚠️  发现重复模块:');
      duplicates.forEach(([id, count]) => {
        console.log(`   ${id}: ${count} 条记录`);
      });
    } else {
      console.log('✅ 没有重复模块');
    }

    // 检查命名一致性
    console.log('\n========================================');
    console.log('检查命名一致性...');
    console.log('========================================\n');

    const namingIssues = [];
    
    // 检查 productOrder 命名
    const productOrder = result.data.find(m => m._id === 'goal.productOrder');
    if (productOrder && productOrder.name !== '产品目标') {
      namingIssues.push({
        id: 'goal.productOrder',
        current: productOrder.name,
        expected: '产品目标'
      });
    }

    if (namingIssues.length > 0) {
      console.log('⚠️  发现命名不一致:');
      namingIssues.forEach(issue => {
        console.log(`   ${issue.id}:`);
        console.log(`      当前名称: ${issue.current}`);
        console.log(`      期望名称: ${issue.expected}`);
      });
    } else {
      console.log('✅ 所有模块命名一致');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkModules().then(() => {
  console.log('\n✅ 检查完成！\n');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 执行失败:', error);
  process.exit(1);
});
