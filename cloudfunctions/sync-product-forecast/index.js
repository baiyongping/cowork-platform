const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 云函数：同步产品订单预测数据
 * 用于同步所有"成交"商机到产品订单预测表
 * 
 * @param {number} year - 要同步的年份（可选，默认当前年份）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    console.log('=== 开始同步产品订单预测数据 ===');
    
    const year = event.year || new Date().getFullYear();
    console.log(`✓ 同步年份: ${year}`);
    
    // 1. 查询所有"成交"的商机
    const opportunitiesResult = await db.collection('opportunities')
      .where({
        stage: '成交',
        isClosed: true,
        isDeleted: db.command.neq(true)
      })
      .get();
    
    const opportunities = opportunitiesResult.data;
    console.log(`✓ 找到 ${opportunities.length} 个成交商机`);
    
    if (opportunities.length === 0) {
      return {
        success: true,
        message: '没有需要同步的商机',
        synced: 0
      };
    }
    
    // 2. 按产品类别汇总数据
    const categoryStats = {};
    
    for (const opp of opportunities) {
      const demands = opp.requirements || [];
      const closedDate = new Date(opp.closedAt || opp.updatedAt);
      const month = closedDate.getMonth() + 1;
      const quarter = Math.ceil(month / 3);
      
      for (const demand of demands) {
        const categoryName = demand.productType || '其他';
        
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = {
            quantity: 0,
            amount: 0,
            totalCost: 0,
            q1Amount: 0,
            q2Amount: 0,
            q3Amount: 0,
            q4Amount: 0
          };
        }
        
        const stats = categoryStats[categoryName];
        stats.quantity += demand.quantity || 0;
        stats.amount += demand.totalPrice || 0;
        stats.totalCost += (demand.quantity || 0) * (demand.estimatedCost || 0);
        
        // 累加季度金额
        if (quarter === 1) stats.q1Amount += demand.totalPrice || 0;
        else if (quarter === 2) stats.q2Amount += demand.totalPrice || 0;
        else if (quarter === 3) stats.q3Amount += demand.totalPrice || 0;
        else if (quarter === 4) stats.q4Amount += demand.totalPrice || 0;
      }
    }
    
    console.log(`✓ 统计了 ${Object.keys(categoryStats).length} 个产品类别`);
    
    // 3. 更新产品订单预测表
    let updatedCount = 0;
    
    for (const [categoryName, stats] of Object.entries(categoryStats)) {
      console.log(`\n--- 更新产品类别: ${categoryName} ---`);
      
      // 查询是否已有该产品类别的记录
      const forecastResult = await db.collection('product_order_forecast')
        .where({
          year: year,
          categoryName: categoryName
        })
        .get();
      
      // 计算平均值
      const avgUnitPrice = stats.quantity > 0 ? stats.amount / stats.quantity : 0;
      const avgCost = stats.quantity > 0 ? stats.totalCost / stats.quantity : 0;
      const avgGrossMargin = avgUnitPrice > 0 ? (avgUnitPrice - avgCost) / avgUnitPrice * 100 : 0;
      
      if (forecastResult.data && forecastResult.data.length > 0) {
        // 已存在，直接覆盖（重新同步）
        const forecastId = forecastResult.data[0]._id;
        const currentData = forecastResult.data[0];
        
        const completedAmount = stats.amount;
        const completionRate = currentData.forecast?.totalAmount > 0 
          ? (completedAmount / currentData.forecast.totalAmount * 100) 
          : 0;
        
        await db.collection('product_order_forecast')
          .doc(forecastId)
          .update({
            data: {
              'actual.completedAmount': completedAmount,
              'actual.totalQuantity': stats.quantity,
              'actual.totalCost': stats.totalCost,
              'actual.avgUnitPrice': avgUnitPrice,
              'actual.avgCost': avgCost,
              'actual.avgGrossMargin': avgGrossMargin,
              'actual.completionRate': completionRate,
              'actual.q1Amount': stats.q1Amount,
              'actual.q2Amount': stats.q2Amount,
              'actual.q3Amount': stats.q3Amount,
              'actual.q4Amount': stats.q4Amount,
              updatedAt: new Date()
            }
          });
        
        console.log(`  ✓ 更新成功 (覆盖模式)`);
      } else {
        // 不存在，创建新记录
        await db.collection('product_order_forecast').add({
          data: {
            _openid: wxContext.OPENID,
            year: year,
            categoryName: categoryName,
            
            // 预测目标部分（空）
            forecast: {
              quantity: 0,
              unitPrice: 0,
              totalAmount: 0
            },
            
            // 实际订单部分
            actual: {
              completedAmount: stats.amount,
              completionRate: 0,
              totalQuantity: stats.quantity,
              totalCost: stats.totalCost,
              avgUnitPrice: avgUnitPrice,
              avgCost: avgCost,
              avgGrossMargin: avgGrossMargin,
              q1Amount: stats.q1Amount,
              q2Amount: stats.q2Amount,
              q3Amount: stats.q3Amount,
              q4Amount: stats.q4Amount
            },
            
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`  ✓ 新建成功`);
      }
      
      updatedCount++;
    }
    
    console.log(`\n✅ 同步完成！更新了 ${updatedCount} 个产品类别`);
    
    return {
      success: true,
      message: `成功同步 ${opportunities.length} 个商机的 ${updatedCount} 个产品类别`,
      opportunities: opportunities.length,
      categories: updatedCount,
      categoryStats: categoryStats
    };
    
  } catch (error) {
    console.error('❌ 同步产品订单预测失败:', error);
    return {
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
};
