const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});
const db = app.database();

exports.main = async (event, context) => {
  try {
    console.log('开始清理错误的avatarUrl字段...');
    
    // 查找包含 wxfile:// 的用户
    const wrongUsers = await db.collection('users')
      .where({
        avatarUrl: db.RegExp({
          regexp: '^wxfile://'
        })
      })
      .get();
    
    console.log('找到错误头像的用户数量:', wrongUsers.data.length);
    
    if (wrongUsers.data.length === 0) {
      return {
        success: true,
        message: '没有需要清理的数据'
      };
    }
    
    // 批量删除 avatarUrl 字段
    const batch = [];
    for (const user of wrongUsers.data) {
      batch.push(
        db.collection('users').doc(user._id).update({
          avatarUrl: db.command.remove()
        })
      );
    }
    
    const results = await Promise.all(batch);
    
    console.log('清理完成:', results);
    
    return {
      success: true,
      message: `成功清理 ${wrongUsers.data.length} 个用户的错误头像`,
      cleaned: wrongUsers.data.map(u => ({ id: u._id, name: u.name }))
    };
  } catch (error) {
    console.error('清理失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
