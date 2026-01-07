/**
 * 目标分解数据 - 年度字段迁移脚本
 * 
 * 目的：将 goalDecompositionData 集合中所有没有 year 字段的数据迁移到 2026 年
 * 
 * 使用方法：
 * 1. 在项目根目录执行: node scripts/migrate-goal-decomposition-year.js
 * 2. 脚本会自动连接 CloudBase 并更新数据
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'  // 测试环境 ID
});

const db = app.database();

async function migrateData() {
  console.log('🚀 开始迁移目标分解数据...\n');
  
  try {
    // 1. 查询所有没有 year 字段的数据
    console.log('📂 查询没有 year 字段的数据...');
    const result = await db.collection('goalDecompositionData')
      .where({
        year: db.command.exists(false)  // 查找不存在 year 字段的文档
      })
      .get();
    
    const dataList = result.data || [];
    console.log(`✅ 找到 ${dataList.length} 条需要迁移的数据\n`);
    
    if (dataList.length === 0) {
      console.log('✨ 所有数据已包含 year 字段，无需迁移');
      return;
    }
    
    // 2. 显示待迁移数据示例
    console.log('📊 数据示例（前3条）:');
    dataList.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.tableName || '未命名'} - Row ${item.rowIndex}, Col ${item.colIndex}`);
    });
    console.log('');
    
    // 3. 批量更新数据，添加 year: 2026
    console.log('💾 开始批量更新...');
    let successCount = 0;
    let failCount = 0;
    
    for (const item of dataList) {
      try {
        await db.collection('goalDecompositionData')
          .doc(item._id)
          .update({
            year: 2026,  // 默认迁移到 2026 年
            updatedAt: new Date()
          });
        successCount++;
        
        // 每处理10条打印一次进度
        if (successCount % 10 === 0) {
          console.log(`  ⏳ 已处理 ${successCount}/${dataList.length} 条...`);
        }
      } catch (error) {
        console.error(`  ❌ 更新失败 [${item._id}]:`, error.message);
        failCount++;
      }
    }
    
    console.log('\n');
    console.log('═══════════════════════════════════════');
    console.log('📈 迁移完成统计:');
    console.log(`  ✅ 成功: ${successCount} 条`);
    console.log(`  ❌ 失败: ${failCount} 条`);
    console.log(`  📊 总计: ${dataList.length} 条`);
    console.log('═══════════════════════════════════════');
    
    // 4. 验证迁移结果
    console.log('\n🔍 验证迁移结果...');
    const verifyResult = await db.collection('goalDecompositionData')
      .where({
        year: 2026
      })
      .count();
    
    console.log(`✅ 当前 2026 年数据总数: ${verifyResult.total} 条\n`);
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

// 执行迁移
migrateData()
  .then(() => {
    console.log('✨ 迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 迁移脚本执行失败:', error);
    process.exit(1);
  });
