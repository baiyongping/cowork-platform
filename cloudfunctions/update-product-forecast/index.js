/**
 * 更新产品订单预测云函数
 * 触发时机：商机"形成项目"时
 * 功能：读取商机需求表，按产品类别累加到对应季度的订单预测
 * Version: v1.0.0
 * Date: 2025-12-26
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { opportunityId } = event;
  
  console.log(`📊 开始更新产品订单预测，商机ID: ${opportunityId}`);
  
  if (!opportunityId) {
    return {
      success: false,
      message: '缺少商机ID参数'
    };
  }
  
  try {
    // 1. 读取商机信息（获取日期判断季度）
    const opportunityResult = await db.collection('opportunities')
      .doc(opportunityId)
      .get();
    
    if (!opportunityResult.data) {
      console.error('❌ 商机不存在');
      return {
        success: false,
        message: '商机不存在'
      };
    }
    
    const opportunity = opportunityResult.data;
    console.log(`✓ 找到商机: ${opportunity.name}`);
    
    // 2. 检查是否已形成项目（防止重复累加）
    // 只检查 isProjectFormed 标记，避免与旧的 projectId 字段冲突
    if (opportunity.isProjectFormed) {
      console.log(`⚠️  该商机已形成项目，跳过更新`);
      return {
        success: false,
        message: '该商机已形成项目，不能重复累加'
      };
    }
    
    // 3. 获取"形成项目"的日期（使用当前日期）
    const projectDate = new Date();
    const year = projectDate.getFullYear();
    const month = projectDate.getMonth() + 1; // 1-12
    const quarter = Math.ceil(month / 3); // 1-4
    
    console.log(`✓ 形成项目日期: ${year}年${month}月 (Q${quarter})`);
    
    // 4. 读取商机需求（从商机记录的 requirements 字段）
    const demands = opportunity.requirements || [];
    
    if (demands.length === 0) {
      console.log('⚠️  该商机没有需求数据，跳过更新');
      return {
        success: true,
        message: '该商机没有需求数据',
        updated: 0
      };
    }
    
    console.log(`✓ 找到 ${demands.length} 条需求记录`);
    
    // 5. 按产品类别分组统计
    const categoryStats = {};
    
    demands.forEach(demand => {
      const category = demand.productType || demand.productCategory || demand.category;
      const quantity = parseInt(demand.quantity) || 0;
      const unitPrice = parseFloat(demand.unitPrice) || 0;
      const estimatedCost = parseFloat(demand.estimatedCost) || 0; // 从商机需求获取成本
      const amount = parseFloat(demand.amount) || (quantity * unitPrice);
      
      if (!category) {
        console.warn(`⚠️  跳过没有产品类别的需求记录: ${JSON.stringify(demand)}`);
        return;
      }
      
      if (!categoryStats[category]) {
        categoryStats[category] = {
          quantity: 0,
          amount: 0,
          totalCost: 0  // 添加总成本统计
        };
      }
      
      categoryStats[category].quantity += quantity;
      categoryStats[category].amount += amount;
      categoryStats[category].totalCost += (quantity * estimatedCost); // 累计总成本
      
      console.log(`  - [${category}] 数量: ${quantity}, 金额: ${amount}, 成本: ${quantity * estimatedCost}`);
    });
    
    console.log(`✓ 统计完成，涉及 ${Object.keys(categoryStats).length} 个产品类别`);
    
    // 5. 更新产品订单预测表
    let updatedCount = 0;
    
    for (const [categoryName, stats] of Object.entries(categoryStats)) {
      try {
        // 5.1 先查询是否存在该产品类别的预测记录
        const forecastResult = await db.collection('product_order_forecast')
          .where({
            year,
            categoryName
          })
          .get();
        
        if (forecastResult.data && forecastResult.data.length > 0) {
          // 5.2 如果存在，累加数据
          const forecastId = forecastResult.data[0]._id;
          const currentData = forecastResult.data[0];
          
          // 计算新的实际数据
          const newCompletedAmount = (currentData.actual?.completedAmount || 0) + stats.amount;
          const newTotalQuantity = (currentData.actual?.totalQuantity || 0) + stats.quantity;
          const newAvgUnitPrice = newTotalQuantity > 0 ? newCompletedAmount / newTotalQuantity : 0;
          
          // 计算新的成本数据
          const currentTotalCost = currentData.actual?.totalCost || 0;
          const newTotalCost = currentTotalCost + stats.totalCost;
          const newAvgCost = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
          
          // 计算新的毛利率：(平均单价 - 平均成本) / 平均单价 * 100%
          const newAvgGrossMargin = newAvgUnitPrice > 0 
            ? ((newAvgUnitPrice - newAvgCost) / newAvgUnitPrice * 100) 
            : 0;
          
          // 计算新的完成率
          const forecastAmount = currentData.forecast?.totalAmount || 0;
          const newCompletionRate = forecastAmount > 0 ? (newCompletedAmount / forecastAmount * 100) : 0;
          
          // 计算新的季度订单额
          const quarterField = `q${quarter}Amount`;
          const newQuarterAmount = (currentData.actual?.[quarterField] || 0) + stats.amount;
          
          // 更新数据
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
          
          console.log(`  ✓ 更新 [${categoryName}] 成功`);
          console.log(`    - 累加订单额: ${stats.amount}`);
          console.log(`    - 累加数量: ${stats.quantity}`);
          console.log(`    - 平均成本: ${newAvgCost.toFixed(2)}`);
          console.log(`    - 平均毛利率: ${newAvgGrossMargin.toFixed(2)}%`);
          console.log(`    - ${quarterField}: ${newQuarterAmount}`);
          
          updatedCount++;
        } else {
          // 5.3 如果不存在，自动创建
          console.log(`  ⚠️  [${categoryName}] 的预测记录不存在，自动创建...`);
          
          const quarterField = `q${quarter}Amount`;
          const avgCost = stats.quantity > 0 ? stats.totalCost / stats.quantity : 0;
          const avgUnitPrice = stats.quantity > 0 ? stats.amount / stats.quantity : 0;
          const avgGrossMargin = avgUnitPrice > 0 
            ? ((avgUnitPrice - avgCost) / avgUnitPrice * 100) 
            : 0;
          
          await db.collection('product_order_forecast').add({
            data: {
              year,
              categoryName,
              
              // 预测部分（空白）
              forecast: {
                quantity: 0,
                unitPrice: 0,
                avgCost: 0,
                avgGrossMargin: 0,
                totalAmount: 0
              },
              
              // 实际订单部分（从商机需求累加）
              actual: {
                completedAmount: stats.amount,
                completionRate: 0, // 因为没有预测数据，完成率为0
                totalQuantity: stats.quantity,
                totalCost: stats.totalCost,
                avgUnitPrice: avgUnitPrice,
                avgCost: avgCost,
                avgGrossMargin: avgGrossMargin,
                q1Amount: quarter === 1 ? stats.amount : 0,
                q2Amount: quarter === 2 ? stats.amount : 0,
                q3Amount: quarter === 3 ? stats.amount : 0,
                q4Amount: quarter === 4 ? stats.amount : 0
              },
              
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log(`  ✓ 创建 [${categoryName}] 成功`);
          console.log(`    - 平均成本: ${avgCost.toFixed(2)}`);
          console.log(`    - 平均毛利率: ${avgGrossMargin.toFixed(2)}%`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`  ❌ 更新 [${categoryName}] 失败:`, error);
      }
    }
    
    console.log(`✅ 产品订单预测更新完成！更新了 ${updatedCount} 个产品类别`);
    
    // 6. 标记商机为"已形成项目"并记录贡献数据
    try {
      const productContributions = Object.entries(categoryStats).map(([categoryName, stats]) => ({
        productCategory: categoryName,
        year,
        quarter,
        quantity: stats.quantity,
        amount: stats.amount,
        totalCost: stats.totalCost
      }));
      
      await db.collection('opportunities')
        .doc(opportunityId)
        .update({
          data: {
            isProjectFormed: true,
            projectFormedAt: new Date(),
            productContributions: productContributions
          }
        });
      
      console.log(`✅ 商机标记为"已形成项目"成功`);
      console.log(`  - 记录了 ${productContributions.length} 个产品类别的贡献`);
    } catch (error) {
      console.error(`⚠️  标记商机失败:`, error);
      // 即使标记失败，仍返回成功（因为产品订单已更新）
    }
    
    return {
      success: true,
      message: `成功更新 ${updatedCount} 个产品类别的订单预测`,
      updated: updatedCount,
      year,
      quarter,
      categories: Object.keys(categoryStats)
    };
    
  } catch (error) {
    console.error('❌ 更新产品订单预测失败:', error);
    return {
      success: false,
      message: error.message,
      error: error.stack
    };
  }
};
