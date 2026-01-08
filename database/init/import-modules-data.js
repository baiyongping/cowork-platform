/**
 * 导入功能模块配置到数据库
 * 
 * 功能：
 * 1. 读取 constants/modules.ts 中的模块配置
 * 2. 转换为数据库格式
 * 3. 批量导入到 modulesConfig 集合
 * 
 * 使用方法：
 * node database/init/import-modules-data.js
 */

const cloud = require('wx-server-sdk');

// 初始化云开发
cloud.init({
  env: 'cowork-9gg9oocb516be5fb'
});

const db = cloud.database();
const _ = db.command;

// 手动定义模块配置（从 constants/modules.ts 复制）
const SYSTEM_MODULES = [
  // ========== 简单业务模块 (7个) ==========
  {
    id: 'tasks',
    name: '任务管理',
    description: '任务的创建、分配、跟踪和管理',
    defaultPermission: 'view_create',
    order: 1
  },
  {
    id: 'issues',
    name: '问题管理',
    description: '问题的记录、跟踪和解决',
    defaultPermission: 'view_create',
    order: 2
  },
  {
    id: 'opportunities',
    name: '商机管理',
    description: '商机的创建、跟进和转化',
    defaultPermission: 'view_create',
    order: 3
  },
  {
    id: 'projects',
    name: '项目管理',
    description: '项目的规划、执行和监控',
    defaultPermission: 'view_create',
    order: 4
  },
  {
    id: 'meetings',
    name: '例会管理',
    description: '会议的安排、记录和跟踪',
    defaultPermission: 'view_create',
    order: 5
  },
  {
    id: 'performance',
    name: '绩效管理',
    description: '绩效考核和评价管理',
    defaultPermission: 'view_create',
    order: 6
  },
  {
    id: 'business',
    name: '业务管理',
    description: '业务流程和数据管理',
    defaultPermission: 'view_create',
    order: 7
  },
  
  // ========== 目标管理 (父模块 + 7个子模块) ==========
  {
    id: 'goal',
    name: '目标管理',
    description: '目标的设定、分解和跟踪',
    defaultPermission: 'view_create',
    order: 8,
    hasChildren: true
  },
  {
    id: 'salesGoal',
    name: '销售目标',
    description: '销售目标管理(已合并商机目标)',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 1
  },
  {
    id: 'productOrder',
    name: '产品目标',
    description: '产品订单目标管理',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 2
  },
  {
    id: 'strategy',
    name: '经营策略',
    description: '年度经营策略和执行措施(已合并)',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 3
  },
  {
    id: 'outcome',
    name: '成果目标',
    description: '成果目标设定和跟踪',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 4
  },
  {
    id: 'decomposition',
    name: '目标分解',
    description: '目标的层级分解和管理',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 5
  },
  {
    id: 'executionMap',
    name: '执行力地图',
    description: '执行力可视化和分析',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 6
  },
  {
    id: 'dimensionSettings',
    name: '维度设置',
    description: '目标维度参数配置',
    defaultPermission: 'view_create',
    parentId: 'goal',
    order: 7
  },
  
  // ========== 预算管理 (父模块 + 6个子模块) ==========
  {
    id: 'budget',
    name: '预算管理',
    description: '预算的编制、审批和执行',
    defaultPermission: 'view_only',
    order: 9,
    hasChildren: true
  },
  {
    id: 'annual',
    name: '年度预算',
    description: '年度预算编制和审批',
    defaultPermission: 'view_only',
    parentId: 'budget',
    order: 1
  },
  {
    id: 'execution',
    name: '预算执行',
    description: '预算执行情况跟踪',
    defaultPermission: 'view_only',
    parentId: 'budget',
    order: 2
  },
  {
    id: 'asset',
    name: '资产预算',
    description: '资产采购预算管理',
    defaultPermission: 'view_create',
    parentId: 'budget',
    order: 3
  },
  {
    id: 'cashFlow',
    name: '现金流管理',
    description: '现金流预测和管理(待开发)',
    defaultPermission: 'view_only',
    parentId: 'budget',
    order: 4
  },
  {
    id: 'hr',
    name: '薪酬预算',
    description: '薪酬成本预算管理(已更名)',
    defaultPermission: 'view_only',
    parentId: 'budget',
    order: 5
  },
  {
    id: 'parameters',
    name: '预算参数',
    description: '预算编制参数配置',
    defaultPermission: 'view_only',
    parentId: 'budget',
    order: 6
  },
  
  // ========== 个人信息 (父模块 + 6个子模块) ==========
  {
    id: 'profile',
    name: '个人信息',
    description: '个人信息、团队和消息管理',
    defaultPermission: 'view_only',
    order: 10,
    hasChildren: true
  },
  {
    id: 'info',
    name: '基本信息',
    description: '个人基本信息管理',
    defaultPermission: 'full_permission',
    parentId: 'profile',
    order: 1
  },
  {
    id: 'team',
    name: '团队',
    description: '所属团队和成员信息',
    defaultPermission: 'view_only',
    parentId: 'profile',
    order: 2
  },
  {
    id: 'message',
    name: '消息',
    description: '系统消息和通知',
    defaultPermission: 'view_only',
    parentId: 'profile',
    order: 3
  },
  {
    id: 'goals',
    name: '我的目标',
    description: '个人目标查看和跟踪(待开发)',
    defaultPermission: 'view_only',
    parentId: 'profile',
    order: 4
  },
  {
    id: 'execution_profile',
    name: '执行力',
    description: '个人执行力分析(待开发)',
    defaultPermission: 'view_only',
    parentId: 'profile',
    order: 5
  },
  {
    id: 'performance_profile',
    name: '绩效',
    description: '个人绩效查看(待开发)',
    defaultPermission: 'view_only',
    parentId: 'profile',
    order: 6
  },
  
  // ========== 系统设置 (父模块 + 6个子模块) ==========
  {
    id: 'settings',
    name: '系统设置',
    description: '系统配置和权限管理',
    defaultPermission: 'view_only',
    order: 11,
    hasChildren: true
  },
  {
    id: 'userApproval',
    name: '用户审核',
    description: '新用户注册审核',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 1
  },
  {
    id: 'employees',
    name: '员工管理',
    description: '员工信息维护',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 2
  },
  {
    id: 'departments',
    name: '部门管理',
    description: '部门组织架构管理',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 3
  },
  {
    id: 'roles',
    name: '角色权限',
    description: '角色和权限配置',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 4
  },
  {
    id: 'typeSettings',
    name: '参数配置',
    description: '系统参数和选项配置',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 5
  },
  {
    id: 'operationLogs',
    name: '操作日志',
    description: '系统操作记录查询',
    defaultPermission: 'view_only',
    parentId: 'settings',
    order: 6
  }
];

