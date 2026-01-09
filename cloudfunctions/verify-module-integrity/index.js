/**
 * 模块数据完整性验证和修复云函数
 * 
 * 功能：
 * 1. 在线验证模块数据完整性
 * 2. 自动修复数据不一致问题
 * 3. 生成详细报告
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-09
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action = 'verify' } = event;
  
  try {
    switch (action) {
      case 'verify':
        return await verifyIntegrity();
      case 'fix':
        return await fixIntegrity();
      case 'report':
        return await generateReport();
      default:
        throw new Error(`未知的操作: ${action}`);
    }
  } catch (error) {
    console.error(`[verify-module-integrity] ${action} 失败:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * 验证数据完整性
 */
async function verifyIntegrity() {
  console.log('[verify-module-integrity] 开始验证...');
  
  // 获取所有模块
  const { data: allModules } = await db.collection('modulesConfig')
    .limit(1000)
    .get();
  
  console.log(`[verify-module-integrity] 总模块数: ${allModules.length}`);
  
  // 检查问题
  const issues = {
    orphanedModules: [],      // 孤立的子模块
    invalidParentId: [],      // 无效的 parentId
    incorrectLevel: [],       // level 不正确
  };
  
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
  
  const totalIssues = issues.orphanedModules.length + 
                     issues.invalidParentId.length + 
                     issues.incorrectLevel.length;
  
  console.log(`[verify-module-integrity] 发现 ${totalIssues} 个问题`);
  
  return {
    success: true,
    totalModules: allModules.length,
    issues,
    totalIssues,
    needFix: totalIssues > 0,
  };
}

/**
 * 修复数据完整性问题
 */
async function fixIntegrity() {
  console.log('[verify-module-integrity] 开始修复...');
  
  // 先验证
  const verifyResult = await verifyIntegrity();
  
  if (!verifyResult.needFix) {
    return {
      success: true,
      message: '无需修复',
      fixedCount: 0,
    };
  }
  
  const { issues } = verifyResult;
  let fixedCount = 0;
  const errors = [];
  
  // 修复孤立的子模块
  for (const item of issues.orphanedModules) {
    try {
      await db.collection('modulesConfig')
        .doc(item._id)
        .update({
          data: {
            parentId: item.inferredParentId,
            level: 2,
            updatedAt: db.serverDate(),
          }
        });
      
      console.log(`[verify-module-integrity] 修复: ${item._id} → parentId = ${item.inferredParentId}`);
      fixedCount++;
    } catch (error) {
      console.error(`[verify-module-integrity] 修复失败: ${item._id}`, error);
      errors.push({
        _id: item._id,
        error: error.message,
      });
    }
  }
  
  // 修复 level 不正确的模块
  for (const item of issues.incorrectLevel) {
    try {
      await db.collection('modulesConfig')
        .doc(item._id)
        .update({
          data: {
            level: item.expectedLevel,
            updatedAt: db.serverDate(),
          }
        });
      
      console.log(`[verify-module-integrity] 修复: ${item._id} → level = ${item.expectedLevel}`);
      fixedCount++;
    } catch (error) {
      console.error(`[verify-module-integrity] 修复失败: ${item._id}`, error);
      errors.push({
        _id: item._id,
        error: error.message,
      });
    }
  }
  
  // 重新验证
  const reVerifyResult = await verifyIntegrity();
  
  console.log(`[verify-module-integrity] 修复完成，共修复 ${fixedCount} 个问题`);
  
  return {
    success: true,
    message: '修复完成',
    fixedCount,
    errors,
    remainingIssues: reVerifyResult.totalIssues,
    verification: reVerifyResult,
  };
}

/**
 * 生成完整性报告
 */
async function generateReport() {
  console.log('[verify-module-integrity] 生成报告...');
  
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
  
  // 树形结构
  const tree = [];
  
  const topLevelModules = allModules
    .filter(m => !m.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  topLevelModules.forEach(parent => {
    const children = allModules
      .filter(m => m.parentId === parent._id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    tree.push({
      ...parent,
      children: children.map(c => ({
        _id: c._id,
        name: c.name,
        order: c.order,
        isEnabled: c.isEnabled,
      })),
    });
  });
  
  // 验证结果
  const verification = await verifyIntegrity();
  
  return {
    success: true,
    stats,
    tree,
    verification,
    timestamp: new Date().toISOString(),
  };
}
