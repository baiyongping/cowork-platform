// 云函数:获取问题列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 1. 通过openid查询用户信息
    const userRes = await db.collection('users')
      .where({ wxOpenId: openId })
      .field({ _id: true, name: true })
      .get();

    if (!userRes.data.length) {
      return {
        success: false,
        message: '用户未绑定'
      };
    }

    const userId = userRes.data[0]._id;

    // 2. 查询用户的问题
    const issuesRes = await db.collection('issues')
      .where({
        isDeleted: false,
        $or: [
          { owner: userId },
          { solvers: userId }
        ]
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const issues = issuesRes.data.map(issue => ({
      _id: issue._id,
      name: issue.name,
      endDate: formatDate(issue.endDate),
      status: issue.status,
      statusText: getIssueStatusText(issue.status)
    }));

    return {
      success: true,
      issues
    };
  } catch (err) {
    console.error('查询问题失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function getIssueStatusText(status) {
  const statusMap = {
    '未开始': '待开始',
    '进行中': '进行中',
    '已完成': '已完成',
    '延期': '已延期',
    '取消': '已取消'
  };
  return statusMap[status] || status;
}
