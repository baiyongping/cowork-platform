/**
 * 生产环境基础数据初始化脚本
 * 环境: cowork-9gg9oocb516be5fb (生产环境)
 * 
 * 执行方式:
 * node database/init-production-data.js
 */

import cloudbase from '@cloudbase/node-sdk';

// 初始化 CloudBase (生产环境)
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb',
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY
});

const db = app.database();
const _ = db.command;

// 日志输出
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };
  console.log(`${icons[type]} [${timestamp}] ${message}`);
}

/**
 * 1. 初始化问题类型
 */
async function initIssueTypes() {
  log('初始化问题类型设置...', 'info');
  
  try {
    // 检查是否已存在
    const existing = await db.collection('type_settings')
      .where({ type: 'issue' })
      .get();
    
    if (existing.data && existing.data.length > 0) {
      log('问题类型配置已存在，跳过', 'warning');
      return;
    }
    
    // 创建问题类型
    await db.collection('type_settings').add({
      type: 'issue',
      name: '问题类型',
      description: '用于问题管理的类型分类',
      values: [
        { value: '销售问题', label: '销售问题', enabled: true },
        { value: '产品问题', label: '产品问题', enabled: true },
        { value: '财务问题', label: '财务问题', enabled: true },
        { value: '管理问题', label: '管理问题', enabled: true },
        { value: '系统BUG与建议', label: '系统BUG与建议', enabled: true }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 创建问题状态
    await db.collection('type_settings').add({
      type: 'issueStatus',
      name: '问题状态',
      description: '用于问题管理的状态分类',
      values: [
        { value: '未开始', label: '未开始', enabled: true },
        { value: '进行中', label: '进行中', enabled: true },
        { value: '已完成', label: '已完成', enabled: true },
        { value: '延期', label: '延期', enabled: true },
        { value: '取消', label: '取消', enabled: true },
        { value: '暂停', label: '暂停', enabled: true }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 创建问题优先级
    await db.collection('type_settings').add({
      type: 'issuePriority',
      name: '问题优先级',
      description: '用于问题管理的优先级分类',
      values: [
        { value: '低', label: '低', color: '#10B981', enabled: true },
        { value: '中', label: '中', color: '#F59E0B', enabled: true },
        { value: '高', label: '高', color: '#EF4444', enabled: true },
        { value: '紧急', label: '紧急', color: '#DC2626', enabled: true }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    log('问题类型设置创建成功', 'success');
  } catch (error) {
    log(`问题类型设置初始化失败: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * 2. 初始化user角色
 */
async function initUserRole() {
  log('初始化user角色...', 'info');
  
  try {
    // 检查是否已存在
    const existing = await db.collection('role_permissions')
      .where({ role: 'user' })
      .get();
    
    if (existing.data && existing.data.length > 0) {
      log('user角色已存在，跳过', 'warning');
      return;
    }
    
    // 创建user角色
    await db.collection('role_permissions').add({
      role: 'user',
      name: '普通用户',
      description: '普通用户：仅可查看工作台和个人信息，可编辑个人信息，无其他功能权限。这是所有新注册用户的默认角色。',
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, export: false },
        tasks: { view: false, create: false, edit: false, delete: false, export: false },
        opportunities: { view: false, create: false, edit: false, delete: false, export: false },
        projects: { view: false, create: false, edit: false, delete: false, export: false },
        goal: {
          salesGoal: { view: false, create: false, edit: false, delete: false, export: false },
          opportunityGoal: { view: false, create: false, edit: false, delete: false, export: false },
          strategy: { view: false, create: false, edit: false, delete: false, export: false },
          execution: { view: false, create: false, edit: false, delete: false, export: false }
        },
        profile: { view: true, create: false, edit: true, delete: false, export: false },
        settings: {
          userApproval: { view: false, create: false, edit: false, delete: false, export: false },
          employees: { view: false, create: false, edit: false, delete: false, export: false },
          departments: { view: false, create: false, edit: false, delete: false, export: false },
          roles: { view: false, create: false, edit: false, delete: false, export: false },
          typeSettings: { view: false, create: false, edit: false, delete: false, export: false },
          operationLogs: { view: false, create: false, edit: false, delete: false, export: false }
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    log('user角色创建成功', 'success');
  } catch (error) {
    log(`user角色初始化失败: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * 3. 初始化2025年度目标
 */
async function initGoals() {
  log('初始化2025年度目标...', 'info');
  
  try {
    // 检查是否已存在
    const existingSalesGoals = await db.collection('sales_goals')
      .where({ year: 2025, type: 'annual' })
      .get();
    
    if (existingSalesGoals.data && existingSalesGoals.data.length > 0) {
      log('年度目标已存在，跳过', 'warning');
      return;
    }
    
    // 创建年度销售目标
    await db.collection('sales_goals').add({
      year: 2025,
      orderTarget: 10000,
      orderActual: 0,
      revenueTarget: 10000,
      revenueActual: 0,
      type: 'annual',
      quarter: null,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 创建季度销售目标
    const quarterlyTargets = [
      { quarter: 'Q1', orderTarget: 2000, orderActual: 0, revenueTarget: 2000, revenueActual: 0 },
      { quarter: 'Q2', orderTarget: 2500, orderActual: 0, revenueTarget: 2500, revenueActual: 0 },
      { quarter: 'Q3', orderTarget: 2200, orderActual: 0, revenueTarget: 2200, revenueActual: 0 },
      { quarter: 'Q4', orderTarget: 3300, orderActual: 0, revenueTarget: 3300, revenueActual: 0 }
    ];
    
    for (const target of quarterlyTargets) {
      await db.collection('sales_goals').add({
        year: 2025,
        ...target,
        type: 'quarterly',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // 创建年度商机目标
    await db.collection('opportunity_goals').add({
      year: 2025,
      countTarget: 120,
      countActual: 0,
      amountTarget: 12000,
      amountActual: 0,
      type: 'annual',
      quarter: null,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 创建季度商机目标
    const quarterlyOppTargets = [
      { quarter: 'Q1', countTarget: 30, countActual: 0, amountTarget: 3000, amountActual: 0 },
      { quarter: 'Q2', countTarget: 30, countActual: 0, amountTarget: 3000, amountActual: 0 },
      { quarter: 'Q3', countTarget: 30, countActual: 0, amountTarget: 3000, amountActual: 0 },
      { quarter: 'Q4', countTarget: 30, countActual: 0, amountTarget: 3000, amountActual: 0 }
    ];
    
    for (const target of quarterlyOppTargets) {
      await db.collection('opportunity_goals').add({
        year: 2025,
        ...target,
        type: 'quarterly',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    log('年度目标创建成功', 'success');
  } catch (error) {
    log(`年度目标初始化失败: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================');
  console.log('🚀 开始初始化生产环境基础数据');
  console.log('环境: cowork-9gg9oocb516be5fb');
  console.log('========================================\n');
  
  try {
    // 1. 初始化问题类型
    await initIssueTypes();
    
    // 2. 初始化user角色
    await initUserRole();
    
    // 3. 初始化2025年度目标
    await initGoals();
    
    console.log('\n========================================');
    log('🎉 所有基础数据初始化完成！', 'success');
    console.log('========================================\n');
    
    console.log('📝 已初始化的数据:');
    console.log('  1. 问题类型配置 (type_settings)');
    console.log('  2. user角色配置 (role_permissions)');
    console.log('  3. 2025年度目标 (sales_goals, opportunity_goals)');
    console.log('\n✅ 生产环境数据库初始化完成，可以开始使用应用了！\n');
    
    process.exit(0);
  } catch (error) {
    console.log('\n========================================');
    log('❌ 初始化过程中出现错误', 'error');
    console.log('========================================\n');
    console.error('详细错误:', error);
    process.exit(1);
  }
}

// 执行初始化
main();
