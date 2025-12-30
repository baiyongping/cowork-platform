/**
 * 权限系统数据库初始化云函数
 * Version: v2.1.0
 * Date: 2025-12-15
 */

const cloud = require('wx-server-sdk');
const tcb = require('@cloudbase/node-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 使用CloudBase Node SDK访问MySQL数据库
const app = tcb.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = app.database();

/**
 * 执行SQL语句列表
 */
async function executeSQLStatements(statements) {
  const results = [];
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await db.raw({ sql: statement });
        results.push({ success: true, statement: statement.substring(0, 100) });
      } catch (err) {
        // 忽略"列已存在"等非致命错误
        if (err.message.includes('Duplicate column') || 
            err.message.includes('already exists') ||
            err.message.includes('duplicate key')) {
          results.push({ success: true, statement: statement.substring(0, 100), warning: err.message });
        } else {
          throw err;
        }
      }
    }
  }
  return results;
}

/**
 * 迁移数据库Schema
 */
async function migrateSchema() {
  console.log('开始执行Schema迁移...');
  
  const migrationSQL = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS isExecutive BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT ""',
    'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE',
    'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT ""',
    'ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE',
    'ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT ""',
    'ALTER TABLE projects ADD COLUMN IF NOT EXISTS isEditLocked BOOLEAN DEFAULT FALSE',
    'ALTER TABLE projects ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT ""',
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      roleId VARCHAR(50) NOT NULL UNIQUE,
      roleName VARCHAR(100) NOT NULL,
      permissions JSON NOT NULL,
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _openid VARCHAR(64) DEFAULT '' NOT NULL,
      INDEX idx_roleId (roleId)
    )`,
    `CREATE TABLE IF NOT EXISTS sales_goals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      goalName VARCHAR(200) NOT NULL,
      targetAmount DECIMAL(15,2) NOT NULL,
      currentAmount DECIMAL(15,2) DEFAULT 0,
      progress INT DEFAULT 0,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      status ENUM('进行中', '已完成', '延期', '取消') DEFAULT '进行中',
      ownerId INT NOT NULL,
      team VARCHAR(100) DEFAULT '',
      level ENUM('团队级', '个人级') NOT NULL,
      description TEXT,
      isEditLocked BOOLEAN DEFAULT FALSE,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _openid VARCHAR(64) DEFAULT '' NOT NULL,
      INDEX idx_owner (ownerId),
      INDEX idx_team (team)
    )`,
    `CREATE TABLE IF NOT EXISTS opportunity_goals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      goalName VARCHAR(200) NOT NULL,
      targetCount INT NOT NULL,
      currentCount INT DEFAULT 0,
      progress INT DEFAULT 0,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      status ENUM('进行中', '已完成', '延期', '取消') DEFAULT '进行中',
      ownerId INT NOT NULL,
      team VARCHAR(100) DEFAULT '',
      level ENUM('团队级', '个人级') NOT NULL,
      description TEXT,
      isEditLocked BOOLEAN DEFAULT FALSE,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _openid VARCHAR(64) DEFAULT '' NOT NULL,
      INDEX idx_owner (ownerId)
    )`,
    `CREATE TABLE IF NOT EXISTS business_strategies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      strategyName VARCHAR(200) NOT NULL,
      strategyType ENUM('市场拓展', '产品创新', '成本控制', '团队建设', '其他') NOT NULL,
      priority ENUM('高', '中', '低') DEFAULT '中',
      status ENUM('规划中', '执行中', '已完成', '暂停', '取消') DEFAULT '规划中',
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      ownerId INT NOT NULL,
      team VARCHAR(100) DEFAULT '',
      level ENUM('团队级', '个人级') NOT NULL,
      description TEXT,
      expectedResult TEXT,
      actualResult TEXT,
      isEditLocked BOOLEAN DEFAULT FALSE,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _openid VARCHAR(64) DEFAULT '' NOT NULL,
      INDEX idx_owner (ownerId)
    )`,
    `CREATE TABLE IF NOT EXISTS execution_map (
      id INT AUTO_INCREMENT PRIMARY KEY,
      taskName VARCHAR(200) NOT NULL,
      taskType ENUM('战略任务', '运营任务', '项目任务', '日常任务') NOT NULL,
      priority ENUM('高', '中', '低') DEFAULT '中',
      status ENUM('未开始', '进行中', '已完成', '延期', '取消') DEFAULT '未开始',
      progress INT DEFAULT 0,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      ownerId INT NOT NULL,
      team VARCHAR(100) DEFAULT '',
      level ENUM('团队级', '个人级') NOT NULL,
      relatedStrategyId INT,
      description TEXT,
      isEditLocked BOOLEAN DEFAULT FALSE,
      createdBy INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      _openid VARCHAR(64) DEFAULT '' NOT NULL,
      INDEX idx_owner (ownerId)
    )`
  ];
  
  const results = await executeSQLStatements(migrationSQL);
  console.log('Schema迁移完成:', results.length, '条语句执行');
  return results;
}

/**
 * 初始化默认角色
 */
async function seedRoles() {
  console.log('开始初始化默认角色...');
  
  const roleData = [
    {
      roleId: 'employee',
      roleName: '普通员工',
      permissions: {
        dashboard: {view: true, create: false, edit: false, delete: false, export: false},
        tasks: {view: true, create: true, edit: true, delete: false, export: false},
        opportunities: {view: true, create: true, edit: true, delete: false, export: false},
        projects: {view: true, create: true, edit: true, delete: false, export: false},
        goals: {
          salesGoals: {view: true, create: false, edit: false, delete: false, export: false},
          opportunityGoals: {view: true, create: false, edit: false, delete: false, export: false},
          businessStrategies: {view: true, create: false, edit: false, delete: false, export: false},
          executionMap: {view: true, create: true, edit: true, delete: false, export: false}
        },
        profile: {view: true, create: false, edit: true, delete: false, export: false}
      },
      description: '普通员工：可查看和编辑自己的任务、商机、项目数据'
    },
    {
      roleId: 'manager',
      roleName: '部门经理',
      permissions: {
        dashboard: {view: true, create: false, edit: false, delete: false, export: true},
        tasks: {view: true, create: true, edit: true, delete: true, export: true},
        opportunities: {view: true, create: true, edit: true, delete: true, export: true},
        projects: {view: true, create: true, edit: true, delete: true, export: true},
        goals: {
          salesGoals: {view: true, create: true, edit: true, delete: false, export: true},
          opportunityGoals: {view: true, create: true, edit: true, delete: false, export: true},
          businessStrategies: {view: true, create: true, edit: true, delete: false, export: true},
          executionMap: {view: true, create: true, edit: true, delete: true, export: true}
        },
        profile: {view: true, create: false, edit: true, delete: false, export: false}
      },
      description: '部门经理：可管理本部门及子部门的所有数据'
    },
    {
      roleId: 'executive',
      roleName: '高管',
      permissions: {
        dashboard: {view: true, create: false, edit: false, delete: false, export: true},
        tasks: {view: true, create: true, edit: true, delete: true, export: true},
        opportunities: {view: true, create: true, edit: true, delete: true, export: true},
        projects: {view: true, create: true, edit: true, delete: true, export: true},
        goals: {
          salesGoals: {view: true, create: true, edit: true, delete: true, export: true},
          opportunityGoals: {view: true, create: true, edit: true, delete: true, export: true},
          businessStrategies: {view: true, create: true, edit: true, delete: true, export: true},
          executionMap: {view: true, create: true, edit: true, delete: true, export: true}
        },
        profile: {view: true, create: false, edit: true, delete: false, export: false}
      },
      description: '高管：可查看全公司所有数据，可创建和编辑团队级目标'
    },
    {
      roleId: 'admin',
      roleName: '管理员',
      permissions: {
        dashboard: {view: true, create: true, edit: true, delete: true, export: true},
        tasks: {view: true, create: true, edit: true, delete: true, export: true},
        opportunities: {view: true, create: true, edit: true, delete: true, export: true},
        projects: {view: true, create: true, edit: true, delete: true, export: true},
        goals: {
          salesGoals: {view: true, create: true, edit: true, delete: true, export: true},
          opportunityGoals: {view: true, create: true, edit: true, delete: true, export: true},
          businessStrategies: {view: true, create: true, edit: true, delete: true, export: true},
          executionMap: {view: true, create: true, edit: true, delete: true, export: true}
        },
        profile: {view: true, create: true, edit: true, delete: true, export: true},
        settings: {view: true, create: true, edit: true, delete: true, export: true},
        roles: {view: true, create: true, edit: true, delete: true, export: true}
      },
      description: '管理员：拥有所有功能的完整权限'
    }
  ];
  
  const results = [];
  
  // 先删除旧数据
  try {
    await db.raw({
      sql: 'DELETE FROM role_permissions WHERE roleId IN ("employee", "manager", "executive", "admin")'
    });
    results.push({ success: true, statement: 'DELETE old roles' });
  } catch (err) {
    results.push({ success: true, warning: err.message });
  }
  
  // 插入新数据
  for (const role of roleData) {
    try {
      await db.raw({
        sql: 'INSERT INTO role_permissions (roleId, roleName, permissions, description) VALUES (?, ?, ?, ?)',
        params: [role.roleId, role.roleName, JSON.stringify(role.permissions), role.description]
      });
      results.push({ success: true, statement: `INSERT role: ${role.roleId}` });
    } catch (err) {
      if (err.message.includes('Duplicate entry')) {
        results.push({ success: true, statement: `UPDATE role: ${role.roleId}`, warning: 'Already exists' });
      } else {
        throw err;
      }
    }
  }
  
  // 更新管理员用户
  try {
    await db.raw({
      sql: 'UPDATE users SET roleId = "admin" WHERE username = "admin"'
    });
    results.push({ success: true, statement: 'UPDATE admin user roleId' });
  } catch (err) {
    results.push({ success: true, warning: err.message });
  }
  
  console.log('角色初始化完成:', results.length, '条操作');
  return results;
}

/**
 * 验证权限系统
 */
async function verifySystem() {
  console.log('开始验证权限系统...');
  
  const checks = [];

  // 检查users表扩展字段
  try {
    const result = await db.raw({
      sql: 'SHOW COLUMNS FROM users LIKE "isExecutive"'
    });
    checks.push({ 
      item: 'users.isExecutive字段', 
      status: result.data.length > 0 ? '✅' : '❌' 
    });
  } catch (err) {
    checks.push({ item: 'users.isExecutive字段', status: '❌', error: err.message });
  }

  // 检查role_permissions表
  try {
    const result = await db.raw({
      sql: 'SELECT COUNT(*) as count FROM role_permissions'
    });
    checks.push({ 
      item: 'role_permissions表', 
      status: result.data[0].count >= 4 ? '✅' : '❌',
      count: result.data[0].count
    });
  } catch (err) {
    checks.push({ item: 'role_permissions表', status: '❌', error: err.message });
  }

  // 检查目标管理表
  const goalTables = ['sales_goals', 'opportunity_goals', 'business_strategies', 'execution_map'];
  for (const table of goalTables) {
    try {
      const result = await db.raw({
        sql: `SHOW TABLES LIKE "${table}"`
      });
      checks.push({ 
        item: `${table}表`, 
        status: result.data.length > 0 ? '✅' : '❌' 
      });
    } catch (err) {
      checks.push({ item: `${table}表`, status: '❌', error: err.message });
    }
  }

  console.log('验证完成:', checks);
  return checks;
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'migrate':
        const migrateResults = await migrateSchema();
        return {
          success: true,
          message: 'Schema迁移成功',
          results: migrateResults
        };

      case 'seed':
        const seedResults = await seedRoles();
        return {
          success: true,
          message: '角色初始化成功',
          results: seedResults
        };

      case 'verify':
        const verifyResults = await verifySystem();
        const allPassed = verifyResults.every(r => r.status === '✅');
        return {
          success: allPassed,
          message: allPassed ? '验证通过' : '验证失败',
          checks: verifyResults
        };

      default:
        return {
          success: false,
          message: '未知操作: ' + action
        };
    }
  } catch (error) {
    console.error('执行失败:', error);
    return {
      success: false,
      message: error.message,
      stack: error.stack
    };
  }
};
