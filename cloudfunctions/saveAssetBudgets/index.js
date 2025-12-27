// 云函数：保存资产预算数据
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  console.log('========== 保存资产预算数据 ==========');
  console.log('请求参数:', JSON.stringify(event, null, 2));
  console.log('用户 OPENID:', wxContext.OPENID);
  
  try {
    const { year, items } = event;
    
    if (!year || !items || !Array.isArray(items)) {
      return {
        success: false,
        message: '参数错误：缺少 year 或 items 参数',
        data: null
      };
    }
    
    // 集合名称：assetBudgets_2025
    const collectionName = `assetBudgets_${year}`;
    console.log('保存到集合:', collectionName);
    console.log('要保存的数据条数:', items.length);
    
    // 获取用户信息（用于记录更新人）
    const userOpenId = wxContext.OPENID;
    const currentTime = new Date();
    
    // 批量保存逻辑：先删除旧数据，再插入新数据
    console.log('开始批量保存...');
    
    // 1. 删除该年份的所有旧记录
    const deleteResult = await db.collection(collectionName)
      .where({
        _openid: _.neq('')  // 删除所有记录
      })
      .remove();
    
    console.log('删除旧记录:', deleteResult.stats);
    
    // 2. 准备新数据
    const dataToSave = items.map((item, index) => ({
      ...item,
      order: index + 1,  // 保存顺序
      updatedBy: userOpenId,
      updatedAt: currentTime,
      year: year
    }));
    
    // 3. 批量插入新数据
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // 分批插入（每次最多20条）
    const batchSize = 20;
    for (let i = 0; i < dataToSave.length; i += batchSize) {
      const batch = dataToSave.slice(i, i + batchSize);
      
      try {
        const batchResult = await db.collection(collectionName).add({
          data: batch
        });
        
        successCount += batch.length;
        console.log(`批次 ${Math.floor(i/batchSize) + 1} 保存成功:`, batch.length, '条');
      } catch (batchError) {
        failedCount += batch.length;
        errors.push({
          batch: Math.floor(i/batchSize) + 1,
          error: batchError.message
        });
        console.error(`批次 ${Math.floor(i/batchSize) + 1} 保存失败:`, batchError);
      }
    }
    
    console.log('========== 保存完成 ==========');
    console.log('成功:', successCount, '条');
    console.log('失败:', failedCount, '条');
    
    if (failedCount > 0) {
      return {
        success: false,
        message: `部分数据保存失败：成功 ${successCount} 条，失败 ${failedCount} 条`,
        data: {
          successCount,
          failedCount,
          errors
        }
      };
    }
    
    return {
      success: true,
      message: `成功保存 ${successCount} 条资产预算数据`,
      data: {
        successCount,
        year,
        collectionName
      }
    };
    
  } catch (error) {
    console.error('❌ 保存资产预算数据失败:', error);
    return {
      success: false,
      message: error.message || '保存资产预算数据失败',
      data: null
    };
  }
};
