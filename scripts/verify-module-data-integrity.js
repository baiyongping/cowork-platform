/**
 * 模块数据完整性验证和修复脚本
 * 
 * 功能：
 * 1. 检查所有子模块是否有正确的 parentId
 * 2. 检查模块层级关系是否正确
 * 3. 检查是否有孤立的子模块
 * 4. 自动修复数据不一致问题
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-09
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb',
  secretId: process.env.CLOUDBASE_SECRET_ID || 'your-secret-id',
  secretKey: process.env.CLOUDBASE_SECRET_KEY || 'your-secret-key',
});

const db = app.database();

/**
 * 验证和修复模块数据完整性
 */
async function verifyAndFixModuleIntegrity() {
  console.log('🔍 开始验证模块数据完整性...\n');
  
  try {
    // 1. 获取所有模块数据
    const { data: allModules } = await db.collection('modulesConfig')
      .limit(1000)
      .get();
    
    console.log(`📊 总模块数: ${allModules.length}`);
    
    // 2. 分类模块
    const topLevelModules = allModules.filter(m => !m.parentId);
    const childModules = allModules.filter(m => m.parentId);
    
    console.log(`   - 一级模块: ${topLevelModules.length} 个`);
    console.log(`   - 子模块: ${childModules.length} 个\n`);
    
    // 3. 检查问题
    const issues = {
      missingParentId: [],      // 缺少 parentId 的子模块
      invalidParentId: [],       // parentId 指向不存在的父模块
      orphanedModules: [],       // 孤立的模块（_id 包含 . 但没有 parentId）
      incorrectLevel: [],        // level 字段不正确
    };
    
    console.log('🔍 检查数据问题...\n');
    
    // 检查每个模块
    for (const module of allModules) {
      // 检查：_id 包含 . 但没有 parentId
      if (module._id.includes('.') && !module.parentId) {
        const inferredParentId = module._id.split('.')[0];
        issues.orphanedModules.push({
          _id: module._id,
          name: module.name,
          inferredParentId,
        });
      }
      
      // 检查：有 parentId 但找不到父模块
      if (module.parentId) {
        const parentExists = allModules.some(m => m._id === module.parentId);
        if (!parentExists) {
          issues.invalidParentId.push({
            _id: module._id,
            name: module.name,
            parentId: module.parentId,
          });
        }
      }
      
      // 检查：level 字段不正确
      const expectedLevel = module.parentId ? 2 : 1;
      if (module.level && module.level !== expectedLevel) {
        issues.incorrectLevel.push({
          _id: module._id,
          name: module.name,
          currentLevel: module.level,
          expectedLevel,
        });
      }
    }
    
    // 4. 报告问题
    console.log('📋 问题汇总:\n');
    
    if (issues.orphanedModules.length > 0) {
      console.log(`❌ 发现 ${issues.orphanedModules.length} 个孤立的子模块（缺少 parentId）:`);
      issues.orphanedModules.forEach(item => {
        console.log(`   - ${item._id} (${item.name}) → 应设置 parentId = ${item.inferredParentId}`);
      });
      console.log('');
    }
    
    if (issues.invalidParentId.length > 0) {
      console.log(`❌ 发现 ${issues.invalidParentId.length} 个 parentId 无效的模块:`);
      issues.invalidParentId.forEach(item => {
        console.log(`   - ${item._id} (${item.name}) → parentId = ${item.parentId} (不存在)`);
      });
      console.log('');
    }
    
    if (issues.incorrectLevel.length > 0) {
      console.log(`⚠️ 发现 ${issues.incorrectLevel.length} 个 level 不正确的模块:`);
      issues.incorrectLevel.forEach(item => {
        console.log(`   - ${item._id} (${item.name}) → 当前 level=${item.currentLevel}, 应为 ${item.expectedLevel}`);
      });
      console.log('');
    }
    
    const totalIssues = issues.orphanedModules.length + issues.invalidParentId.length + issues.incorrectLevel.length;
    
    if (totalIssues === 0) {
      console.log('✅ 未发现数据完整性问题！\n');
      return { success: true, issues: 0 };
    }
    
    // 5. 询问是否修复
    console.log(`\n⚠️ 共发现 ${totalIssues} 个问题，需要修复\n`);
    console.log('🔧 准备自动修复...\n');
    
    // 6. 修复问题
    let fixedCount = 0;
    
    // 修复孤立的子模块（添加 parentId）
    for (const item of issues.orphanedModules) {
      try {
        await db.collection('modulesConfig')
          .doc(item._id)
          .update({
            parentId: item.inferredParentId,
            level: 2,
            updatedAt: db.serverDate(),
          });
        
        console.log(`✅ 修复: ${item._id} → parentId = ${item.inferredParentId}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复失败: ${item._id}`, error.message);
      }
    }
    
    // 修复 level 不正确的模块
    for (const item of issues.incorrectLevel) {
      try {
        await db.collection('modulesConfig')
          .doc(item._id)
          .update({
            level: item.expectedLevel,
            updatedAt: db.serverDate(),
          });
        
        console.log(`✅ 修复: ${item._id} → level = ${item.expectedLevel}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ 修复失败: ${item._id}`, error.message);
      }
    }
    
    // 处理 parentId 无效的模块（需要手动处理）
    if (issues.invalidParentId.length > 0) {
      console.log('\n⚠️ 以下模块的 parentId 无效，需要手动处理:');
      issues.invalidParentId.forEach(item => {
        console.log(`   - ${item._id} (${item.name}) → parentId = ${item.parentId}`);
      });
    }
    
    console.log(`\n✅ 修复完成！共修复 ${fixedCount} 个问题\n`);
    
    // 7. 重新验证
    console.log('🔄 重新验证数据完整性...\n');
    
    const { data: verifiedModules } = await db.collection('modulesConfig')
      .limit(1000)
      .get();
    
    const remainingIssues = verifiedModules.filter(m => {
      if (m._id.includes('.') && !m.parentId) return true;
      if (m.parentId) {
        const parentExists = verifiedModules.some(p => p._id === m.parentId);
        if (!parentExists) return true;
      }
      return false;
    });
    
    if (remainingIssues.length === 0) {
      console.log('✅ 验证通过！所有数据完整性问题已解决\n');
    } else {
      console.log(`⚠️ 仍有 ${remainingIssues.length} 个问题需要手动处理\n`);
    }
    
    return {
      success: true,
      totalIssues,
      fixedCount,
      remainingIssues: remainingIssues.length,
    };
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  }
}

