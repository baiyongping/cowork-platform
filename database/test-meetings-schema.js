/**
 * 例会管理模块 - 数据库结构测试脚本
 * 版本: v3.0
 * 说明: 测试meetings集合的数据结构和索引
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 测试数据模板
const testMeetingData = {
  title: '测试会议 - 数据结构验证',
  type: '周例会',
  status: '待召开',
  startTime: new Date('2025-02-10 14:00:00'),
  endTime: new Date('2025-02-10 16:00:00'),
  location: '测试会议室',
  isOnline: false,
  meetingLink: '',
  host: 'test-host-id',
  participants: ['test-host-id', 'test-user-1', 'test-user-2'],
  recorder: 'test-user-1',
  
  agendaItems: [
    {
      id: 'test-agenda-1',
      title: '测试议题1: 目标复盘',
      type: '目标复盘',
      order: 1,
      presenters: ['test-host-id', 'test-user-1'],
      relatedGoalIds: ['goal-1', 'goal-2'],
      relatedGoalMeasureIds: ['measure-1', 'measure-2'],
      conclusion: '测试结论1',
      newTaskIds: []
    },
    {
      id: 'test-agenda-2',
      title: '测试议题2: 团队任务汇报',
      type: '团队任务汇报',
      order: 2,
      presenters: ['test-user-1'],
      relatedTeamTasks: {
        thisWeek: ['task-1', 'task-2'],
        nextWeek: ['task-3', 'task-4']
      },
      conclusion: '测试结论2',
      newTaskIds: ['new-task-1']
    },
    {
      id: 'test-agenda-3',
      title: '测试议题3: 商机分析',
      type: '商机分析',
      order: 3,
      presenters: ['test-user-2'],
      relatedOpportunityIds: ['opp-1', 'opp-2'],
      conclusion: '测试结论3',
      newTaskIds: []
    }
  ],
  
  minutes: '测试会议纪要内容',
  attachments: [],
  relatedIssues: [],
  isDeleted: false,
  createdBy: 'test-host-id',
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testMeetingsSchema() {
  console.log('开始测试例会管理数据库结构...\n');
  
  let testMeetingId = null;
  
  try {
    // ========================================
    // 测试1: 创建测试会议
    // ========================================
    console.log('测试1: 创建测试会议...');
    const createResult = await db.collection('meetings').add({
      data: testMeetingData
    });
    testMeetingId = createResult._id;
    console.log('✓ 创建成功, 会议ID:', testMeetingId);
    
    // ========================================
    // 测试2: 查询会议详情
    // ========================================
    console.log('\n测试2: 查询会议详情...');
    const detailResult = await db.collection('meetings')
      .doc(testMeetingId)
      .get();
    
    const meeting = detailResult.data;
    console.log('✓ 查询成功');
    console.log('  - 会议标题:', meeting.title);
    console.log('  - 议题数量:', meeting.agendaItems.length);
    console.log('  - 第一个议题:', meeting.agendaItems[0].title);
    
    // 验证必填字段
    const requiredFields = ['title', 'type', 'status', 'startTime', 'endTime', 
                           'host', 'participants', 'agendaItems', 'createdBy'];
    for (let field of requiredFields) {
      if (!meeting[field]) {
        throw new Error(`缺少必填字段: ${field}`);
      }
    }
    console.log('✓ 必填字段验证通过');
    
    // 验证议题结构
    for (let item of meeting.agendaItems) {
      if (!item.id || !item.title || !item.type || !item.presenters || item.presenters.length === 0) {
        throw new Error('议题结构验证失败');
      }
    }
    console.log('✓ 议题结构验证通过');
    
    // ========================================
    // 测试3: 测试索引 - 按时间查询
    // ========================================
    console.log('\n测试3: 测试索引 - 按时间查询...');
    const timeQueryResult = await db.collection('meetings')
      .where({
        startTime: _.gte(new Date('2025-02-01'))
      })
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();
    console.log('✓ 时间索引查询成功, 结果数:', timeQueryResult.data.length);
    
    // ========================================
    // 测试4: 测试索引 - 按状态+时间查询
    // ========================================
    console.log('\n测试4: 测试索引 - 按状态+时间查询...');
    const statusQueryResult = await db.collection('meetings')
      .where({
        status: '待召开'
      })
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();
    console.log('✓ 状态索引查询成功, 结果数:', statusQueryResult.data.length);
    
    // ========================================
    // 测试5: 测试索引 - 按主持人查询
    // ========================================
    console.log('\n测试5: 测试索引 - 按主持人查询...');
    const hostQueryResult = await db.collection('meetings')
      .where({
        host: 'test-host-id'
      })
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();
    console.log('✓ 主持人索引查询成功, 结果数:', hostQueryResult.data.length);
    
    // ========================================
    // 测试6: 测试索引 - 按参会人查询
    // ========================================
    console.log('\n测试6: 测试索引 - 按参会人查询...');
    const participantQueryResult = await db.collection('meetings')
      .where({
        participants: 'test-user-1'
      })
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();
    console.log('✓ 参会人索引查询成功, 结果数:', participantQueryResult.data.length);
    
    // ========================================
    // 测试7: 测试议题查询
    // ========================================
    console.log('\n测试7: 测试议题查询...');
    const agendaQueryResult = await db.collection('meetings')
      .where({
        'agendaItems.presenters': 'test-user-1'
      })
      .get();
    console.log('✓ 议题汇报人查询成功, 结果数:', agendaQueryResult.data.length);
    
    // ========================================
    // 测试8: 更新会议状态
    // ========================================
    console.log('\n测试8: 更新会议状态...');
    await db.collection('meetings').doc(testMeetingId).update({
      data: {
        status: '进行中',
        updatedAt: new Date()
      }
    });
    console.log('✓ 状态更新成功');
    
    // ========================================
    // 测试9: 更新议题
    // ========================================
    console.log('\n测试9: 更新议题...');
    await db.collection('meetings').doc(testMeetingId).update({
      data: {
        'agendaItems.0.conclusion': '更新后的结论内容',
        updatedAt: new Date()
      }
    });
    console.log('✓ 议题更新成功');
    
    // ========================================
    // 测试10: 软删除
    // ========================================
    console.log('\n测试10: 软删除...');
    await db.collection('meetings').doc(testMeetingId).update({
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    console.log('✓ 软删除成功');
    
    // ========================================
    // 测试11: 恢复删除
    // ========================================
    console.log('\n测试11: 恢复删除...');
    await db.collection('meetings').doc(testMeetingId).update({
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });
    console.log('✓ 恢复成功');
    
    // ========================================
    // 清理测试数据
    // ========================================
    console.log('\n清理测试数据...');
    await db.collection('meetings').doc(testMeetingId).remove();
    console.log('✓ 测试数据清理完成');
    
    console.log('\n==========================================');
    console.log('✅ 所有测试通过！');
    console.log('==========================================');
    console.log('测试结果:');
    console.log('  ✓ 数据结构正确');
    console.log('  ✓ 必填字段验证通过');
    console.log('  ✓ 议题结构验证通过');
    console.log('  ✓ 所有索引工作正常');
    console.log('  ✓ 增删改查功能正常');
    console.log('==========================================');
    
    return {
      success: true,
      message: '所有测试通过'
    };
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    
    // 清理测试数据
    if (testMeetingId) {
      try {
        await db.collection('meetings').doc(testMeetingId).remove();
        console.log('测试数据已清理');
      } catch (cleanError) {
        console.error('清理测试数据失败:', cleanError);
      }
    }
    
    throw error;
  }
}

// 执行测试
testMeetingsSchema()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
