// 验证问题类型配置脚本
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = app.database();

async function verifyIssueTypes() {
  try {
    console.log('📋 查询问题类型配置...');
    
    const result = await db.collection('type_settings')
      .where({ type: 'issueType' })
      .get();
    
    if (result.data && result.data.length > 0) {
      console.log('✅ 找到问题类型配置:');
      console.log(JSON.stringify(result.data[0], null, 2));
      
      const config = result.data[0];
      const enabledTypes = config.values
        .filter(item => item.enabled !== false)
        .map(item => item.value);
      
      console.log('\n✅ 启用的问题类型:');
      enabledTypes.forEach((type, index) => {
        console.log(`  ${index + 1}. ${type}`);
      });
    } else {
      console.log('❌ 未找到问题类型配置');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

verifyIssueTypes();
