/**
 * 验证并初始化 cowork 数据库
 * 
 * 功能：
 * 1. 检查数据库连接
 * 2. 检查集合是否存在
 * 3. 如果不存在，则创建集合和初始数据
 * 4. 提供详细的验证报告
 */

import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'cowork-9gg9oocb516be5fb';

console.log('========================================');
console.log('  CloudBase 数据库验证和初始化');
console.log('========================================\n');

// 初始化 CloudBase
const app = cloudbase.init({
  env: ENV_ID
});

const auth = app.auth();
const db = app.database();
const _ = db.command;

// 初始化数据定义
const INIT_DATA = {
  roles: [
    {
      _id: 'role-admin',
      name: '超级管理员',
      code: 'super_admin',
      description: '系统最高权限，可管理所有功能',
      permissions: [
        { module: 'all', actions: ['view', 'create', 'edit', 'delete', 'export', 'import'] }
      ],
      level: 1,
      isSystem: true,
      status: '启用',
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'role-employee',
      name: '普通员工',
      code: 'employee',
      description: '执行任务，参与协同',
      permissions: [
        { module: 'dashboard', actions: ['view'] },
        { module: 'tasks', actions: ['view', 'create', 'edit'] }
      ],
      level: 5,
      isSystem: true,
      status: '启用',
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  departments: [
    {
      _id: 'dept-sales',
      name: '销售部',
      code: 'SALES',
      level: 1,
      description: '负责客户开发和商机跟进',
      memberCount: 0,
      status: '正常',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'dept-project',
      name: '项目部',
      code: 'PROJECT',
      level: 1,
      description: '负责项目执行和交付',
      memberCount: 0,
      status: '正常',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  employees: [
    {
      _id: 'admin-001',
      username: 'admin',
      // 密码: admin123 (SHA-256)
      password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
      name: '系统管理员',
      email: 'admin@jihua.com',
      phone: '13800138000',
      avatar: '',
      departmentId: null,
      roleIds: ['role-admin'],
      role: 'admin',
      position: '系统管理员',
      status: '在职',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  system_configs: [
    {
      category: 'task',
      key: 'task_types',
      value: ['日常工作', '商机跟进', '项目任务'],
      dataType: 'array',
      description: '任务类型配置',
      isEditable: true,
      sort: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      category: 'task',
      key: 'task_statuses',
      value: ['未开始', '进行中', '已完成', '延期', '取消', '暂停'],
      dataType: 'array',
      description: '任务状态配置',
      isEditable: true,
      sort: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      category: 'opportunity',
      key: 'opportunity_stages',
      value: ['跟进线索', '方案咨询', '商务谈判'],
      dataType: 'array',
      description: '商机阶段配置',
      isEditable: true,
      sort: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      category: 'system',
      key: 'company_name',
      value: '际华集团职业装定制',
      dataType: 'string',
      description: '公司名称',
      isEditable: true,
      sort: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      category: 'system',
      key: 'system_name',
      value: '际华定制协同办公管理平台',
      dataType: 'string',
      description: '系统名称',
      isEditable: true,
      sort: 11,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

// 空集合列表
const EMPTY_COLLECTIONS = ['tasks', 'opportunities', 'projects', 'goals'];

async function main() {
  try {
    // 1. 认证
    console.log('⏳ [1/4] 进行匿名认证...');
    await auth.signInAnonymously();
    const loginState = await auth.getLoginState();
    console.log(`✅ 认证成功 - UID: ${loginState?.user?.uid}\n`);
    
    // 2. 检查集合
    console.log('⏳ [2/4] 检查数据库集合...\n');
    
    const report = {
      existing: [],
      missing: [],
      needsData: []
    };
    
    for (const collectionName of Object.keys(INIT_DATA)) {
      try {
        const result = await db.collection(collectionName).limit(1).get();
        if (result.data && result.data.length > 0) {
          report.existing.push(collectionName);
          console.log(`   ✅ ${collectionName} - 已存在 (${result.data.length} 条)`);
        } else {
          report.needsData.push(collectionName);
          console.log(`   ⚠️  ${collectionName} - 集合存在但无数据`);
        }
      } catch (error) {
        report.missing.push(collectionName);
        console.log(`   ❌ ${collectionName} - 不存在`);
      }
    }
    
    console.log('');
    
    // 3. 初始化数据
    if (report.missing.length > 0 || report.needsData.length > 0) {
      console.log('⏳ [3/4] 初始化数据...\n');
      
      for (const collectionName of [...report.missing, ...report.needsData]) {
        const data = INIT_DATA[collectionName];
        if (!data || data.length === 0) continue;
        
        try {
          console.log(`   创建 ${collectionName}...`);
          
          for (const doc of data) {
            await db.collection(collectionName).add(doc);
          }
          
          console.log(`   ✅ ${collectionName} - ${data.length} 条记录已创建`);
        } catch (error) {
          console.error(`   ❌ ${collectionName} - 失败: ${error.message}`);
        }
      }
      
      console.log('');
    } else {
      console.log('✅ [3/4] 所有集合已有数据，跳过初始化\n');
    }
    
    // 4. 创建空集合
    console.log('⏳ [4/4] 确保空集合存在...\n');
    
    for (const collectionName of EMPTY_COLLECTIONS) {
      try {
        const result = await db.collection(collectionName).limit(1).get();
        console.log(`   ✅ ${collectionName} - 已存在`);
      } catch (error) {
        try {
          // 创建一个临时文档然后删除，确保集合创建
          const tempDoc = await db.collection(collectionName).add({
            _temp: true,
            createdAt: new Date()
          });
          await db.collection(collectionName).doc(tempDoc.id).remove();
          console.log(`   ✅ ${collectionName} - 已创建`);
        } catch (err) {
          console.error(`   ❌ ${collectionName} - 创建失败: ${err.message}`);
        }
      }
    }
    
    console.log('');
    
    // 5. 最终验证
    console.log('========================================');
    console.log('  🎉 初始化完成！');
    console.log('========================================\n');
    
    console.log('📊 数据库状态:\n');
    
    for (const collectionName of Object.keys(INIT_DATA)) {
      try {
        const result = await db.collection(collectionName).count();
        console.log(`   ${collectionName}: ${result.total} 条`);
      } catch (error) {
        console.log(`   ${collectionName}: 查询失败`);
      }
    }
    
    for (const collectionName of EMPTY_COLLECTIONS) {
      try {
        const result = await db.collection(collectionName).count();
        console.log(`   ${collectionName}: ${result.total} 条`);
      } catch (error) {
        console.log(`   ${collectionName}: 查询失败`);
      }
    }
    
    console.log('');
    console.log('📋 管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: admin123\n');
    
    console.log('🌐 CloudBase 控制台:');
    console.log(`   https://tcb.cloud.tencent.com/dev?envId=${ENV_ID}#/db/doc\n`);
    
    console.log('🚀 下一步:');
    console.log('   npm run dev\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('  ❌ 初始化失败');
    console.error('========================================');
    console.error('');
    console.error('错误详情:', error);
    console.error('');
    process.exit(1);
  }
}

// 运行
main();
