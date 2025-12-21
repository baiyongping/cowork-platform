/**
 * 数据库迁移脚本: 为商机需求添加成本和毛利润字段
 * 
 * 修改内容:
 * 1. 为 OpportunityRequirement 添加 estimatedCost (预估成本)
 * 2. 为 OpportunityRequirement 添加 grossProfit (预估毛利润)
 * 
 * 执行方式:
 * node database/migrations/add-opportunity-cost-profit-fields.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.VITE_TCB_ENV_ID || 'jihua-oa-6g2e5zqm86da18e6'
});

const db = app.database();

async function migrateOpportunityRequirements() {
  console.log('开始迁移商机需求数据...');
  
  try {
    // 1. 获取所有商机
    const opportunitiesResult = await db.collection('opportunities')
      .where({
        isDeleted: db.command.neq(true)
      })
      .get();
    
    const opportunities = opportunitiesResult.data;
    console.log(`找到 ${opportunities.length} 个商机需要处理`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 2. 遍历每个商机，更新其需求列表
    for (const opp of opportunities) {
      if (!opp.requirements || opp.requirements.length === 0) {
        skippedCount++;
        continue;
      }
      
      let needsUpdate = false;
      const updatedRequirements = opp.requirements.map(req => {
        // 检查是否已有新字段
        if (req.estimatedCost === undefined || req.grossProfit === undefined) {
          needsUpdate = true;
          return {
            ...req,
            estimatedCost: 0, // 默认成本为0
            grossProfit: req.totalPrice || 0 // 默认毛利润等于总价
          };
        }
        return req;
      });
      
      // 如果需要更新
      if (needsUpdate) {
        await db.collection('opportunities').doc(opp._id).update({
          requirements: updatedRequirements,
          updatedAt: new Date()
        });
        
        updatedCount++;
        console.log(`✓ 更新商机: ${opp.name} (${opp._id})`);
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n迁移完成!');
    console.log(`- 已更新: ${updatedCount} 个商机`);
    console.log(`- 已跳过: ${skippedCount} 个商机`);
    
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  }
}

// 执行迁移
migrateOpportunityRequirements()
  .then(() => {
    console.log('\n✓ 迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 迁移脚本执行失败:', error);
    process.exit(1);
  });
