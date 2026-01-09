/**
 * 将 modulesConfig 集合中的 displayName 字段重命名为 name
 * 
 * 使用方法：
 * node database/init/rename-displayname-to-name.js
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = cloud.database();

async function renameDisplayNameToName() {
  console.log('🚀 开始重命名 displayName 字段为 name\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. 查询所有模块
    const { data: modules } = await db.collection('modulesConfig')
      .get();
    
    console.log(`📦 查询到 ${modules.length} 个模块`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 2. 遍历每个模块
    for (const module of modules) {
      try {
        // 检查是否有 displayName 字段
        if (!module.displayName) {
          console.log(`⏭️  跳过 ${module._id} - 没有 displayName 字段`);
          skipCount++;
          continue;
        }
        
        // 检查是否已经有 name 字段
        if (module.name) {
          console.log(`⏭️  跳过 ${module._id} - 已经有 name 字段`);
          skipCount++;
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
        
      } catch (error) {
        console.error(`❌ 更新失败 ${module._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 更新统计：');
    console.log(`   成功: ${successCount} 个`);
    console.log(`   跳过: ${skipCount} 个`);
    console.log(`   失败: ${errorCount} 个`);
    console.log(`   总计: ${modules.length} 个`);
    
    if (errorCount === 0) {
      console.log('\n✅ 所有字段重命名完成！');
    } else {
      console.log('\n⚠️  部分模块更新失败，请检查错误信息');
    }
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 执行重命名
renameDisplayNameToName()
  .then(() => {
    console.log('\n✅ 脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  });
