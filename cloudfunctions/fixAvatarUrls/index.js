const cloudbase = require('@cloudbase/node-sdk');

/**
 * 修复用户头像URL - 将错误的云存储域名替换为正确的域名
 * 
 * 错误域名: 636f-cowork-9gg9oocb516be5fb-1301818329
 * 正确域名: 6a69-jihua-oa-dev-3goht9irae4d949f-1301818329
 */
exports.main = async (event, context) => {
  try {
    // 初始化CloudBase
    const app = cloudbase.init({
      env: cloudbase.parseContext(context).TCB_ENV
    });
    
    const db = app.database();
    const _ = db.command;
    
    console.log('🔧 开始修复用户头像URL...');
    
    // 查询所有包含错误域名的用户
    const wrongDomain = '636f-cowork-9gg9oocb516be5fb-1301818329';
    const correctDomain = '6a69-jihua-oa-dev-3goht9irae4d949f-1301818329';
    
    const { data: usersWithWrongAvatar } = await db.collection('users')
      .where({
        avatar: db.RegExp({
          regexp: wrongDomain,
          options: 'i'
        })
      })
      .get();
    
    console.log(`📊 找到 ${usersWithWrongAvatar.length} 个用户需要修复头像URL`);
    
    if (usersWithWrongAvatar.length === 0) {
      return {
        success: true,
        message: '没有需要修复的头像',
        fixed: 0
      };
    }
    
    // 批量更新
    let fixed = 0;
    let failed = 0;
    const errors = [];
    
    for (const user of usersWithWrongAvatar) {
      try {
        const oldAvatar = user.avatar;
        const newAvatar = oldAvatar.replace(wrongDomain, correctDomain);
        
        console.log(`🔄 修复用户 ${user.name || user.username} (${user._id})`);
        console.log(`   旧URL: ${oldAvatar}`);
        console.log(`   新URL: ${newAvatar}`);
        
        await db.collection('users').doc(user._id).update({
          avatar: newAvatar,
          avatarFixedAt: new Date()
        });
        
        fixed++;
        console.log(`✅ 用户 ${user.name || user.username} 头像URL修复成功`);
      } catch (error) {
        failed++;
        const errorMsg = `修复用户 ${user.name || user.username} 失败: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`\n📈 修复完成统计:`);
    console.log(`   ✅ 成功: ${fixed}`);
    console.log(`   ❌ 失败: ${failed}`);
    
    return {
      success: true,
      message: `头像URL修复完成`,
      total: usersWithWrongAvatar.length,
      fixed: fixed,
      failed: failed,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    console.error('❌ 修复头像URL失败:', error);
    return {
      success: false,
      message: error.message || '修复失败',
      error: error.toString()
    };
  }
};
