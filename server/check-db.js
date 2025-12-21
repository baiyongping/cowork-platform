/**
 * 检查数据库状态
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkDatabase() {
  try {
    console.log('📡 连接到数据库...');
    await mongoose.connect('mongodb://localhost:27017/jihua_oa_platform');
    console.log('✅ 数据库连接成功');
    
    // 检查用户
    const users = await User.find({});
    console.log(`\n👥 用户总数: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n用户列表:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.realName} (@${user.username}) - ${user.role}`);
      });
    } else {
      console.log('⚠️  数据库中没有用户，需要初始化数据');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ 检查完成');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkDatabase();
