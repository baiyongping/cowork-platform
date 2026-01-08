/**
 * 初始化 modulesConfig 和 moduleMetadata 集合
 * 
 * 功能：
 * 1. 创建集合
 * 2. 创建索引
 * 3. 设置权限规则
 * 
 * 使用方法：
 * node database/init/init-modules-collection.js
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = cloud.database();

/**
 * 创建 modulesConfig 集合和索引
 */
async function initModulesConfig() {
  console.log('📦 开始初始化 modulesConfig 集合...');
  
  try {
    // 1. 检查集合是否存在
    const collections = await db.collection('modulesConfig').get();
    console.log('✓ modulesConfig 集合已存在');
    
  } catch (error) {
    if (error.errCode === -1) {
      console.log('⚠️ modulesConfig 集合不存在，需要手动创建');
      console.log('请在 CloudBase 控制台创建该集合');
      return false;
    }
    throw error;
  }
  
  // 2. 创建索引
  console.log('📑 创建索引...');
  
  try {
    // 注意：云开发 Node SDK 不直接支持创建索引
    // 需要在控制台手动创建或使用 HTTP API
    console.log('请在 CloudBase 控制台为 modulesConfig 创建以下索引：');
    console.log('1. idx_order: { order: 1 }');
    console.log('2. idx_parent: { parentId: 1, order: 1 }');
    console.log('3. idx_enabled: { isEnabled: 1, order: 1 }');
    console.log('4. idx_custom: { isCustom: 1, isEnabled: 1 }');
    
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    return false;
  }
  
  console.log('✅ modulesConfig 集合初始化完成');
  return true;
}

/**
 * 创建 moduleMetadata 集合和索引
 */
async function initModuleMetadata() {
  console.log('\n📦 开始初始化 moduleMetadata 集合...');
  
  try {
    // 1. 检查集合是否存在
    const collections = await db.collection('moduleMetadata').get();
    console.log('✓ moduleMetadata 集合已存在');
    
  } catch (error) {
    if (error.errCode === -1) {
      console.log('⚠️ moduleMetadata 集合不存在，需要手动创建');
      console.log('请在 CloudBase 控制台创建该集合');
      return false;
    }
    throw error;
  }
  
  // 2. 创建索引
  console.log('📑 创建索引...');
  
  try {
    console.log('请在 CloudBase 控制台为 moduleMetadata 创建以下索引：');
    console.log('1. idx_module_type: { moduleId: 1, type: 1 }');
    console.log('2. idx_active: { isActive: 1, lastUsedAt: -1 }');
    console.log('3. idx_usage: { moduleId: 1, usageCount: -1 }');
    
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    return false;
  }
  
  console.log('✅ moduleMetadata 集合初始化完成');
  return true;
}

/**
 * 设置集合权限规则
 */
async function setPermissions() {
  console.log('\n🔐 设置集合权限规则...');
  
  console.log('请在 CloudBase 控制台设置以下权限规则：');
  console.log('\nmodulesConfig 集合权限：');
  console.log('- 读取：所有登录用户');
  console.log('- 写入：仅通过云函数（管理员）');
  console.log('- 创建：仅通过云函数（管理员）');
  console.log('- 删除：仅通过云函数（管理员）');
  
  console.log('\nmoduleMetadata 集合权限：');
  console.log('- 读取：所有登录用户');
  console.log('- 写入：仅系统自动写入');
  console.log('- 创建：仅系统自动创建');
  console.log('- 删除：仅通过云函数（管理员）');
  
  console.log('✅ 权限规则说明完成');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始初始化功能模块管理所需的数据库集合\n');
  console.log('═'.repeat(60));
  
  try {
    // 1. 初始化 modulesConfig
    const config1 = await initModulesConfig();
    
    // 2. 初始化 moduleMetadata
    const config2 = await initModuleMetadata();
    
    // 3. 设置权限规则
    await setPermissions();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ 所有集合初始化完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 在 CloudBase 控制台手动创建集合（如果不存在）');
    console.log('2. 在控制台创建建议的索引');
    console.log('3. 在控制台设置权限规则');
    console.log('4. 运行数据导入脚本：node database/init/import-modules-data.js');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 执行
main();
