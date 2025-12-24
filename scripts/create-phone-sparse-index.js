/**
 * 创建 phoneNumber 稀疏唯一索引
 * 用途：允许多个用户的 phoneNumber 为 null，但已绑定的手机号必须唯一
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = cloud.database();
const _ = db.command;

async function createPhoneSparseIndex() {
  try {
    console.log('🔧 开始创建 phoneNumber 稀疏唯一索引...');

    // 由于 CloudBase NoSQL 数据库基于 MongoDB，我们需要通过管理API创建稀疏索引
    // 注意：CloudBase Web 控制台支持手动创建稀疏索引
    
    console.log('\n⚠️ 重要提示：');
    console.log('CloudBase NoSQL 数据库需要通过控制台手动创建稀疏索引');
    console.log('\n请按照以下步骤操作：');
    console.log('1. 访问：https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/db/doc/collection/users');
    console.log('2. 点击"索引"选项卡');
    console.log('3. 点击"创建索引"按钮');
    console.log('4. 配置如下：');
    console.log('   - 索引名称：phone_unique');
    console.log('   - 索引字段：phoneNumber (升序)');
    console.log('   - ✅ 勾选"唯一索引"');
    console.log('   - ✅ 勾选"稀疏索引" (重要！)');
    console.log('5. 点击"确定"完成创建');
    
    console.log('\n✅ 创建完成后，具有以下特性：');
    console.log('   - 允许多个用户 phoneNumber 为 null');
    console.log('   - 已绑定的手机号必须唯一');
    console.log('   - 防止手机号重复绑定');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  }
}

createPhoneSparseIndex();
