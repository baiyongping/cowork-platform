/**
 * 云函数: message-count
 * 功能: 统计未读消息数量
 * 
 * 参数: 无
 * 
 * 返回值:
 * {
 *   success: true,
 *   data: {
 *     total: 15,        // 总未读数
 *     byType: {         // 按类型统计
 *       task: 5,
 *       opportunity: 3,
 *       project: 2,
 *       goal: 1,
 *       strategy: 1,
 *       system: 2,
 *       mention: 1
 *     }
 *   }
 * }
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  // 🔍 调试：打印完整的 event 对象
  console.log('🔍 [message-count] 接收到的 event:', JSON.stringify(event));
  
  // 🔧 支持 Web 和小程序双环境
  // Web: event.userId (通过 CloudBase Auth 传递)
  // 小程序: wxContext.OPENID
  const userId = event.userId || wxContext.OPENID || 'test-user';

  console.log('🔔 [message-count] 统计未读消息, userId:', userId);

  try {
    // 🔧 构建查询条件：同时支持 receiver 和 recipientId 两个字段
    const query = _.or([
      {
        receiver: userId,
        isRead: false
      },
      {
        recipientId: userId,
        isRead: false
      }
    ]);

    // 1. 查询总未读数
    const totalResult = await db.collection('messages')
      .where(query)
      .count();

    const total = totalResult?.total || 0;
    console.log('🔔 [message-count] 总未读数:', total);

    // 2. 按类型统计未读数
    const byType = {};

    // 查询所有未读消息
    const messagesResult = await db.collection('messages')
      .where(query)
      .field({
        type: true
      })
      .get();

    const messages = messagesResult?.data || [];

    // 统计各类型数量
    messages.forEach(msg => {
      const type = msg.type || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    // 返回结果
    return {
      success: true,
      data: {
        total,
        byType
      }
    };

  } catch (error) {
    console.error('统计未读消息失败:', error);
    return {
      success: false,
      error: error.message || '统计未读消息失败'
    };
  }
};
