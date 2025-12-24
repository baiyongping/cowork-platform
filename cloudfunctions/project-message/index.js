const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 项目消息通知云函数
 * 
 * 支持的操作类型:
 * - create: 项目创建
 * - statusChange: 项目状态变更
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 🔧 修复: Web应用使用 userId，小程序使用 OPENID
  const openid = wxContext.OPENID || (wxContext.ENV && wxContext.ENV.UIN) || event.userId || event.openid || 'test-user';
  
  console.log('📝 [项目消息通知] wxContext:', {
    OPENID: wxContext.OPENID,
    UIN: wxContext.ENV?.UIN,
    eventOpenid: event.openid,
    eventUserId: event.userId
  });

  try {
    const { 
      action,           // 操作类型: create/statusChange
      projectId,        // 项目ID
      projectName,      // 项目名称
      receiver,         // 接收人openid
      receivers = [],   // 接收人openid数组(批量)
      newStatus,        // 新状态(action=statusChange时)
      userId            // 🆕 发送者用户ID (Web应用使用)
    } = event;

    // 参数验证
    if (!action || !projectId || !projectName) {
      return {
        success: false,
        error: '缺少必要参数'
      };
    }

    // 根据不同操作类型生成消息
    let messageData = null;

    switch (action) {
      case 'create':
        // 项目创建通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'project',
          title: '新项目分配',
          content: `您被分配了新项目: ${projectName}`,
          relatedType: 'project',
          relatedId: projectId,
          metadata: {
            projectName,
            action: 'create'
          }
        };
        break;

      case 'statusChange':
        // 项目状态变更通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'project',
          title: '项目状态变更',
          content: `项目"${projectName}"的状态变更为"${newStatus}"`,
          relatedType: 'project',
          relatedId: projectId,
          metadata: {
            projectName,
            newStatus,
            action: 'statusChange'
          }
        };
        break;

      default:
        return {
          success: false,
          error: '不支持的操作类型'
        };
    }

    // 准备接收人列表
    const receiverList = receiver ? [receiver] : receivers;
    
    console.log('📨 [项目消息通知] 准备发送消息:', {
      action,
      projectId,
      projectName,
      sender: userId || openid,
      receivers: receiverList,
      messageType: messageData.type
    });

    // 批量创建消息
    const now = new Date();
    const messages = receiverList.map(r => ({
      ...messageData,
      receiver: r,
      sender: userId || openid,  // 🔧 优先使用传入的 userId
      isRead: false,
      createdAt: now
    }));
    
    console.log('📝 [项目消息通知] 准备插入的消息数据:', JSON.stringify(messages, null, 2));

    // 插入消息
    const promises = messages.map(msg => 
      db.collection('messages').add({ data: msg })  // 🔧 修复: add() 需要传入 data 字段
    );

    const results = await Promise.all(promises);
    
    console.log('✅ [项目消息通知] 消息创建成功:', {
      created: messages.length,
      messageIds: results.map(r => r._id),
      results: JSON.stringify(results, null, 2)
    });

    return {
      success: true,
      data: {
        created: messages.length
      }
    };

  } catch (error) {
    console.error('❌ [项目消息通知] 错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
