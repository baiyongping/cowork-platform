/**
 * CloudBase 数据库初始化脚本
 * 用于在 CloudBase 环境中创建集合和初始数据
 * 
 * 执行方法:
 * node init-cloudbase-database.js
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'cowork-9gg9oocb516be5fb',
  secretId: process.env.TCB_SECRET_ID || '',  // 需要配置环境变量
  secretKey: process.env.TCB_SECRET_KEY || ''  // 需要配置环境变量
});

const db = app.database();
const _ = db.command;

async function initDatabase() {
  console.log('开始初始化 CloudBase 数据库...\n');

  try {
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
        _id: 'role-senior-leader',
        name: '高层领导',
        code: 'senior_leader',
        description: '查看全局数据，制定战略目标',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'tasks', actions: ['view', 'create', 'edit'] },
          { module: 'opportunities', actions: ['view', 'create', 'edit'] },
          { module: 'projects', actions: ['view', 'create', 'edit'] },
          { module: 'goals', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'reports', actions: ['view', 'export'] }
        ],
        level: 2,
        isSystem: true,
        status: '启用',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'role-dept-manager',
        name: '部门经理',
        code: 'department_manager',
        description: '管理本部门的任务、商机、项目',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'tasks', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'opportunities', actions: ['view', 'create', 'edit', 'delete'] },
          { module: 'projects', actions: ['view', 'create', 'edit'] },
          { module: 'goals', actions: ['view'] }
        ],
        level: 3,
        isSystem: true,
        status: '启用',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'role-sales-manager',
        name: '销售经理',
        code: 'sales_manager',
        description: '管理商机和客户关系',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'tasks', actions: ['view', 'create', 'edit'] },
          { module: 'opportunities', actions: ['view', 'create', 'edit', 'delete'] }
        ],
        level: 4,
        isSystem: true,
        status: '启用',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'role-project-manager',
        name: '项目经理',
        code: 'project_manager',
        description: '管理项目全生命周期',
        permissions: [
          { module: 'dashboard', actions: ['view'] },
          { module: 'tasks', actions: ['view', 'create', 'edit'] },
          { module: 'projects', actions: ['view', 'create', 'edit', 'delete'] }
        ],
        level: 4,
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

    for (const role of roles) {
      await db.collection('roles').add(role);
    }
    console.log('✓ 系统角色已初始化\n');

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
      },
      {
        _id: 'dept-production',
        name: '生产部',
        code: 'PRODUCTION',
        level: 1,
        description: '负责产品生产和质量控制',
        memberCount: 0,
        status: '正常',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'dept-finance',
        name: '财务部',
        code: 'FINANCE',
        level: 1,
        description: '负责财务管理和成本控制',
        memberCount: 0,
        status: '正常',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const dept of departments) {
      await db.collection('departments').add(dept);
    }
    console.log('✓ 部门已初始化\n');

    // ============================================
    // 3. 初始化超级管理员账号
    // ============================================
    console.log('初始化超级管理员账号...');
    
    const admin = {
      _id: 'user-admin',
      username: 'admin',
      // 密码: admin123 (SHA-256)
      password: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      name: '系统管理员',
      email: 'admin@jihua.com',
      phone: '13800138000',
      avatar: '',
      departmentId: null,
      roleIds: ['role-admin'],
      position: '系统管理员',
      status: '在职',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('employees').add(admin);
    console.log('✓ 超级管理员账号已创建');
    console.log('  用户名: admin');
    console.log('  初始密码: admin123');
    console.log('  请登录后立即修改密码！\n');

    // ============================================
    // 4. 初始化系统配置
    // ============================================
    console.log('初始化系统配置...');
    
    const systemConfigs = [
      // 任务配置
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
        description: '任务状态配置（日常工作、商机跟进）',
        isEditable: true,
        sort: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // 商机配置
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
        category: 'opportunity',
        key: 'action_types',
        value: [
          '拜访客户',
          '联络客户感情',
          '了解年度采购计划',
          '提交公司资质和案例',
          '样衣展示和试穿',
          '提交定制方案和报价',
          '提交投标文件',
          '价格谈判',
          '合同条款确认',
          '其它'
        ],
        dataType: 'array',
        description: '商机跟进动作类型',
        isEditable: true,
        sort: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // 项目配置
      {
        category: 'project',
        key: 'project_statuses',
        value: ['未开始', '准备期', '制造期', '交付期', '已完成', '暂停'],
        dataType: 'array',
        description: '项目状态配置',
        isEditable: true,
        sort: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'project',
        key: 'project_phases',
        value: {
          preparation: ['物料采购', '样衣生产', '量体数据采集'],
          production: ['缝制生产', '质量检验', '产品入库'],
          delivery: ['物流配送', '产品交付', '售后服务']
        },
        dataType: 'object',
        description: '项目环节配置',
        isEditable: true,
        sort: 6,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // 产品类型配置
      {
        category: 'product',
        key: 'product_types',
        value: ['西服套装', '衬衫', '工装', '夹克', '大衣', '组合套装'],
        dataType: 'array',
        description: '产品类型配置',
        isEditable: true,
        sort: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // 系统配置
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

    for (const config of systemConfigs) {
      await db.collection('system_configs').add(config);
    }
    console.log('✓ 系统配置已初始化\n');

    // ============================================
    // 5. 初始化2025年度目标
    // ============================================
    console.log('初始化2025年度目标...');
    
    const goals = [
      {
        year: 2025,
        quarter: 'annual',
        type: 'sales',
        salesGoal: {
          orderTarget: 10000,
          orderActual: 0,
          revenueTarget: 10000,
          revenueActual: 0,
          completionRate: 0
        },
        status: '进行中',
        createdBy: 'user-admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        year: 2025,
        quarter: 'annual',
        type: 'opportunity',
        opportunityGoal: {
          countTarget: 120,
          countActual: 0,
          amountTarget: 12000,
          amountActual: 0,
          conversionRate: 0
        },
        status: '进行中',
        createdBy: 'user-admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const goal of goals) {
      await db.collection('goals').add(goal);
    }
    console.log('✓ 2025年度目标已初始化\n');

    // ============================================
    // 完成
    // ============================================
    console.log('✅ 数据库初始化完成！\n');
    console.log('重要提示:');
    console.log('1. 请使用 admin/admin123 登录系统');
    console.log('2. 首次登录后请立即修改密码');
    console.log('3. 请创建部门和员工账号');
    console.log('4. 建议配置数据库备份策略\n');
    console.log('数据库连接信息:');
    console.log('- 环境 ID: cowork-9gg9oocb516be5fb');
    console.log('- 集合数量: 5 (roles, departments, employees, system_configs, goals)');
    console.log('- 初始数据已插入');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 执行初始化
initDatabase()
  .then(() => {
    console.log('\n数据库初始化成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n数据库初始化失败:', error);
    process.exit(1);
  });
