// 云函数：获取项目列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

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

    // 2. 查询用户的项目
    const projectsRes = await db.collection('projects')
      .where({
        isDeleted: false,
        owner: userId
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const projects = projectsRes.data.map(project => ({
      _id: project._id,
      name: project.name,
      ownerName: userName,
      progress: project.progress || 0,
      status: project.status || '进行中'
    }));

    return {
      success: true,
      projects
    };
  } catch (err) {
    console.error('查询项目失败:', err);
    return {
      success: false,
      message: '查询失败',
      error: err.message
    };
  }
};
