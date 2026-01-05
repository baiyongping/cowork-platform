// 云函数：从会议议程生成问题
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();

  try {
    switch (action) {
      case 'generateIssue':
        return await generateIssueFromAgenda(data, wxContext);
      default:
        return {
          success: false,
          error: `未知操作: ${action}`
        };
    }
  } catch (error) {
    console.error(`[${action}] 错误:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 从议程生成问题记录
 */
async function generateIssueFromAgenda(data, wxContext) {
  const { meetingId, agendaId, agendaTitle, agendaDescription } = data;

  // 验证参数
  if (!meetingId || !agendaId) {
    throw new Error('缺少必填参数');
  }

  // 查询会议信息
  const meetingResult = await db.collection('meetings').doc(meetingId).get();
  if (!meetingResult.data) {
    throw new Error('会议不存在');
  }

  const meeting = meetingResult.data;

  // 查询用户信息
  const userResult = await db.collection('users')
    .where({
      _openid: wxContext.OPENID
    })
    .get();

  if (!userResult.data || userResult.data.length === 0) {
    throw new Error('用户不存在');
  }

  const user = userResult.data[0];

  // 创建问题记录
  const issueData = {
    title: agendaTitle || '会议议程问题',
    description: agendaDescription || `来自会议"${meeting.title}"的议程讨论`,
    level: '团队级',
    priority: '中',
    status: '待处理',
    source: '例会讨论',
    relatedMeetings: [meetingId],
    relatedAgendaId: agendaId,
    reporter: user.name,
    reporterId: user._id,
    reporterOpenid: wxContext.OPENID,
    reportTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // 插入问题记录
  const result = await db.collection('issueRecords').add({
    data: issueData
  });

  return {
    success: true,
    data: {
      issueId: result._id,
      ...issueData
    }
  };
}
