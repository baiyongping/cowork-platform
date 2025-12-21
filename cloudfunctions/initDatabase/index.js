/**
 * 云函数：初始化数据库
 * 用于快速初始化 cowork 环境的数据库结构和初始数据
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  console.log('开始初始化数据库...');
  
  const app = cloudbase.init({
    env: cloudbase.SYMBOL_CURRENT_ENV
  });
  
  const db = app.database();
  const _ = db.command;
  
  try {
    const results = {
      collections: [],
      initialData: [],
      errors: []
    };

    // ============================================
    // 1. 初始化系统角色
    // ============================================
    console.log('初始化系统角色...');
    
    const roles = [
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
    ];

    try {
      for (const role of roles) {
        await db.collection('roles').add(role);
      }
      results.collections.push('roles');
      results.initialData.push({ collection: 'roles', count: roles.length });
      console.log('✓ 系统角色已初始化');
    } catch (e) {
      console.error('角色初始化失败:', e.message);
      results.errors.push({ step: 'roles', error: e.message });
    }

    // ============================================
    // 2. 初始化部门
    // ============================================
    console.log('初始化部门...');
    
    const departments = [
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
    ];

    try {
      for (const dept of departments) {
        await db.collection('departments').add(dept);
      }
      results.collections.push('departments');
      results.initialData.push({ collection: 'departments', count: departments.length });
      console.log('✓ 部门已初始化');
    } catch (e) {
      console.error('部门初始化失败:', e.message);
      results.errors.push({ step: 'departments', error: e.message });
    }

    // ============================================
    // 3. 初始化超级管理员账号
    // ============================================
    console.log('初始化超级管理员账号...');
    
    const admin = {
      _id: 'admin-001',
      username: 'admin',
      // 密码: admin123 (SHA-256加密)
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
    };

    try {
      await db.collection('employees').add(admin);
      results.collections.push('employees');
      results.initialData.push({ collection: 'employees', count: 1 });
      console.log('✓ 超级管理员账号已创建');
    } catch (e) {
      console.error('管理员账号创建失败:', e.message);
      results.errors.push({ step: 'admin', error: e.message });
    }

    // ============================================
    // 4. 初始化系统配置
    // ============================================
    console.log('初始化系统配置...');
    
    const systemConfigs = [
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
    ];

    try {
      for (const config of systemConfigs) {
        await db.collection('system_configs').add(config);
      }
      results.collections.push('system_configs');
      results.initialData.push({ collection: 'system_configs', count: systemConfigs.length });
      console.log('✓ 系统配置已初始化');
    } catch (e) {
      console.error('系统配置初始化失败:', e.message);
      results.errors.push({ step: 'configs', error: e.message });
    }

    // ============================================
    // 5. 创建空集合（用于后续使用）
    // ============================================
    console.log('创建空集合...');
    
    const emptyCollections = ['tasks', 'opportunities', 'projects', 'goals'];
    
    for (const collectionName of emptyCollections) {
      try {
        // CloudBase 会在第一次写入时自动创建集合
        // 这里添加一个临时文档再删除，确保集合存在
        const tempDoc = await db.collection(collectionName).add({
          _temp: true,
          createdAt: new Date()
        });
        
        await db.collection(collectionName).doc(tempDoc.id).remove();
        results.collections.push(collectionName);
        console.log(`✓ 集合 ${collectionName} 已创建`);
      } catch (e) {
        console.error(`集合 ${collectionName} 创建失败:`, e.message);
        results.errors.push({ step: collectionName, error: e.message });
      }
    }

    // ============================================
    // 完成
    // ============================================
    console.log('✅ 数据库初始化完成！');
    
    return {
      success: true,
      message: '数据库初始化完成',
      data: {
        collections: [...new Set(results.collections)], // 去重
        initialDataSummary: results.initialData,
        errors: results.errors,
        loginInfo: {
          username: 'admin',
          password: 'admin123',
          note: '请登录后立即修改密码'
        }
      }
    };

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return {
      success: false,
      message: '数据库初始化失败',
      error: error.message,
      stack: error.stack
    };
  }
};
