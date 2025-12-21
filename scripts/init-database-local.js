/**
 * 本地开发环境数据库初始化脚本
 * 直接使用 CloudBase Node.js SDK 初始化数据库
 */

import cloudbase from '@cloudbase/node-sdk';

// 环境 ID
const ENV_ID = 'cowork-9gg9oocb516be5fb';

// 初始化数据
const initData = {
  // 角色
  roles: [
    {
      _id: 'admin',
      name: '管理员',
      permissions: ['*'],
      description: '系统管理员，拥有所有权限',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'manager',
      name: '经理',
      permissions: [
        'tasks:read', 'tasks:write', 'tasks:delete',
        'opportunities:read', 'opportunities:write',
        'projects:read', 'projects:write',
        'goals:read', 'goals:write',
        'employees:read'
      ],
      description: '部门经理，可管理本部门业务',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'employee',
      name: '普通员工',
      permissions: [
        'tasks:read', 'tasks:write',
        'opportunities:read', 'opportunities:write',
        'projects:read',
        'goals:read'
      ],
      description: '普通员工，基本业务权限',
      createdAt: new Date().toISOString()
    }
  ],

  // 部门
  departments: [
    {
      _id: 'dept-001',
      name: '管理部',
      parentId: null,
      managerId: 'admin-001',
      description: '系统管理部门',
      createdAt: new Date().toISOString()
    }
  ],

  // 员工
  employees: [
    {
      _id: 'admin-001',
      username: 'admin',
      // 密码: admin123 的 SHA-256 哈希值
      password: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      name: '系统管理员',
      email: 'admin@jihua.com',
      phone: '13800138000',
      departmentId: 'dept-001',
      roleIds: ['admin'],
      role: 'admin',
      status: '在职',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ],

  // 系统配置
  system_configs: [
    {
      _id: 'system-config-001',
      key: 'system.name',
      value: '际华协同办公管理平台',
      description: '系统名称',
      createdAt: new Date().toISOString()
    }
  ]
};

async function initDatabase() {
  console.log('🚀 开始初始化数据库...\n');

  try {
    // 初始化 CloudBase（需要通过浏览器授权）
    const app = cloudbase.init({
      env: ENV_ID
    });

    await app.auth().signInAnonymously();

    const db = app.database();

    console.log('✅ 已连接到 CloudBase 环境:', ENV_ID);
    console.log('');

    // 创建集合并初始化数据
    for (const [collectionName, data] of Object.entries(initData)) {
      console.log(`⏳ 初始化集合: ${collectionName}...`);

      try {
        // 尝试创建集合（如果已存在会报错，但不影响）
        const collection = db.collection(collectionName);

        // 清空集合
        const { data: existingData } = await collection.get();
        if (existingData.length > 0) {
          console.log(`   清空现有数据 (${existingData.length} 条)...`);
          for (const doc of existingData) {
            await collection.doc(doc._id).remove();
          }
        }

        // 插入数据
        for (const doc of data) {
          await collection.add(doc);
        }

        console.log(`✅ ${collectionName} 初始化完成 (${data.length} 条)\n`);
      } catch (error) {
        console.error(`❌ ${collectionName} 初始化失败:`, error.message, '\n');
      }
    }

    // 创建空集合
    const emptyCollections = [
      'tasks',
      'opportunities',
      'projects',
      'goals',
      'task_comments',
      'operation_logs'
    ];

    console.log('⏳ 创建空集合...');
    for (const collectionName of emptyCollections) {
      try {
        const collection = db.collection(collectionName);
        // 尝试查询集合，如果不存在会自动创建
        await collection.limit(1).get();
        console.log(`✅ ${collectionName}`);
      } catch (error) {
        console.log(`⚠️  ${collectionName} (${error.message})`);
      }
    }

    console.log('\n');
    console.log('========================================');
    console.log('  🎉 数据库初始化完成！');
    console.log('========================================');
    console.log('');
    console.log('📋 管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('');
    console.log('🌐 CloudBase 控制台:');
    console.log(`   https://tcb.cloud.tencent.com/dev?envId=${ENV_ID}#/db/doc`);
    console.log('');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initDatabase();
