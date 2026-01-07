/**
 * 保障措施删除功能测试脚本
 * 
 * 用途：验证删除函数的有效性
 * 测试策略：但是山东科技 (ID: 22be1a42695b3d410aa997761d41f4a2)
 */

const app = require('@cloudbase/node-sdk');

const tcb = app.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = tcb.database();
const _ = db.command;

// 策略ID
const STRATEGY_ID = '22be1a42695b3d410aa997761d41f4a2';

/**
 * 测试1：查询策略下的所有保障措施
 */
async function test1_listAllMeasures() {
  console.log('\n=== 测试1：查询策略下的所有保障措施 ===');
  
  try {
    const res = await db.collection('safeguardMeasures')
      .where({ strategyId: STRATEGY_ID })
      .get();
    
    console.log(`✅ 共找到 ${res.data.length} 条保障措施：\n`);
    
    res.data.forEach((item, index) => {
      const status = item.isDeleted ? '❌ 已删除' : '✅ 正常';
      console.log(`${index + 1}. [${status}] ${item.content}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   负责人: ${item.owner}`);
      console.log(`   截止日期: ${item.deadline}`);
      console.log(`   isDeleted: ${item.isDeleted}\n`);
    });
    
    return res.data;
  } catch (error) {
    console.error('❌ 查询失败:', error);
    return [];
  }
}

/**
 * 测试2：查询未删除的保障措施
 */
async function test2_listActiveMeasures() {
  console.log('\n=== 测试2：查询未删除的保障措施 ===');
  
  try {
    const res = await db.collection('safeguardMeasures')
      .where({
        strategyId: STRATEGY_ID,
        isDeleted: _.neq(true)
      })
      .get();
    
    console.log(`✅ 共找到 ${res.data.length} 条未删除的保障措施：\n`);
    
    res.data.forEach((item, index) => {
      console.log(`${index + 1}. ${item.content}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   负责人: ${item.owner}\n`);
    });
    
    return res.data;
  } catch (error) {
    console.error('❌ 查询失败:', error);
    return [];
  }
}

/**
 * 测试3：模拟删除一条保障措施
 */
async function test3_deleteMeasure(measureId) {
  console.log(`\n=== 测试3：模拟删除保障措施 (ID: ${measureId}) ===`);
  
  try {
    // 先查询这条记录
    const beforeRes = await db.collection('safeguardMeasures')
      .doc(measureId)
      .get();
    
    if (beforeRes.data.length === 0) {
      console.error('❌ 保障措施不存在');
      return false;
    }
    
    const before = beforeRes.data[0];
    console.log(`删除前状态: isDeleted = ${before.isDeleted}`);
    
    // 执行删除（软删除）
    const deleteRes = await db.collection('safeguardMeasures')
      .doc(measureId)
      .update({
        isDeleted: true,
        updatedAt: new Date()
      });
    
    console.log('删除操作结果:', deleteRes);
    
    if (deleteRes.updated === 1) {
      console.log('✅ 数据库更新成功！');
      
      // 验证删除结果
      const afterRes = await db.collection('safeguardMeasures')
        .doc(measureId)
        .get();
      
      const after = afterRes.data[0];
      console.log(`删除后状态: isDeleted = ${after.isDeleted}`);
      
      if (after.isDeleted === true) {
        console.log('✅ 验证成功：isDeleted 已设置为 true');
        return true;
      } else {
        console.error('❌ 验证失败：isDeleted 仍然是', after.isDeleted);
        return false;
      }
    } else {
      console.error('❌ 数据库更新失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 删除失败:', error);
    return false;
  }
}

/**
 * 测试4：验证查询过滤是否生效
 */
async function test4_verifyFiltering() {
  console.log('\n=== 测试4：验证查询过滤是否生效 ===');
  
  try {
    // 查询所有记录
    const allRes = await db.collection('safeguardMeasures')
      .where({ strategyId: STRATEGY_ID })
      .get();
    
    // 查询未删除的记录
    const activeRes = await db.collection('safeguardMeasures')
      .where({
        strategyId: STRATEGY_ID,
        isDeleted: _.neq(true)
      })
      .get();
    
    // 统计删除的记录数
    const deletedCount = allRes.data.filter(item => item.isDeleted === true).length;
    
    console.log(`总记录数: ${allRes.data.length}`);
    console.log(`未删除: ${activeRes.data.length}`);
    console.log(`已删除: ${deletedCount}`);
    
    if (allRes.data.length === activeRes.data.length + deletedCount) {
      console.log('✅ 数据一致性验证通过！');
      return true;
    } else {
      console.error('❌ 数据不一致！');
      return false;
    }
  } catch (error) {
    console.error('❌ 验证失败:', error);
    return false;
  }
}

/**
 * 测试5：恢复被删除的保障措施（可选）
 */
async function test5_restoreMeasure(measureId) {
  console.log(`\n=== 测试5：恢复保障措施 (ID: ${measureId}) ===`);
  
  try {
    const restoreRes = await db.collection('safeguardMeasures')
      .doc(measureId)
      .update({
        isDeleted: false,
        updatedAt: new Date()
      });
    
    if (restoreRes.updated === 1) {
      console.log('✅ 恢复成功！');
      return true;
    } else {
      console.error('❌ 恢复失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 恢复失败:', error);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('========================================');
  console.log('保障措施删除功能测试');
  console.log('策略: 但是山东科技');
  console.log('策略ID:', STRATEGY_ID);
  console.log('========================================');
  
  try {
    // 测试1：查询所有保障措施
    const allMeasures = await test1_listAllMeasures();
    
    if (allMeasures.length === 0) {
      console.log('⚠️ 该策略下没有保障措施，无法测试删除功能');
      return;
    }
    
    // 测试2：查询未删除的保障措施
    const activeMeasures = await test2_listActiveMeasures();
    
    if (activeMeasures.length === 0) {
      console.log('⚠️ 该策略下没有未删除的保障措施');
      return;
    }
    
    // 询问是否执行删除测试
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\n是否要测试删除第一条保障措施？(y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        const testMeasureId = activeMeasures[0]._id;
        
        // 测试3：删除一条保障措施
        const deleteSuccess = await test3_deleteMeasure(testMeasureId);
        
        if (deleteSuccess) {
          // 测试4：验证查询过滤
          await test4_verifyFiltering();
          
          // 询问是否恢复
          rl.question('\n是否要恢复刚才删除的保障措施？(y/n): ', async (restore) => {
            if (restore.toLowerCase() === 'y') {
              await test5_restoreMeasure(testMeasureId);
              
              // 再次验证
              await test4_verifyFiltering();
            }
            
            console.log('\n✅ 测试完成！');
            rl.close();
            process.exit(0);
          });
        } else {
          console.log('\n❌ 删除测试失败！');
          rl.close();
          process.exit(1);
        }
      } else {
        console.log('\n已取消删除测试');
        
        // 仍然执行验证测试
        await test4_verifyFiltering();
        
        console.log('\n✅ 测试完成！');
        rl.close();
        process.exit(0);
      }
    });
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行测试
runTests();
