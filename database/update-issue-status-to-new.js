/**
 * 数据库更新脚本: 将问题状态 "待接受" 批量更新为 "待接收"
 * 
 * 执行方式:
 * 1. 复制此脚本内容
 * 2. 在CloudBase控制台 - NoSQL数据库 - issues集合 - 批量操作中粘贴执行
 * 
 * 或使用云函数执行:
 * node database/update-issue-status-to-new.js
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = app.database();
const _ = db.command;

async function updateIssueStatus() {
  try {
    console.log('开始更新问题状态...');

    // 查询所有 status = '待接受' 的记录
    const queryResult = await db.collection('issues')
      .where({
        status: '待接受'
      })
      .get();

    const count = queryResult.data.length;
    console.log(`找到 ${count} 条需要更新的记录`);

    if (count === 0) {
      console.log('没有需要更新的记录');
      return;
    }

    // 批量更新
    const updateResult = await db.collection('issues')
      .where({
        status: '待接受'
      })
      .update({
        status: '待接收'
      });

    console.log('✅ 更新成功!');
    console.log(`已更新 ${updateResult.updated} 条记录`);

    // 验证更新结果
    const verifyResult = await db.collection('issues')
      .where({
        status: '待接受'
      })
      .get();

    console.log(`剩余未更新记录: ${verifyResult.data.length} 条`);

    // 查看更新后的记录
    const newRecords = await db.collection('issues')
      .where({
        status: '待接收'
      })
      .limit(5)
      .get();

    console.log('\n示例更新后的记录:');
    newRecords.data.forEach((record, index) => {
      console.log(`${index + 1}. ${record.name} - 状态: ${record.status}`);
    });

  } catch (error) {
    console.error('❌ 更新失败:', error);
    throw error;
  }
}

// 执行更新
updateIssueStatus()
  .then(() => {
    console.log('\n🎉 数据库更新完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 执行失败:', error);
    process.exit(1);
  });
