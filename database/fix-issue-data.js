// 修复问题数据 - 确保所有问题都有必要的字段
const cloud = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloud.init({
  env: 'cowork-9gg9oocb516be5fb' // 替换为实际的环境ID
});

const db = app.database();

async function fixIssueData() {
  try {
    console.log('开始修复问题数据...');
    
    // 查询所有问题
    const { data: issues } = await db.collection('issues')
      .where({ isDeleted: false })
      .get();
    
    console.log(`找到 ${issues.length} 个问题需要检查`);
    
    let fixedCount = 0;
    
    for (const issue of issues) {
      const updates: any = {};
      
      // 检查并添加缺失的字段
      if (!issue.solvers) {
        updates.solvers = [];
      }
      
      if (!issue.createdBy) {
        updates.createdBy = issue.owner || '';
      }
      
      if (!issue.isDeleted) {
        updates.isDeleted = false;
      }
      
      // 如果有需要更新的字段
      if (Object.keys(updates).length > 0) {
        await db.collection('issues').doc(issue._id).update(updates);
        console.log(`✅ 更新问题: ${issue.name}`);
        fixedCount++;
      }
    }
    
    console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个问题`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

// 执行修复
fixIssueData().then(() => {
  console.log('\n🎉 脚本执行完成');
  process.exit(0);
}).catch(err => {
  console.error('❌ 脚本执行失败:', err);
  process.exit(1);
});