/**
 * 生成数据完整性报告
 */
async function generateIntegrityReport() {
  console.log('\n📊 生成数据完整性报告...\n');
  
  try {
    const { data: allModules } = await db.collection('modulesConfig')
      .limit(1000)
      .get();
    
    // 统计信息
    const stats = {
      total: allModules.length,
      topLevel: allModules.filter(m => !m.parentId).length,
      children: allModules.filter(m => m.parentId).length,
      enabled: allModules.filter(m => m.isEnabled).length,
      disabled: allModules.filter(m => !m.isEnabled).length,
      custom: allModules.filter(m => m.isCustom).length,
    };
    
    console.log('📈 模块统计:');
    console.log(`   总数: ${stats.total}`);
    console.log(`   一级模块: ${stats.topLevel}`);
    console.log(`   子模块: ${stats.children}`);
    console.log(`   已启用: ${stats.enabled}`);
    console.log(`   已禁用: ${stats.disabled}`);
    console.log(`   自定义: ${stats.custom}\n`);
    
    // 树形结构
    console.log('🌳 模块树形结构:\n');
    
    const topLevelModules = allModules
      .filter(m => !m.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    topLevelModules.forEach(parent => {
      const status = parent.isEnabled ? '✅' : '❌';
      console.log(`${status} ${parent._id} - ${parent.name} (order: ${parent.order || 0})`);
      
      const children = allModules
        .filter(m => m.parentId === parent._id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      children.forEach(child => {
        const childStatus = child.isEnabled ? '✅' : '❌';
        console.log(`   ${childStatus} ${child._id} - ${child.name} (order: ${child.order || 0})`);
      });
    });
    
    console.log('\n✅ 报告生成完成\n');
    
  } catch (error) {
    console.error('❌ 报告生成失败:', error);
    throw error;
  }
}

// 执行脚本
async function main() {
  console.log('='.repeat(60));
  console.log('   模块数据完整性验证和修复工具');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // 1. 验证和修复
    const result = await verifyAndFixModuleIntegrity();
    
    // 2. 生成报告
    await generateIntegrityReport();
    
    console.log('='.repeat(60));
    console.log('✅ 所有操作完成！');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  verifyAndFixModuleIntegrity,
  generateIntegrityReport,
};
