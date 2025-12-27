/**
 * 财务参数表数据迁移脚本 v1.0 -> v2.0
 * 
 * 迁移内容:
 * 1. 一级科目:
 *    - type ('income'|'cost'|'summary') -> isSystemParam (boolean) + totalUnit (string)
 *    - 删除 summarySourceIds 字段
 * 2. 二级科目:
 *    - amount (number) -> amount (number) + amountUnit (string)
 *    - 新增 isSystemParam (boolean)
 * 
 * 使用方法:
 * 1. 在 CloudBase 控制台运行此脚本
 * 2. 或在云函数中调用此脚本
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: process.env.TCB_ENV_ID || 'cowork-9gg9oocb516be5fb'
});

const db = app.database();

/**
 * 迁移一级科目
 */
async function migratePrimaryAccounts() {
  console.log('========== 开始迁移一级科目 ==========');
  
  try {
    // 查询所有一级科目
    const { data: accounts } = await db.collection('budget_accounts')
      .get();
    
    console.log(`找到 ${accounts.length} 个科目`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const account of accounts) {
      // 检查是否已迁移
      if (account.totalUnit !== undefined && account.isSystemParam !== undefined) {
        console.log(`跳过已迁移的科目: ${account.name} (ID: ${account.id})`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n迁移科目: ${account.name} (ID: ${account.id})`);
      console.log(`原类型: ${account.type}`);
      
      // 构建更新数据
      const updateData = {};
      
      // 1. 处理 type -> isSystemParam
      // 规则: 'income' 和 'cost' 类型的科目设为非系统参数, 'summary' 需人工判断
      if (account.type === 'income' || account.type === 'cost') {
        updateData.isSystemParam = false; // 默认为非系统参数
        console.log(`设置 isSystemParam = false (普通增项/减项)`);
      } else if (account.type === 'summary') {
        // 计算项科目默认设为系统参数
        updateData.isSystemParam = true;
        console.log(`设置 isSystemParam = true (计算项科目)`);
      } else {
        updateData.isSystemParam = false;
        console.log(`设置 isSystemParam = false (未知类型: ${account.type})`);
      }
      
      // 2. 设置 totalUnit
      updateData.totalUnit = '万元'; // 默认单位
      console.log(`设置 totalUnit = '万元'`);
      
      // 3. 删除 summarySourceIds (通过 remove 方式)
      if (account.summarySourceIds) {
        updateData.summarySourceIds = db.command.remove();
        console.log(`删除 summarySourceIds 字段`);
      }
      
      // 4. 迁移子科目
      if (account.children && account.children.length > 0) {
        const migratedChildren = account.children.map(child => {
          const newChild = {
            ...child,
            isSystemParam: false, // 默认为非系统参数
            amountUnit: '元' // 默认单位为元
          };
          
          console.log(`  迁移子科目: ${child.name} -> isSystemParam=false, amountUnit='元'`);
          return newChild;
        });
        
        updateData.children = migratedChildren;
      }
      
      // 5. 删除 type 字段 (不需要,保留用于兼容)
      // updateData.type = db.command.remove();
      
      // 执行更新
      await db.collection('budget_accounts')
        .doc(account._id)
        .update(updateData);
      
      console.log(`✅ 科目迁移成功: ${account.name}`);
      migratedCount++;
    }
    
    console.log('\n========== 一级科目迁移完成 ==========');
    console.log(`总科目数: ${accounts.length}`);
    console.log(`迁移成功: ${migratedCount}`);
    console.log(`跳过(已迁移): ${skippedCount}`);
    
    return {
      success: true,
      total: accounts.length,
      migrated: migratedCount,
      skipped: skippedCount
    };
    
  } catch (error) {
    console.error('========================================');
    console.error('❌ 迁移失败!');
    console.error('错误类型:', error?.constructor?.name);
    console.error('错误消息:', error?.message);
    console.error('错误代码:', error?.code);
    console.error('完整错误对象:', error);
    console.error('========================================');
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 回滚迁移(可选)
 */
async function rollbackMigration() {
  console.log('========== 开始回滚迁移 ==========');
  
  try {
    const { data: accounts } = await db.collection('budget_accounts')
      .get();
    
    console.log(`找到 ${accounts.length} 个科目`);
    
    for (const account of accounts) {
      const updateData = {};
      
      // 删除新字段
      if (account.isSystemParam !== undefined) {
        updateData.isSystemParam = db.command.remove();
      }
      
      if (account.totalUnit !== undefined) {
        updateData.totalUnit = db.command.remove();
      }
      
      // 恢复 type 字段
      if (account.formula && account.formula.length > 0) {
        updateData.type = 'summary';
      } else {
        updateData.type = 'income'; // 默认恢复为增项
      }
      
      // 回滚子科目
      if (account.children && account.children.length > 0) {
        const rolledBackChildren = account.children.map(child => {
          const { isSystemParam, amountUnit, ...restChild } = child;
          return restChild;
        });
        
        updateData.children = rolledBackChildren;
      }
      
      await db.collection('budget_accounts')
        .doc(account._id)
        .update(updateData);
      
      console.log(`✅ 科目回滚成功: ${account.name}`);
    }
    
    console.log('========== 回滚完成 ==========');
    return { success: true };
    
  } catch (error) {
    console.error('❌ 回滚失败!', error);
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('======================================');
  console.log('财务参数表数据迁移脚本 v1.0 -> v2.0');
  console.log('======================================\n');
  
  // 执行迁移
  const result = await migratePrimaryAccounts();
  
  if (result.success) {
    console.log('\n✅ 迁移成功!');
    console.log('请在 CloudBase 控制台验证数据是否正确。');
    console.log('如需回滚,请调用 rollbackMigration() 函数。');
  } else {
    console.log('\n❌ 迁移失败!');
    console.log('请检查错误信息并修复后重试。');
  }
  
  return result;
}

// 导出函数供云函数调用
module.exports = {
  main,
  migratePrimaryAccounts,
  rollbackMigration
};

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n脚本执行完成:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n脚本执行异常:', error);
      process.exit(1);
    });
}
