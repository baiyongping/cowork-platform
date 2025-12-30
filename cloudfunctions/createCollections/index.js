const tcb = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  const app = tcb.init({
    env: 'cowork-9gg9oocb516be5fb' // 生产环境
  });
  
  const db = app.database();
  
  // 所有需要创建的集合
  const collections = [
    'users',
    'departments',
    'tasks',
    'opportunities',
    'projects',
    'goals',
    'quarterly_measures',
    'issues',
    'issue_replies',
    'messages',
    'task_comments',
    'type_settings',
    'role_permissions',
    'operation_logs',
    'annual_budgets',
    'budget_accounts',
    'budget_execution',
    'product_order_forecast',
    'purchaseBatches',
    'sales_goals',
    'login_codes',
    'sms_codes'
  ];
  
  const results = [];
  
  for (const collectionName of collections) {
    try {
      await db.createCollection(collectionName);
      results.push({ 
        collection: collectionName, 
        status: 'success' 
      });
      console.log(`✅ 集合创建成功: ${collectionName}`);
    } catch (error) {
      results.push({ 
        collection: collectionName, 
        status: 'error',
        message: error.message 
      });
      console.error(`❌ 集合创建失败: ${collectionName}`, error.message);
    }
  }
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalCollections: collections.length,
    results: results
  };
};
