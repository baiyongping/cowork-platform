/**
 * 更新问题类型配置脚本
 * 将问题类型从旧类型更新为新类型
 * 
 * 执行方式:
 * node database/update-issue-types.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.VITE_TCB_ENV_ID || 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

async function updateIssueTypes() {
  try {
    console.log('开始更新问题类型配置...\n');

    // 1. 查找旧的问题类型配置 (type: 'issueType')
    const oldTypeResult = await db.collection('type_settings')
      .where({ type: 'issueType' })
      .get();

    if (oldTypeResult.data && oldTypeResult.data.length > 0) {
      console.log('✓ 找到旧的问题类型配置，删除中...');
      for (const item of oldTypeResult.data) {
        await db.collection('type_settings').doc(item._id).remove();
      }
      console.log('✓ 旧配置已删除');
    }

    // 2. 查找新的问题类型配置 (type: 'issue')
    const newTypeResult = await db.collection('type_settings')
      .where({ type: 'issue' })
      .get();

    if (newTypeResult.data && newTypeResult.data.length > 0) {
      console.log('✓ 找到现有的问题类型配置，更新中...');
      // 更新为新的问题类型
      await db.collection('type_settings')
        .doc(newTypeResult.data[0]._id)
        .update({
          values: [
            { value: '销售问题', label: '销售问题', enabled: true },
            { value: '产品问题', label: '产品问题', enabled: true },
            { value: '财务问题', label: '财务问题', enabled: true },
            { value: '管理问题', label: '管理问题', enabled: true },
            { value: '系统BUG与建议', label: '系统BUG与建议', enabled: true }
          ],
          updatedAt: new Date()
        });
      console.log('✓ 问题类型配置已更新');
    } else {
      console.log('✓ 未找到问题类型配置，创建新配置...');
      // 创建问题类型配置
      await db.collection('type_settings').add({
        type: 'issue',
        name: '问题类型',
        description: '用于问题管理的类型分类',
        values: [
          { value: '销售问题', label: '销售问题', enabled: true },
          { value: '产品问题', label: '产品问题', enabled: true },
          { value: '财务问题', label: '财务问题', enabled: true },
          { value: '管理问题', label: '管理问题', enabled: true },
          { value: '系统BUG与建议', label: '系统BUG与建议', enabled: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ 问题类型配置已创建');
    }

    console.log('\n✅ 问题类型配置更新完成！');
    console.log('\n新的问题类型:');
    console.log('- 销售问题');
    console.log('- 产品问题');
    console.log('- 财务问题');
    console.log('- 管理问题');
    console.log('- 系统BUG与建议');
    console.log('\n请刷新页面查看新的问题类型选项');

  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  }
}

// 执行更新
updateIssueTypes()
  .then(() => {
    console.log('\n更新脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n更新脚本执行失败:', error);
    process.exit(1);
  });
