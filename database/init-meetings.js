/**
 * 例会管理模块 - 数据库初始化脚本
 * 版本: v3.0
 * 说明: 创建meetings集合和相关索引
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function initMeetingsDatabase() {
  console.log('开始初始化例会管理数据库...');
  
  try {
    // 1. 创建meetings集合的索引
    console.log('创建meetings集合索引...');
    
    // 基础索引
    await db.collection('meetings').createIndex({
      keys: { startTime: -1 },
      name: 'idx_startTime'
    });
    console.log('✓ 创建索引: idx_startTime');
    
    await db.collection('meetings').createIndex({
      keys: { status: 1, startTime: -1 },
      name: 'idx_status_startTime'
    });
    console.log('✓ 创建索引: idx_status_startTime');
    
    await db.collection('meetings').createIndex({
      keys: { host: 1, startTime: -1 },
      name: 'idx_host_startTime'
    });
    console.log('✓ 创建索引: idx_host_startTime');
    
    await db.collection('meetings').createIndex({
      keys: { participants: 1, startTime: -1 },
      name: 'idx_participants_startTime'
    });
    console.log('✓ 创建索引: idx_participants_startTime');
    
    await db.collection('meetings').createIndex({
      keys: { isDeleted: 1, startTime: -1 },
      name: 'idx_isDeleted_startTime'
    });
    console.log('✓ 创建索引: idx_isDeleted_startTime');
    
    await db.collection('meetings').createIndex({
      keys: { createdAt: -1 },
      name: 'idx_createdAt'
    });
    console.log('✓ 创建索引: idx_createdAt');
    
    // 议题相关索引
    await db.collection('meetings').createIndex({
      keys: { 'agendaItems.presenters': 1 },
      name: 'idx_agendaItems_presenters'
    });
    console.log('✓ 创建索引: idx_agendaItems_presenters');
    
    await db.collection('meetings').createIndex({
      keys: { 'agendaItems.type': 1 },
      name: 'idx_agendaItems_type'
    });
    console.log('✓ 创建索引: idx_agendaItems_type');
    
    // 2. 创建示例数据(用于测试)
    console.log('\n创建示例会议数据...');
    
    const sampleMeeting = {
      title: '2025年第一季度周例会',
      type: '周例会',
      status: '待召开',
      startTime: new Date('2025-02-03 14:00:00'),
      endTime: new Date('2025-02-03 16:00:00'),
      location: '会议室A',
      isOnline: false,
      meetingLink: '',
      host: 'sample-host-id',
      participants: ['sample-host-id', 'sample-user-1', 'sample-user-2'],
      recorder: 'sample-user-1',
      
      // 会议议题
      agendaItems: [
        {
          id: 'agenda-1',
          title: 'Q1目标进度复盘',
          type: '目标复盘',
          order: 1,
          presenters: ['sample-host-id'],
          relatedGoalIds: [],
          relatedGoalMeasureIds: [],
          conclusion: '',
          newTaskIds: []
        },
        {
          id: 'agenda-2',
          title: '本周/下周团队任务汇报',
          type: '团队任务汇报',
          order: 2,
          presenters: ['sample-user-1'],
          relatedTeamTasks: {
            thisWeek: [],
            nextWeek: []
          },
          conclusion: '',
          newTaskIds: []
        },
        {
          id: 'agenda-3',
          title: '重点商机分析',
          type: '商机分析',
          order: 3,
          presenters: ['sample-user-2'],
          relatedOpportunityIds: [],
          conclusion: '',
          newTaskIds: []
        }
      ],
      
      minutes: '',
      attachments: [],
      relatedIssues: [],
      isDeleted: false,
      createdBy: 'sample-host-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('meetings').add({
      data: sampleMeeting
    });
    
    console.log('✓ 创建示例会议成功:', result._id);
    
    console.log('\n✅ 例会管理数据库初始化完成！');
    console.log('==========================================');
    console.log('已创建索引:');
    console.log('  - idx_startTime');
    console.log('  - idx_status_startTime');
    console.log('  - idx_host_startTime');
    console.log('  - idx_participants_startTime');
    console.log('  - idx_isDeleted_startTime');
    console.log('  - idx_createdAt');
    console.log('  - idx_agendaItems_presenters');
    console.log('  - idx_agendaItems_type');
    console.log('已创建示例数据:');
    console.log('  - 1条示例会议记录');
    console.log('==========================================');
    
    return {
      success: true,
      message: '数据库初始化成功'
    };
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initMeetingsDatabase()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
