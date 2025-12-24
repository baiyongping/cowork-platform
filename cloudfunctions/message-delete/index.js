/**
 * 云函数: message-delete
 * 功能: 删除消息
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 🔧 修复: Web应用使用 userId，小程序使用 OPENID
  const openid = wxContext.OPENID || (wxContext.ENV && wxContext.ENV.UIN) || event.userId || event.openid || 'test-user';
  
  console.log('🗑️ [删除消息] 用户身份:', {
    OPENID: wxContext.OPENID,
    userId: event.userId,
    finalOpenid: openid
  });

  try {
    const { 
      messageId,     // 单条消息ID (可选)
      messageIds     // 多条消息ID数组 (可选)
    } = event;

    // 批量删除
    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      // 先查询这些消息是否都属于当前用户
      const messages = await db.collection('messages')
        .where({
          _id: db.command.in(messageIds),
          receiver: openid
        })
        .get();

      if (!messages.data || messages.data.length === 0) {
        return {
          success: false,
          error: '没有可删除的消息'
        };
      }

      // 只删除属于当前用户的消息
      const validIds = messages.data.map(msg => msg._id);
      
      const result = await db.collection('messages')
        .where({
          _id: db.command.in(validIds)
        })
        .remove();
      
      console.log('✅ [删除消息] 批量删除成功:', {
        deleted: result.stats.removed || 0
      });

      return {
        success: true,
        data: {
          deleted: result.stats.removed || 0
        }
      };
    }

    // 删除单条
    if (messageId) {
      // 先查询消息是否存在且属于当前用户
      const message = await db.collection('messages')
        .doc(messageId)
        .get();

      if (!message.data || message.data.length === 0) {
        return {
          success: false,
          error: '消息不存在'
        };
      }

      const messageData = message.data[0] || message.data;
      
      if (messageData.receiver !== openid) {
        return {
          success: false,
          error: '无权删除此消息'
        };
      }

      // 删除消息
      await db.collection('messages')
        .doc(messageId)
        .remove();

      return {
        success: true,
        data: {
          deleted: 1
        }
      };
    }

    // 如果没有任何参数,返回友好提示
    return {
      success: true,
      data: {
        deleted: 0,
        message: '没有需要删除的消息'
      }
    };

  } catch (error) {
    console.error('删除消息失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
