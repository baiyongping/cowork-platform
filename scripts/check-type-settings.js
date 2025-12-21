/**
 * 检查 type_settings 集合数据
 * 用于排查商机阶段数据丢失问题
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'test-6g6hkc5q15c8fbee' // 请替换为你的环境ID
});

const db = app.database();

async function checkTypeSettings() {
  console.log('\n=== 开始检查 type_settings 集合 ===\n');
  
  try {
    // 1. 查询所有 type_settings 记录
    const result = await db.collection('type_settings').get();
    
    console.log(`✅ 找到 ${result.data.length} 条类型设置记录\n`);
    
    // 2. 详细显示每条记录
    result.data.forEach((item, index) => {
      console.log(`📋 记录 ${index + 1}:`);
      console.log(`   类型: ${item.type}`);
      console.log(`   值数量: ${item.values ? item.values.length : 0}`);
      console.log(`   创建时间: ${item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '未知'}`);
      console.log(`   更新时间: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString('zh-CN') : '未知'}`);
      
      if (item.type === 'opportunity') {
        console.log(`   ⚠️ 商机阶段详细数据:`);
        if (item.values && item.values.length > 0) {
          item.values.forEach((val, i) => {
            if (typeof val === 'string') {
              console.log(`      ${i + 1}. ${val}`);
            } else {
              console.log(`      ${i + 1}. ${val.value} (${val.enabled ? '已启用' : '已禁用'})`);
            }
          });
        }
      }
      console.log('');
    });
    
    // 3. 特别检查商机阶段
    const opportunityResult = await db.collection('type_settings')
      .where({ type: 'opportunity' })
      .get();
    
    if (opportunityResult.data.length === 0) {
      console.log('❌ 警告：没有找到商机阶段设置！');
      console.log('   建议：运行系统设置页面以初始化数据\n');
    } else if (opportunityResult.data.length > 1) {
      console.log('⚠️ 警告：发现多条商机阶段设置记录！');
      console.log(`   数量: ${opportunityResult.data.length}`);
      console.log('   建议：删除重复记录，只保留一条\n');
      opportunityResult.data.forEach((item, index) => {
        console.log(`   记录 ${index + 1} ID: ${item._id}`);
      });
    } else {
      console.log('✅ 商机阶段设置正常（1条记录）\n');
    }
    
    // 4. 检查是否有其他程序会写入
    console.log('📊 数据库集合统计:');
    const collections = ['type_settings', 'opportunities', 'tasks', 'projects'];
    for (const collName of collections) {
      const count = await db.collection(collName).count();
      console.log(`   ${collName}: ${count.total} 条记录`);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
  
  console.log('\n=== 检查完成 ===\n');
}

// 运行检查
checkTypeSettings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('脚本执行失败:', err);
    process.exit(1);
  });
