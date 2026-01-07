// 临时脚本：为现有的分解表添加新字段
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = cloud.database();

async function updateExistingTables() {
  try {
    // 1. 查询所有分解表
    const result = await db.collection('decompositionTables').get();
    
    console.log(`找到 ${result.data.length} 个分解表`);
    
    // 2. 逐个更新
    for (const table of result.data) {
      // 如果已经有这些字段，跳过
      if (table.unit !== undefined && table.showRowTotal !== undefined && table.showColumnTotal !== undefined) {
        console.log(`✓ ${table.name} 已有新字段，跳过`);
        continue;
      }
      
      // 更新添加新字段
      await db.collection('decompositionTables').doc(table._id).update({
        data: {
          unit: table.unit || '万元',
          showRowTotal: table.showRowTotal !== undefined ? table.showRowTotal : false,
          showColumnTotal: table.showColumnTotal !== undefined ? table.showColumnTotal : false
        }
      });
      
      console.log(`✓ ${table.name} 更新成功`);
    }
    
    console.log('\n✅ 所有分解表更新完成！');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  }
}

// 执行
updateExistingTables();
