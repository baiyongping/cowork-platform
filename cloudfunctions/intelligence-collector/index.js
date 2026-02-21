/**
 * 客户情报采集云函数
 * 功能：
 * 1. 从互联网搜索客户相关情报
 * 2. 保存情报到数据库
 * 3. 管理情报数据
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 从互联网搜索客户情报
 * 注意：这是一个模拟实现，实际应该调用真实的搜索API
 */
async function searchIntelligence(customerName, types, customQuery, maxResults = 10) {
  console.log('开始搜索情报:', { customerName, types, customQuery, maxResults });
  
  // 模拟搜索结果
  // 在实际应用中，这里应该调用真实的搜索API，如：
  // - 企业信息查询API（天眼查、企查查等）
  // - 新闻搜索API
  // - 行业报告数据库
  // - 社交媒体API
  
  const mockResults = [];
  
  // 为每个选中的类型生成模拟数据
  for (const type of types) {
    const typeResults = generateMockDataForType(type, customerName, customQuery);
    mockResults.push(...typeResults);
  }
  
  // 限制结果数量
  return mockResults.slice(0, maxResults);
}

/**
 * 为指定类型生成模拟数据
 */
function generateMockDataForType(type, customerName, customQuery) {
  const results = [];
  const keyword = customQuery || '';
  
  switch (type) {
    case 'company_background':
      results.push({
        type: 'company_background',
        title: `${customerName}公司背景信息`,
        content: `${customerName}成立于2015年，是一家专注于${keyword || '行业解决方案'}的企业。公司总部位于北京，注册资本5000万元，拥有员工200余人。公司主要业务包括产品研发、销售和技术服务。`,
        summary: `${customerName}成立于2015年，注册资本5000万，专注于${keyword || '行业解决方案'}。`,
        keywords: ['公司背景', '企业信息', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/company/${encodeURIComponent(customerName)}`,
        reliability: 85
      });
      break;
      
    case 'business_status':
      results.push({
        type: 'business_status',
        title: `${customerName}最新经营状况`,
        content: `根据公开信息，${customerName}2023年营收达到1.2亿元，同比增长25%。公司在${keyword || '核心业务'}领域保持稳定增长态势，市场占有率逐年提升。`,
        summary: `${customerName}2023年营收1.2亿，同比增长25%，${keyword || '核心业务'}保持增长。`,
        keywords: ['经营状况', '营收', '增长', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/business/${encodeURIComponent(customerName)}`,
        reliability: 78
      });
      break;
      
    case 'industry_trends':
      results.push({
        type: 'industry_trends',
        title: `${customerName}所在行业发展趋势`,
        content: `${customerName}所在的${keyword || '行业'}近年来呈现快速发展态势。市场规模持续扩大，预计未来三年复合增长率将达到18%。数字化转型成为行业主要趋势。`,
        summary: `${keyword || '行业'}市场规模扩大，未来三年预计增长18%，数字化转型成趋势。`,
        keywords: ['行业趋势', '市场分析', '发展前景', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/industry/${encodeURIComponent(customerName)}`,
        reliability: 72
      });
      break;
      
    case 'competitor_info':
      results.push({
        type: 'competitor_info',
        title: `${customerName}主要竞争对手分析`,
        content: `${customerName}的主要竞争对手包括A公司、B公司和C公司。在${keyword || '市场竞争'}中，${customerName}凭借技术优势和服务质量占据一定市场份额。`,
        summary: `主要竞争对手：A公司、B公司、C公司。${customerName}凭借技术和服务优势占据市场。`,
        keywords: ['竞争对手', '市场竞争', '竞争分析', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/competitor/${encodeURIComponent(customerName)}`,
        reliability: 70
      });
      break;
      
    case 'key_persons':
      results.push({
        type: 'key_persons',
        title: `${customerName}关键人物信息`,
        content: `${customerName}董事长张某某，拥有20年${keyword || '行业'}从业经验，曾在多家知名企业担任高管。总经理李某某负责日常运营管理。`,
        summary: `董事长张某某20年${keyword || '行业'}经验，总经理李某某负责运营。`,
        keywords: ['关键人物', '高管信息', '企业领导', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/keyperson/${encodeURIComponent(customerName)}`,
        reliability: 68
      });
      break;
      
    case 'risk_warning':
      results.push({
        type: 'risk_warning',
        title: `${customerName}风险评估`,
        content: `根据公开信息，${customerName}目前经营状况良好，暂未发现重大经营风险。建议关注${keyword || '市场变化'}和行业政策变动。`,
        summary: `${customerName}经营状况良好，无重大风险，需关注${keyword || '市场变化'}。`,
        keywords: ['风险评估', '风险预警', '经营风险', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/risk/${encodeURIComponent(customerName)}`,
        reliability: 75
      });
      break;
      
    default:
      results.push({
        type: 'other',
        title: `${customerName}其他相关信息`,
        content: `关于${customerName}的${keyword || '相关'}信息正在收集中...`,
        summary: `${customerName}${keyword || '相关'}信息。`,
        keywords: ['其他信息', customerName, keyword].filter(Boolean),
        sourceUrl: `https://example.com/other/${encodeURIComponent(customerName)}`,
        reliability: 60
      });
  }
  
  return results;
}

/**
 * 保存情报到数据库
 */
async function saveIntelligence(intelligenceData, userId) {
  console.log('保存情报:', intelligenceData);
  
  try {
    const now = new Date();
    
    // 构建完整的情报数据
    const intelligence = {
      ...intelligenceData,
      status: 'collected',
      collectedBy: userId,
      createdAt: now,
      updatedAt: now,
      // 设置30天后过期
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    };
    
    // 保存到数据库
    const result = await db.collection('customer_intelligence').add({
      data: intelligence
    });
    
    console.log('情报保存成功:', result);
    
    return {
      success: true,
      data: {
        _id: result._id,
        ...intelligence
      }
    };
  } catch (error) {
    console.error('保存情报失败:', error);
    throw error;
  }
}

/**
 * 查询情报列表
 */
async function listIntelligence(filters = {}) {
  console.log('查询情报列表:', filters);
  
  try {
    const {
      customerId,
      opportunityId,
      type,
      status,
      keyword,
      page = 1,
      pageSize = 20
    } = filters;
    
    // 构建查询条件
    const conditions = {};
    
    if (customerId) {
      conditions.customerId = customerId;
    }
    
    if (opportunityId) {
      conditions.opportunityId = opportunityId;
    }
    
    if (type && type !== 'all') {
      conditions.type = type;
    }
    
    if (status && status !== 'all') {
      conditions.status = status;
    }
    
    if (keyword) {
      // 使用正则表达式搜索标题和内容
      const regex = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
      conditions.$or = [
        { title: regex },
        { content: regex },
        { summary: regex }
      ];
    }
    
    // 查询总数
    const countResult = await db.collection('customer_intelligence')
      .where(conditions)
      .count();
    
    // 查询分页数据
    const skip = (page - 1) * pageSize;
    const listResult = await db.collection('customer_intelligence')
      .where(conditions)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    return {
      success: true,
      data: {
        total: countResult.total,
        list: listResult.data,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    };
  } catch (error) {
    console.error('查询情报失败:', error);
    throw error;
  }
}

/**
 * 删除情报
 */
async function deleteIntelligence(intelligenceId) {
  console.log('删除情报:', intelligenceId);
  
  try {
    await db.collection('customer_intelligence')
      .doc(intelligenceId)
      .remove();
    
    return {
      success: true,
      message: '情报删除成功'
    };
  } catch (error) {
    console.error('删除情报失败:', error);
    throw error;
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  console.log('intelligence-collector 云函数调用:', event);
  
  const { action } = event;
  
  try {
    switch (action) {
      case 'search':
        // 搜索情报
        const { customerName, types, customQuery, maxResults } = event;
        const searchResults = await searchIntelligence(
          customerName,
          types,
          customQuery,
          maxResults
        );
        return {
          success: true,
          data: searchResults
        };
        
      case 'save':
        // 保存情报
        const { intelligence, userId } = event;
        return await saveIntelligence(intelligence, userId);
        
      case 'list':
        // 查询情报列表
        return await listIntelligence(event.filters || {});
        
      case 'delete':
        // 删除情报
        const { intelligenceId } = event;
        return await deleteIntelligence(intelligenceId);
        
      default:
        return {
          success: false,
          error: `未知操作: ${action}`
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      success: false,
      error: error.message || '操作失败'
    };
  }
};
