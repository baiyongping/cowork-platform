/**
 * 数据库集合权限配置脚本
 * 用途: 批量配置CloudBase NoSQL数据库集合的权限规则
 * 使用方法: node scripts/configure-collection-permissions.js
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 集合权限配置映射
 * 基于 constants/modules.ts 的定义
 */
const COLLECTION_PERMISSIONS = {
  // ============ 核心业务模块 ============
  
  // 商机管理 (仅创建人或管理员可访问)
  opportunities: {
    read: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')",
    write: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // 任务管理 (仅负责人、协同人或管理员可访问)
  tasks: {
    read: "auth.uid != null && (doc.owner == auth.uid || doc.collaborators.includes(auth.uid) || get('database.users.$(auth.uid)').role == 'admin')",
    write: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // 项目管理 (仅负责人或管理员可访问)
  projects: {
    read: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')",
    write: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // 问题管理 (所有认证用户可创建和查看自己的问题)
  issues: {
    read: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')",
    write: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // ============ 目标管理模块 ============
  
  // 销售目标 (部门负责人和管理员可访问)
  sales_goals: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 产品订单预测 (部门负责人和管理员可访问)
  product_order_forecast: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 年度策略 (仅管理员可访问)
  annual_strategies: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 成果目标 (所有认证用户可查看,仅管理员可编辑)
  outcome_goals: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 目标分解表 (所有认证用户可查看,仅管理员可编辑)
  goal_decompositions: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // ============ 预算管理模块 ============
  
  // 预算科目 (所有认证用户只读)
  budgetSubjects: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 年度预算 (所有认证用户只读)
  annual_budgets: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 预算执行 (所有认证用户只读)
  budget_execution: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 资产预算 (部门负责人和管理员可访问)
  asset_budgets: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']"
  },

  // 薪酬预算 (仅管理员可访问)
  hrExpenses: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // ============ 会议管理模块 ============
  
  // 例会 (所有认证用户可查看,仅创建人和管理员可编辑)
  meetings: {
    read: "auth.uid != null",
    write: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // 会议纪要 (所有认证用户可查看,仅会议记录人和管理员可编辑)
  meetingRecords: {
    read: "auth.uid != null",
    write: "auth.uid != null && (doc.recordBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  },

  // ============ 系统管理模块 ============
  
  // 用户 (所有认证用户可查看,仅管理员可编辑)
  users: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 角色 (所有认证用户可查看,仅管理员可编辑)
  roles: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 功能模块配置 (所有认证用户可查看,仅管理员可编辑)
  moduleConfig: {
    read: "auth.uid != null",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // 消息通知 (仅自己的消息可见)
  messages: {
    read: "auth.uid != null && doc.userId == auth.uid",
    write: "auth.uid != null && doc.userId == auth.uid"
  },

  // 系统日志 (仅管理员可访问)
  systemLogs: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  },

  // ============ 微信相关集合 ============
  
  // 微信会话 (仅管理员可访问)
  wechat_sessions: {
    read: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'",
    write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  }
};

/**
 * 配置单个集合的权限
 */
async function configureCollectionPermission(collectionName, permissions) {
  try {
    console.log(`\n正在配置集合: ${collectionName}`);
    
    // 这里应该调用CloudBase控制台API来设置权限
    // 由于云函数无法直接设置权限,需要使用管理端API
    console.log(`  读权限: ${permissions.read}`);
    console.log(`  写权限: ${permissions.write}`);
    
    // 注意: 实际权限配置需要在CloudBase控制台完成
    // 或使用CloudBase管理端SDK
    
    return {
      success: true,
      collection: collectionName,
      message: '权限配置建议已生成'
    };
  } catch (error) {
    console.error(`配置集合 ${collectionName} 失败:`, error);
    return {
      success: false,
      collection: collectionName,
      error: error.message
    };
  }
}

/**
 * 批量配置所有集合权限
 */
async function configureAllPermissions() {
  console.log('='.repeat(60));
  console.log('开始配置数据库集合权限');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const [collectionName, permissions] of Object.entries(COLLECTION_PERMISSIONS)) {
    const result = await configureCollectionPermission(collectionName, permissions);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('权限配置完成');
  console.log('='.repeat(60));
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`\n总计: ${results.length} 个集合`);
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
  
  if (failCount > 0) {
    console.log('\n失败的集合:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.collection}: ${r.error}`);
    });
  }
  
  return results;
}

/**
 * 生成权限配置JSON文件
 * 可导入到CloudBase控制台
 */
function generatePermissionConfigFile() {
  const config = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    collections: {}
  };
  
  for (const [collectionName, permissions] of Object.entries(COLLECTION_PERMISSIONS)) {
    config.collections[collectionName] = {
      read: permissions.read,
      write: permissions.write
    };
  }
  
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '..', 'database', 'collection-permissions.json');
  
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`\n权限配置文件已生成: ${outputPath}`);
  
  return outputPath;
}

// 主函数
async function main() {
  try {
    // 1. 配置权限(显示配置建议)
    await configureAllPermissions();
    
    // 2. 生成配置文件
    generatePermissionConfigFile();
    
    console.log('\n提示: 实际权限配置需要在CloudBase控制台完成');
    console.log('请参考生成的配置文件手动设置权限规则');
    
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  configureAllPermissions,
  COLLECTION_PERMISSIONS
};
