// 云函数：获取工作台数据
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
    const userName = userRes.data[0].name;

    // 2. 查询今日任务
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksRes = await db.collection('tasks')
      .where({
        isDeleted: false,
        $or: [
          { owner: userId },
          { collaborators: userId }
        ]
      })
      .get();

    // 3. 查询商机
    const opportunitiesRes = await db.collection('opportunities')
      .where({
        isDeleted: false,
        owner: userId
      })
      .get();

    // 4. 查询项目
    const projectsRes = await db.collection('projects')
      .where({
        isDeleted: false,
        owner: userId
      })
      .get();

    // 处理任务数据
    const recentTasks = tasksRes.data.slice(0, 3).map(task => ({
      _id: task._id,
      name: task.name,
      ownerName: userName,
      endDate: formatDate(task.endDate),
      status: task.status,
      statusText: getTaskStatusText(task.status)
    }));

    // 处理商机数据
    const recentOpportunities = opportunitiesRes.data.slice(0, 3).map(opp => ({
      _id: opp._id,
      name: opp.name,
      ownerName: userName,
      estimatedAmount: opp.estimatedAmount || 0,
      stage: opp.stage || '初步接触'
    }));

    return {
      success: true,
      statistics: {
        todayTasks: tasksRes.data.filter(t => t.status === '进行中').length,
        pendingOpportunities: opportunitiesRes.data.filter(o => o.status !== '已成交').length,
        ongoingProjects: projectsRes.data.filter(p => p.status === '进行中').length
      },
      recentTasks,
      recentOpportunities
    };
  } catch (err) {
    console.error('查询失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};

// 辅助函数：格式化日期
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

// 辅助函数：获取任务状态文本
function getTaskStatusText(status) {
  const statusMap = {
    '未开始': '待开始',
    '进行中': '进行中',
    '已完成': '已完成',
    '延期': '已延期',
    '取消': '已取消'
  };
  return statusMap[status] || status;
}
