/**
 * 问题状态更新脚本
 * 更新问题状态配置并迁移现有数据
 * 
 * 旧状态: 未开始、进行中、已完成、延期、取消、暂停
 * 新状态: 待接受、处理中、已处理、已确认
 * 
 * 执行方式:
 * node database/update-issue-status.js
 */

import cloudbase from '@cloudbase/node-sdk';

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.VITE_TCB_ENV_ID || 'cowork-9gg9oocb516be5fb'
});

const db = app.database();
const _ = db.command;

// 状态映射规则
const statusMapping = {
  '未开始': '待接受',
  '进行中': '处理中',
  '已完成': '已处理',
  '延期': '处理中',
  '取消': '已确认',
  '暂停': '处理中'
};

async function updateIssueStatus() {
  try {
    console.log('开始更新问题状态配置...\n');

    // 1. 更新问题状态配置
    const statusResult = await db.collection('type_settings')
      .where({ type: 'issueStatus' })
      .get();

    if (statusResult.data && statusResult.data.length > 0) {
      const statusConfig = statusResult.data[0];
      await db.collection('type_settings').doc(statusConfig._id).update({
        values: [
          { value: '待接受', label: '待接受', enabled: true },
          { value: '处理中', label: '处理中', enabled: true },
          { value: '已处理', label: '已处理', enabled: true },
          { value: '已确认', label: '已确认', enabled: true }
        ],
        updatedAt: new Date()
      });
      console.log('✓ 问题状态配置已更新');
    } else {
      // 创建问题状态配置
      await db.collection('type_settings').add({
        type: 'issueStatus',
        name: '问题状态',
        description: '用于问题管理的状态分类',
        values: [
          { value: '待接受', label: '待接受', enabled: true },
          { value: '处理中', label: '处理中', enabled: true },
          { value: '已处理', label: '已处理', enabled: true },
          { value: '已确认', label: '已确认', enabled: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ 问题状态配置已创建');
    }

    // 2. 添加解决结果配置
    const resultResult = await db.collection('type_settings')
      .where({ type: 'issueResult' })
      .get();

    if (resultResult.data && resultResult.data.length > 0) {
      console.log('✓ 解决结果配置已存在');
    } else {
      await db.collection('type_settings').add({
        type: 'issueResult',
        name: '解决结果',
        description: '用于问题管理的解决结果分类',
        values: [
          { value: '已解决', label: '已解决', enabled: true },
          { value: '无法解决', label: '无法解决', enabled: true },
          { value: '暂缓解决', label: '暂缓解决', enabled: true },
          { value: '取消', label: '取消', enabled: true }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ 解决结果配置已创建');
    }

    // 3. 迁移现有问题数据
    console.log('\n开始迁移现有问题数据...');
    
    const issuesResult = await db.collection('issues')
      .where({ isDeleted: _.neq(true) })
      .get();

    if (issuesResult.data && issuesResult.data.length > 0) {
      console.log(`找到 ${issuesResult.data.length} 个问题需要更新`);
      
      let updatedCount = 0;
      for (const issue of issuesResult.data) {
        const oldStatus = issue.status;
        const newStatus = statusMapping[oldStatus] || '待接受';
        
        if (oldStatus !== newStatus) {
          await db.collection('issues').doc(issue._id).update({
            status: newStatus,
            updatedAt: new Date()
          });
          updatedCount++;
          console.log(`  - 问题 "${issue.name}": ${oldStatus} → ${newStatus}`);
        }
      }
      
      console.log(`\n✓ 已更新 ${updatedCount} 个问题的状态`);
    } else {
      console.log('没有找到需要迁移的问题');
    }

    console.log('\n✅ 问题状态更新完成！');
    console.log('\n新的状态配置:');
    console.log('- 问题状态: 待接受、处理中、已处理、已确认');
    console.log('- 解决结果: 已解决、无法解决、暂缓解决、取消');
    console.log('\n状态映射规则:');
    Object.entries(statusMapping).forEach(([old, newVal]) => {
      console.log(`  ${old} → ${newVal}`);
    });

  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  }
}

// 执行更新
updateIssueStatus()
  .then(() => {
    console.log('\n更新脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n更新脚本执行失败:', error);
    process.exit(1);
  });
