/**
 * 客户情报系统 - 数据库初始化脚本
 * 创建所需的数据库集合和索引
 */

const cloud = require('@cloudbase/node-sdk');

// 初始化CloudBase
const app = cloud.init({
  env: process.env.TCB_ENV_ID || 'your-env-id'
});

const db = app.database();

async function initIntelligenceCollections() {
  console.log('开始初始化客户情报系统数据库集合...\n');

  try {
    // 1. 创建客户情报集合 (customer_intelligence)
    console.log('1. 创建 customer_intelligence 集合...');
    try {
      await db.createCollection('customer_intelligence');
      console.log('✅ customer_intelligence 集合创建成功');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  customer_intelligence 集合已存在');
      } else {
        throw error;
      }
    }

    // 2. 创建情报报告集合 (intelligence_reports)
    console.log('\n2. 创建 intelligence_reports 集合...');
    try {
      await db.createCollection('intelligence_reports');
      console.log('✅ intelligence_reports 集合创建成功');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  intelligence_reports 集合已存在');
      } else {
        throw error;
      }
    }

    // 3. 插入示例数据
    console.log('\n3. 插入示例数据...');
    const sampleIntelligence = {
      customerId: 'sample-customer-001',
      customerName: '示例客户公司',
      type: 'company_background',
      source: 'web_search',
      title: '示例客户公司背景信息',
      content: '这是一个示例情报数据，用于展示客户情报系统的功能。',
      summary: '示例客户公司成立于2020年，主营业务为企业服务。',
      keywords: ['企业服务', '示例公司', '背景信息'],
      reliability: 85,
      status: 'collected',
      collectedBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    try {
      await db.collection('customer_intelligence').add(sampleIntelligence);
      console.log('✅ 示例情报数据插入成功');
    } catch (error) {
      console.log('⚠️  示例数据已存在或插入失败');
    }

    console.log('\n✅ 客户情报系统数据库初始化完成！');
    console.log('\n📋 集合说明：');
    console.log('  - customer_intelligence: 存储客户情报数据');
    console.log('  - intelligence_reports: 存储生成的情报报告');
    console.log('\n🎯 下一步：');
    console.log('  1. 部署云函数 intelligence-collector');
    console.log('  2. 在商机详情中使用"客户情报"功能');
    console.log('  3. 采集客户信息并生成报告');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initIntelligenceCollections()
  .then(() => {
    console.log('\n初始化脚本执行完毕');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n初始化脚本执行失败:', error);
    process.exit(1);
  });
