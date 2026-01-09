/**
 * 临时云函数：将 displayName 字段重命名为 name
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  console.log('🚀 开始重命名 displayName 字段为 name');
  
  try {
    // 查询所有模块
    const { data: modules } = await db.collection('modulesConfig').get();
    
    console.log(`📦 查询到 ${modules.length} 个模块`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const results = [];
    
    // 遍历每个模块
    for (const module of modules) {
      try {
        // 检查是否有 displayName 字段
        if (!module.displayName) {
          console.log(`⏭️  跳过 ${module._id} - 没有 displayName 字段`);
          skipCount++;
          results.push({ _id: module._id, status: 'skip', reason: '没有 displayName 字段' });
          continue;
        }
        
        // 检查是否已经有 name 字段
        if (module.name) {
          console.log(`⏭️  跳过 ${module._id} - 已经有 name 字段`);
          skipCount++;
          results.push({ _id: module._id, status: 'skip', reason: '已经有 name 字段' });
          continue;
        }
        
        // 更新文档：添加 name 字段，删除 displayName 字段
        await db.collection('modulesConfig')
          .doc(module._id)
          .update({
            data: {
              name: module.displayName,
              displayName: db.command.remove()
            }
          });
        
        console.log(`✅ 更新 ${module._id}: "${module.displayName}" → name 字段`);
        successCount++;
        results.push({ _id: module._id, status: 'success', displayName: module.displayName });
        
      } catch (error) {
        console.error(`❌ 更新失败 ${module._id}:`, error.message);
        errorCount++;
        results.push({ _id: module._id, status: 'error', error: error.message });
      }
    }
    
    const summary = {
      total: modules.length,
      success: successCount,
      skip: skipCount,
      error: errorCount
    };
    
    console.log('📊 更新统计:', summary);
    
    return {
      success: errorCount === 0,
      summary,
      results
    };
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
