const tcb = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  const sourceEnv = 'jihua-oa-dev-3goht9irae4d949f'; // 测试环境
  const targetEnv = 'cowork-9gg9oocb516be5fb';      // 生产环境
  
  const sourceApp = tcb.init({ env: sourceEnv });
  const targetApp = tcb.init({ env: targetEnv });
  
  const sourceDb = sourceApp.database();
  const targetDb = targetApp.database();
  
  // 需要迁移的集合
  const collectionsToMigrate = [
    'departments',         // 4 条数据
    'goals',              // 1 条数据
    'quarterly_measures', // 1 条数据
    'type_settings',      // 3 条数据
    'role_permissions'    // 1 条数据
  ];
  
  const results = [];
  
  for (const collectionName of collectionsToMigrate) {
    try {
      console.log(`开始迁移集合: ${collectionName}`);
      
      // 从测试环境读取数据
      const sourceData = await sourceDb
        .collection(collectionName)
        .get();
      
      if (sourceData.data && sourceData.data.length > 0) {
        console.log(`从测试环境读取到 ${sourceData.data.length} 条数据`);
        
        // 写入生产环境
        let successCount = 0;
        let errorCount = 0;
        
        for (const item of sourceData.data) {
          try {
            // 删除 _id 字段,让生产环境自动生成
            delete item._id;
            
            await targetDb
              .collection(collectionName)
              .add(item);
            
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`写入失败: ${error.message}`);
          }
        }
        
        results.push({
          collection: collectionName,
          status: 'success',
          totalCount: sourceData.data.length,
          successCount: successCount,
          errorCount: errorCount
        });
      } else {
        results.push({
          collection: collectionName,
          status: 'skipped',
          reason: 'no data'
        });
      }
    } catch (error) {
      console.error(`迁移集合失败: ${collectionName}`, error);
      results.push({
        collection: collectionName,
        status: 'error',
        message: error.message
      });
    }
  }
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    results: results
  };
};
