const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    // 更新admin用户的审核状态
    const result = await db.collection('users')
      .where({
        username: 'admin'
      })
      .update({
        data: {
          approvalStatus: 'approved',
          approvedBy: 'system',
          approvedAt: new Date('2025-12-08T00:00:00.000Z'),
          phone: '13800000000'
        }
      });

    return {
      success: true,
      message: 'admin用户更新成功',
      updated: result.stats.updated
    };
  } catch (error) {
    console.error('更新失败:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
};
