/**
 * 云函数: message-list
 * 功能: 查询消息列表,支持分页和筛选
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  // 🔧 修复: Web应用使用 userId，小程序使用 OPENID
  const openid = wxContext.OPENID || (wxContext.ENV && wxContext.ENV.UIN) || event.userId || event.openid || 'test-user';
  
  console.log('📋 [消息列表] 查询参数:', {
    OPENID: wxContext.OPENID,
    userId: event.userId,
    eventOpenid: event.openid,
    finalOpenid: openid
  });

  try {
    // 获取参数
    const { 
      page = 1,           // 页码,默认第1页
      limit = 20,         // 每页数量,默认20条
      type,               // 消息类型筛选 (可选)
      isRead              // 已读状态筛选 (可选: true/false)
    } = event;

    // 构建查询条件
    // 🔧 兼容 receiver 和 recipientId 两个字段
    const query = _.or([
      { receiver: openid },
      { recipientId: openid }
    ]);

    // 类型筛选
    const filters = [];
    if (type) {
      filters.push({ type });
    }

    // 已读状态筛选
    if (typeof isRead === 'boolean') {
      filters.push({ isRead });
    }

    // 组合查询条件
    const finalQuery = filters.length > 0 
      ? _.and([query, ...filters])
      : query;

    // 计算分页参数
    const skip = (page - 1) * limit;

    // 并行查询数据和总数
    const [dataResult, countResult] = await Promise.all([
      // 查询数据
      db.collection('messages')
        .where(finalQuery)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(limit)
        .get(),
      
      // 查询总数
      db.collection('messages')
        .where(finalQuery)
        .count()
    ]);
    
    console.log('✅ [消息列表] 查询成功:', {
      total: countResult?.total || 0,
      returned: dataResult?.data?.length || 0,
      page,
      limit
    });

    return {
      success: true,
      data: {
        total: countResult?.total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        items: dataResult?.data || []
      }
    };

  } catch (error) {
    console.error('查询消息列表失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
