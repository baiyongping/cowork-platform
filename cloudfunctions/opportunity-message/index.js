const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 商机消息通知云函数
 * 
 * 支持的操作类型:
 * - create: 商机创建通知
 * - statusChange: 商机状态变更通知
 * - comment: 商机评论通知
 * - collaborator: 新增协同人通知
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 🔧 修复: Web应用使用 userId，小程序使用 OPENID
  const openid = wxContext.OPENID || (wxContext.ENV && wxContext.ENV.UIN) || event.userId || event.openid || 'test-user';
  
  console.log('📝 [商机消息通知] wxContext:', {
    OPENID: wxContext.OPENID,
    UIN: wxContext.ENV?.UIN,
    eventOpenid: event.openid,
    eventUserId: event.userId
  });

  try {
    const { 
      action,           // 操作类型: create/statusChange/comment/collaborator
      opportunityId,    // 商机ID
      opportunityName,  // 商机名称
      customer,         // 客户名称
      receiver,         // 接收者(单个)
      receivers = [],   // 接收者(多个)
      newStatus,        // 新状态(状态变更时使用)
      userId            // 🆕 发送者用户ID (Web应用使用)
    } = event;

    // 参数验证
    if (!action || !opportunityId || !opportunityName) {
      return {
        success: false,
        error: '缺少必要参数'
      };
    }

    // 根据不同操作类型生成消息
    let messageData = null;

    switch (action) {
      case 'create':
        // 商机创建通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'opportunity',
          title: '新商机待跟进',
          content: customer ? `${customer} 的商机"${opportunityName}"已创建，请及时跟进` : `商机"${opportunityName}"已创建，请及时跟进`,
          relatedType: 'opportunity',
          relatedId: opportunityId,
          metadata: {
            opportunityName,
            customer,
            action: 'create'
          }
        };
        break;

      case 'statusChange':
        // 商机状态变更通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'opportunity',
          title: '商机状态变更',
          content: customer ? `${customer} 的商机"${opportunityName}"状态已更新为"${newStatus}"` : `商机"${opportunityName}"状态已更新为"${newStatus}"`,
          relatedType: 'opportunity',
          relatedId: opportunityId,
          metadata: {
            opportunityName,
            customer,
            newStatus,
            action: 'statusChange'
          }
        };
        break;

      case 'comment':
        // 商机评论通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'opportunity',
          title: '商机新评论',
          content: customer ? `${customer} 的商机"${opportunityName}"有新评论` : `商机"${opportunityName}"有新评论`,
          relatedType: 'opportunity',
          relatedId: opportunityId,
          metadata: {
            opportunityName,
            customer,
            action: 'comment'
          }
        };
        break;

      case 'collaborator':
        // 协同人通知
        if (!receiver && receivers.length === 0) {
          return { success: false, error: '缺少接收人' };
        }
        
        messageData = {
          type: 'opportunity',
          title: '商机协同邀请',
          content: customer ? `您被邀请协同跟进${customer}的商机"${opportunityName}"` : `您被邀请协同商机"${opportunityName}"`,
          relatedType: 'opportunity',
          relatedId: opportunityId,
          metadata: {
            opportunityName,
            customer,
            action: 'collaborator'
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
    
    console.log('📨 [商机消息通知] 准备发送消息:', {
      action,
      opportunityId,
      opportunityName,
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
    
    console.log('📝 [商机消息通知] 准备插入的消息数据:', JSON.stringify(messages, null, 2));

    // 插入消息
    const promises = messages.map(msg => 
      db.collection('messages').add({ data: msg })  // 🔧 修复: add() 需要传入 data 字段
    );

    const results = await Promise.all(promises);
    
    console.log('✅ [商机消息通知] 消息创建成功:', {
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
    console.error('❌ [商机消息通知] 错误:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
