/**
 * 云函数: message-read
 * 功能: 标记消息为已读
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 🔧 修复: Web应用使用 userId，小程序使用 OPENID
  const openid = wxContext.OPENID || (wxContext.ENV && wxContext.ENV.UIN) || event.userId || event.openid || 'test-user';
  
  console.log('✓ [标记已读] 用户身份:', {
    OPENID: wxContext.OPENID,
    userId: event.userId,
    finalOpenid: openid
  });

  try {
    const { 
      messageId,    // 单条消息ID (可选)
      markAll       // 是否全部标记已读 (可选)
    } = event;

    // 标记全部已读
    if (markAll) {
      // 🔧 兼容 receiver 和 recipientId 两个字段
      const result = await db.collection('messages')
        .where(_.and([
          _.or([
            { receiver: openid },
            { recipientId: openid }
          ]),
          { isRead: false }
        ]))
        .update({
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
      
      console.log('✅ [标记已读] 全部标记成功:', {
        updated: result.stats.updated || 0
      });

      return {
        success: true,
        data: {
          updated: result.stats.updated || 0
        }
      };
    }

    // 标记单条已读
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
      
      // 🔧 兼容 receiver 和 recipientId 两个字段
      if (messageData.receiver !== openid && messageData.recipientId !== openid) {
        return {
          success: false,
          error: '无权操作此消息'
        };
      }

      // 更新消息状态
      await db.collection('messages')
        .doc(messageId)
        .update({
          data: {
            isRead: true,
            readAt: new Date()
          }
        });

      return {
        success: true,
        data: {
          updated: 1
        }
      };
    }

    // 如果没有任何参数,返回友好提示
    return {
      success: true,
      data: {
        updated: 0,
        message: '没有需要标记的消息'
      }
    };

  } catch (error) {
    console.error('标记消息已读失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
