/**
 * 初始化问题答复集合
 * 创建 issue_replies 集合和索引
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

async function initIssueReplies() {
  try {
    console.log('开始初始化问题答复集合...');

    // 1. 创建集合（如果不存在）
    try {
      await db.createCollection('issue_replies');
      console.log('✅ 创建集合 issue_replies 成功');
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️ 集合 issue_replies 已存在');
      } else {
        throw error;
      }
    }

    // 2. 创建索引
    const collection = db.collection('issue_replies');

    // 索引：按问题ID查询
    try {
      await collection.createIndex({
        keys: [{ name: 'issueId', direction: '1' }],
        indexName: 'idx_issueId'
      });
      console.log('✅ 创建索引 idx_issueId 成功');
    } catch (error) {
      console.log('ℹ️ 索引 idx_issueId 可能已存在');
    }

    // 索引：按创建人查询
    try {
      await collection.createIndex({
        keys: [{ name: 'createdBy', direction: '1' }],
        indexName: 'idx_createdBy'
      });
      console.log('✅ 创建索引 idx_createdBy 成功');
    } catch (error) {
      console.log('ℹ️ 索引 idx_createdBy 可能已存在');
    }

    // 索引：按删除状态查询
    try {
      await collection.createIndex({
        keys: [{ name: 'isDeleted', direction: '1' }],
        indexName: 'idx_isDeleted'
      });
      console.log('✅ 创建索引 idx_isDeleted 成功');
    } catch (error) {
      console.log('ℹ️ 索引 idx_isDeleted 可能已存在');
    }

    // 复合索引：按问题ID和删除状态查询
    try {
      await collection.createIndex({
        keys: [
          { name: 'issueId', direction: '1' },
          { name: 'isDeleted', direction: '1' }
        ],
        indexName: 'idx_issueId_isDeleted'
      });
      console.log('✅ 创建复合索引 idx_issueId_isDeleted 成功');
    } catch (error) {
      console.log('ℹ️ 复合索引 idx_issueId_isDeleted 可能已存在');
    }

    console.log('\n✅ 问题答复集合初始化完成！');
    console.log('集合名称: issue_replies');
    console.log('索引数量: 4个');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initIssueReplies()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
