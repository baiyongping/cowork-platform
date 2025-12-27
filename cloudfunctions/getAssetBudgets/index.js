// 云函数：获取资产预算数据
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  console.log('========== 获取资产预算数据 ==========');
  console.log('请求参数:', event);
  console.log('用户 OPENID:', wxContext.OPENID);
  
  try {
    const { year } = event;
    
    if (!year) {
      return {
        success: false,
        message: '缺少年份参数',
        data: null
      };
    }
    
    // 集合名称：assetBudgets_2025
    const collectionName = `assetBudgets_${year}`;
    console.log('查询集合:', collectionName);
    
    // 查询该年份的所有资产预算记录
    const result = await db.collection(collectionName)
      .orderBy('order', 'asc')
      .get();
    
    console.log('查询结果:', {
      total: result.data.length,
      data: result.data
    });
    
    return {
      success: true,
      message: '获取资产预算数据成功',
      data: result.data
    };
    
  } catch (error) {
    console.error('❌ 获取资产预算数据失败:', error);
    return {
      success: false,
      message: error.message || '获取资产预算数据失败',
      data: null
    };
  }
};
