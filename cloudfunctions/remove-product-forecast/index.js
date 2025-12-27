/**
 * 云函数：删除商机时从产品订单预测中扣减数据
 * 功能：当商机被删除时，如果该商机已形成项目，则从产品订单预测表中扣减相应的数据
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  console.log(`🚀 remove-product-forecast 云函数开始执行`);
  console.log(`  - 传入参数:`, JSON.stringify(event, null, 2));
  
  const { opportunityId } = event;
  
  if (!opportunityId) {
    console.error(`❌ 缺少必需参数: opportunityId`);
    return {
      success: false,
      message: '缺少必需参数: opportunityId'
    };
  }
  
  try {
    // 1. 读取商机信息
    const opportunityResult = await db.collection('opportunities')
      .doc(opportunityId)
      .get();
    
    if (!opportunityResult.data) {
      console.error(`❌ 商机不存在: ${opportunityId}`);
      return {
        success: false,
        message: '商机不存在'
      };
    }
    
    const opportunity = opportunityResult.data;
    console.log(`✓ 找到商机: ${opportunity.name}`);
    
    // 2. 检查是否已形成项目
    if (!opportunity.isProjectFormed) {
      console.log(`⚠️  该商机未形成项目，无需扣减`);
      return {
        success: true,
        message: '该商机未形成项目，无需扣减'
      };
    }
    
    // 3. 获取产品贡献记录
    const productContributions = opportunity.productContributions || [];
    
    if (productContributions.length === 0) {
      console.log(`⚠️  该商机没有产品贡献记录，无需扣减`);
      return {
        success: true,
        message: '该商机没有产品贡献记录'
      };
    }
    
    console.log(`✓ 找到 ${productContributions.length} 条产品贡献记录`);
    
    // 4. 按产品类别扣减数据
    let updatedCount = 0;
    
    for (const contribution of productContributions) {
      const { productCategory, year, quarter, quantity, amount, totalCost } = contribution;
      
      console.log(`\n📦 处理产品类别: ${productCategory} (${year}年Q${quarter})`);
      console.log(`  - 扣减数量: ${quantity}`);
      console.log(`  - 扣减金额: ${amount}`);
      console.log(`  - 扣减成本: ${totalCost}`);
      
      // 5. 查找对应的产品订单预测记录
      const forecastResult = await db.collection('product_order_forecast')
        .where({
          year: year,
          categoryName: productCategory
        })
        .get();
      
      if (forecastResult.data.length === 0) {
        console.log(`⚠️  未找到产品订单预测记录，跳过: ${productCategory}`);
        continue;
      }
      
      const currentData = forecastResult.data[0];
      const forecastId = currentData._id;
      
      console.log(`✓ 找到产品订单预测记录: ${forecastId}`);
      
      // 6. 计算扣减后的数据
      const currentCompletedAmount = currentData.actual?.completedAmount || 0;
      const currentTotalQuantity = currentData.actual?.totalQuantity || 0;
      const currentTotalCost = currentData.actual?.totalCost || 0;
      const currentQuarterAmount = currentData.actual?.[`q${quarter}Amount`] || 0;
      
      // 扣减
      const newCompletedAmount = Math.max(0, currentCompletedAmount - amount);
      const newTotalQuantity = Math.max(0, currentTotalQuantity - quantity);
      const newTotalCost = Math.max(0, currentTotalCost - totalCost);
      const newQuarterAmount = Math.max(0, currentQuarterAmount - amount);
      
      // 重新计算平均值
      const newAvgUnitPrice = newTotalQuantity > 0 ? newCompletedAmount / newTotalQuantity : 0;
      const newAvgCost = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
      const newAvgGrossMargin = newAvgUnitPrice > 0 
        ? (newAvgUnitPrice - newAvgCost) / newAvgUnitPrice * 100 
        : 0;
      
      // 完成率
      const forecastAmount = currentData.forecast?.totalAmount || 0;
      const newCompletionRate = forecastAmount > 0 
        ? newCompletedAmount / forecastAmount * 100 
        : 0;
      
      console.log(`  - 扣减后完成额: ${newCompletedAmount}`);
      console.log(`  - 扣减后数量: ${newTotalQuantity}`);
      console.log(`  - 扣减后总成本: ${newTotalCost}`);
      console.log(`  - 扣减后平均单价: ${newAvgUnitPrice.toFixed(2)}`);
      console.log(`  - 扣减后平均成本: ${newAvgCost.toFixed(2)}`);
      console.log(`  - 扣减后平均毛利率: ${newAvgGrossMargin.toFixed(2)}%`);
      
      // 7. 更新数据库
      const quarterField = `q${quarter}Amount`;
      
      await db.collection('product_order_forecast')
        .doc(forecastId)
        .update({
          data: {
            'actual.completedAmount': newCompletedAmount,
            'actual.totalQuantity': newTotalQuantity,
            'actual.totalCost': newTotalCost,
            'actual.avgUnitPrice': newAvgUnitPrice,
            'actual.avgCost': newAvgCost,
            'actual.avgGrossMargin': newAvgGrossMargin,
            'actual.completionRate': newCompletionRate,
            [`actual.${quarterField}`]: newQuarterAmount,
            updatedAt: new Date()
          }
        });
      
      console.log(`✅ 产品订单预测更新成功: ${productCategory}`);
      updatedCount++;
    }
    
    console.log(`\n✅ 产品订单预测扣减完成！更新了 ${updatedCount} 个产品类别`);
    
    return {
      success: true,
      message: `成功从 ${updatedCount} 个产品类别扣减订单数据`,
      updated: updatedCount,
      categories: productContributions.map(c => c.productCategory)
    };
    
  } catch (error) {
    console.error(`❌ 云函数执行失败:`, error);
    return {
      success: false,
      message: error.message || '扣减产品订单预测失败',
      error: error.toString()
    };
  }
};
