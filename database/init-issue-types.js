/**
 * 问题类型初始化脚本
 * 为问题管理功能添加必要的类型设置
 * 
 * 执行方式:
 * node database/init-issue-types.js
 */

import cloudbase from '@cloudbase/node-sdk';

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.VITE_TCB_ENV_ID || 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

async function initIssueTypes() {
  try {
    console.log('开始初始化问题类型设置...\n');

    // 1. 检查是否已存在问题类型配置
    const existingTypeResult = await db.collection('type_settings')
      .where({ type: 'issue' })
      .get();

    if (existingTypeResult.data && existingTypeResult.data.length > 0) {
      console.log('✓ 问题类型配置已存在，更新为新类型...');
      // 更新为新的问题类型
      await db.collection('type_settings')
        .doc(existingTypeResult.data[0]._id)
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

    // 2. 检查是否已存在问题状态配置
    const existingStatusResult = await db.collection('type_settings')
      .where({ type: 'issueStatus' })
      .get();

    if (existingStatusResult.data && existingStatusResult.data.length > 0) {
      console.log('✓ 问题状态配置已存在，无需重复初始化');
      console.log('当前配置:', JSON.stringify(existingStatusResult.data[0], null, 2));
    } else {
      // 创建问题状态配置
      await db.collection('type_settings').add({
        type: 'issueStatus',
        name: '问题状态',
        description: '用于问题管理的状态分类',
        values: [
          { value: '未开始', label: '未开始', enabled: true },
          { value: '进行中', label: '进行中', enabled: true },
          { value: '已完成', label: '已完成', enabled: true },
          { value: '延期', label: '延期', enabled: true },
          { value: '取消', label: '取消', enabled: true },
          { value: '暂停', label: '暂停', enabled: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ 问题状态配置已创建');
    }

    // 3. 检查是否已存在问题优先级配置
    const existingPriorityResult = await db.collection('type_settings')
      .where({ type: 'issuePriority' })
      .get();

    if (existingPriorityResult.data && existingPriorityResult.data.length > 0) {
      console.log('✓ 问题优先级配置已存在，无需重复初始化');
      console.log('当前配置:', JSON.stringify(existingPriorityResult.data[0], null, 2));
    } else {
      // 创建问题优先级配置
      await db.collection('type_settings').add({
        type: 'issuePriority',
        name: '问题优先级',
        description: '用于问题管理的优先级分类',
        values: [
          { value: '低', label: '低', color: '#10B981', enabled: true },
          { value: '中', label: '中', color: '#F59E0B', enabled: true },
          { value: '高', label: '高', color: '#EF4444', enabled: true },
          { value: '紧急', label: '紧急', color: '#DC2626', enabled: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ 问题优先级配置已创建');
    }

    console.log('\n✅ 问题类型设置初始化完成！');
    console.log('\n说明:');
    console.log('- 问题类型: 销售问题、产品问题、财务问题、管理问题、系统BUG与建议');
    console.log('- 问题状态: 未开始、进行中、已完成、延期、取消、暂停');
    console.log('- 问题优先级: 低、中、高、紧急');
    console.log('\n您可以在"系统设置 → 状态设置"中自定义这些类型');

  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initIssueTypes()
  .then(() => {
    console.log('\n初始化脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n初始化脚本执行失败:', error);
    process.exit(1);
  });
