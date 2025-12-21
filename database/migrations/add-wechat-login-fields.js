/**
 * 数据库迁移: 添加微信登录相关字段
 * 
 * 执行方式:
 * 1. 在CloudBase控制台 → 数据库 → 高级操作 → 执行脚本
 * 2. 或使用CloudBase CLI: tcb database migrate
 */

// 迁移脚本
const db = tcb.database();
const _ = db.command;

// 为users集合添加微信登录字段
async function migrateUsers() {
  console.log('开始迁移users集合...');
  
  try {
    // 为所有现有用户添加微信字段(默认值为null)
    const result = await db.collection('users').where({
      wechatOpenId: _.exists(false) // 只更新没有wechatOpenId字段的记录
    }).update({
      wechatOpenId: null,
      loginType: 'password', // 现有用户默认为密码登录
      updatedAt: new Date()
    });
    
    console.log(`✅ 成功更新 ${result.updated} 条用户记录`);
    
    return { success: true, updated: result.updated };
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return { success: false, error: error.message };
  }
}

// 创建索引
async function createIndexes() {
  console.log('开始创建索引...');
  
  try {
    // 为wechatOpenId字段创建唯一索引
    // 注意: CloudBase控制台需要手动创建索引
    console.log('⚠️ 请在CloudBase控制台手动创建以下索引:');
    console.log('集合: users');
    console.log('字段: wechatOpenId');
    console.log('类型: 唯一索引(unique)');
    console.log('稀疏索引: 是(sparse: true)'); // 允许null值
    
    return { success: true, message: '请手动创建索引' };
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    return { success: false, error: error.message };
  }
}

// 执行迁移
async function migrate() {
  console.log('========================================');
  console.log('开始执行数据库迁移: 添加微信登录字段');
  console.log('========================================');
  
  // 1. 迁移用户数据
  const userResult = await migrateUsers();
  if (!userResult.success) {
    console.error('用户数据迁移失败,终止迁移');
    return;
  }
  
  // 2. 创建索引
  const indexResult = await createIndexes();
  
  console.log('========================================');
  console.log('迁移完成!');
  console.log('========================================');
  console.log('迁移结果:');
  console.log('- 用户记录更新:', userResult.updated || 0);
  console.log('- 索引创建:', indexResult.message || '失败');
  console.log('========================================');
}

// 导出迁移函数
export { migrate, migrateUsers, createIndexes };
