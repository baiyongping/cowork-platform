// 云函数：获取任务列表
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

    // 2. 查询用户的任务
    const tasksRes = await db.collection('tasks')
      .where({
        isDeleted: false,
        $or: [
          { owner: userId },
          { collaborators: userId }
        ]
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const tasks = tasksRes.data.map(task => ({
      _id: task._id,
      name: task.name,
      endDate: formatDate(task.endDate),
      progress: task.progress || 0,
      status: task.status,
      statusText: getTaskStatusText(task.status)
    }));

    return {
      success: true,
      tasks
    };
  } catch (err) {
    console.error('查询任务失败:', err);
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