/**
 * 转换模块配置为数据库格式
 */
function convertToDbFormat(module) {
  const now = new Date();
  
  return {
    _id: module.id,
    name: module.id,
    displayName: module.name,
    description: module.description || '',
    icon: null,
    parentId: module.parentId || null,
    order: module.order || 999,
    isEnabled: true,
    isCustom: false,
    defaultPermission: module.defaultPermission || 'view_only',
    metadata: {
      collections: [],
      fields: {},
      routes: [],
      apis: []
    },
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    lastModifiedBy: 'system'
  };
}

/**
 * 批量导入模块配置
 */
async function importModules() {
  console.log('🚀 开始导入功能模块配置到数据库\n');
  console.log('═'.repeat(60));
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const module of SYSTEM_MODULES) {
    try {
      // 检查是否已存在
      const existing = await db.collection('modulesConfig')
        .where({ _id: module.id })
        .count();
      
      if (existing.total > 0) {
        console.log(`⏭️  跳过 ${module.id} (${module.name}) - 已存在`);
        skipCount++;
        continue;
      }
      
      // 转换格式
      const dbData = convertToDbFormat(module);
      
      // 插入数据库
      await db.collection('modulesConfig').add({
        data: dbData
      });
      
      console.log(`✅ 导入 ${module.id} (${module.name})`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ 导入失败 ${module.id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 导入统计：');
  console.log(`   成功: ${successCount} 个`);
  console.log(`   跳过: ${skipCount} 个`);
  console.log(`   失败: ${errorCount} 个`);
  console.log(`   总计: ${SYSTEM_MODULES.length} 个`);
  
  if (errorCount === 0) {
    console.log('\n✅ 所有模块配置导入完成！');
  } else {
    console.log('\n⚠️  部分模块导入失败，请检查错误信息');
  }
}

/**
 * 验证导入结果
 */
async function verifyImport() {
  console.log('\n🔍 验证导入结果...\n');
  
  try {
    // 查询所有记录
    const { data } = await db.collection('modulesConfig')
      .orderBy('order', 'asc')
      .get();
    
    console.log(`数据库中共有 ${data.length} 条记录\n`);
    
    // 按父模块分组
    const parentModules = data.filter(m => !m.parentId);
    const childModules = data.filter(m => m.parentId);
    
    console.log(`一级模块: ${parentModules.length} 个`);
    console.log(`二级模块: ${childModules.length} 个\n`);
    
    // 显示模块结构
    console.log('模块结构预览：');
    for (const parent of parentModules) {
      console.log(`\n📂 ${parent.displayName} (${parent._id})`);
      
      const children = childModules.filter(c => c.parentId === parent._id);
      if (children.length > 0) {
        children.forEach(child => {
          console.log(`   └─ ${child.displayName} (${child._id})`);
        });
      }
    }
    
    console.log('\n✅ 验证完成');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 导入模块
    await importModules();
    
    // 2. 验证导入
    await verifyImport();
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ 数据导入完成！');
    console.log('\n📋 下一步操作：');
    console.log('1. 在控制台检查数据：');
    console.log('   https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/modulesConfig');
    console.log('2. 开发核心工具类：ModuleLoader, MetadataCollector, PermissionSync');
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 执行
main();
