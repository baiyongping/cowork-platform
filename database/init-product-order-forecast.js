/**
 * 数据库初始化脚本: 创建产品订单预测表
 * 
 * 功能:
 * 1. 创建 product_order_forecast 集合
 * 2. 为当前年份初始化产品订单预测记录
 * 3. 从 type_settings 中读取产品类别列表
 * 
 * 执行方式:
 * node database/init-product-order-forecast.js
 */

import cloudbase from '@cloudbase/node-sdk';

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.VITE_TCB_ENV_ID || 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

async function initProductOrderForecast() {
  console.log('开始初始化产品订单预测表...\n');
  
  try {
    // 1. 从 type_settings 中读取产品类别列表
    console.log('步骤1: 读取产品类别列表...');
    const productTypesResult = await db.collection('type_settings')
      .where({ type: 'productType' })
      .get();
    
    if (!productTypesResult.data || productTypesResult.data.length === 0) {
      console.error('错误: 未找到产品类别设置！');
      console.error('请先在"系统设置 → 类型设置 → 产品类别"中添加产品类别。');
      return;
    }
    
    const productTypes = productTypesResult.data[0].values || [];
    console.log(`✓ 找到 ${productTypes.length} 个产品类别: ${productTypes.join(', ')}\n`);
    
    // 2. 获取当前年份
    const currentYear = new Date().getFullYear();
    console.log(`步骤2: 准备初始化 ${currentYear} 年的数据...\n`);
    
    // 3. 检查是否已存在该年份的数据
    console.log('步骤3: 检查是否已存在数据...');
    const existingResult = await db.collection('product_order_forecast')
      .where({ year: currentYear })
      .get();
    
    if (existingResult.data && existingResult.data.length > 0) {
      console.log(`⚠️  ${currentYear} 年的数据已存在（${existingResult.data.length} 条记录）`);
      console.log('如需重新初始化，请先手动删除旧数据。\n');
      return;
    }
    
    console.log('✓ 未发现已存在数据，开始创建...\n');
    
    // 4. 为每个产品类别创建空白记录
    console.log('步骤4: 创建产品订单预测记录...');
    let createdCount = 0;
    
    for (const category of productTypes) {
      const record = {
        year: currentYear,
        categoryName: category,
        
        // 预测部分（可编辑）
        forecast: {
          quantity: 0,        // 预测数量
          unitPrice: 0,       // 预测单价
          totalAmount: 0      // 预计订单额（自动计算）
        },
        
        // 实际订单部分（只读，从商机"形成项目"时统计）
        actual: {
          completedAmount: 0,    // 实际完成订单额
          completionRate: 0,     // 实际完成率（%）
          totalQuantity: 0,      // 累计订单数量
          avgUnitPrice: 0,       // 平均单价
          q1Amount: 0,           // Q1订单额（1-3月）
          q2Amount: 0,           // Q2订单额（4-6月）
          q3Amount: 0,           // Q3订单额（7-9月）
          q4Amount: 0            // Q4订单额（10-12月）
        },
        
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('product_order_forecast').add(record);
      createdCount++;
      console.log(`  ✓ 创建 [${category}] 的订单预测记录`);
    }
    
    console.log(`\n✅ 初始化完成！`);
    console.log(`- 年份: ${currentYear}`);
    console.log(`- 创建记录数: ${createdCount}`);
    console.log(`- 产品类别: ${productTypes.join(', ')}\n`);
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initProductOrderForecast()
  .then(() => {
    console.log('✓ 初始化脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ 初始化脚本执行失败:', error);
    process.exit(1);
  });
