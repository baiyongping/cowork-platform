/**
 * 更新角色权限配置云函数
 * Version: v2.1.1
 * Date: 2025-12-15
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 3个默认角色的完整权限配置
 */
const ROLE_CONFIGS = {
  employee: {
    roleId: 'employee',
    roleName: '普通员工',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: false },
      tasks: { view: true, create: true, edit: true, delete: false, export: false },
      opportunities: { view: true, create: true, edit: true, delete: false, export: false },
      projects: { view: true, create: true, edit: true, delete: false, export: false },
      goals: {
        salesGoals: { view: true, create: false, edit: false, delete: false, export: false },
        opportunityGoals: { view: true, create: false, edit: false, delete: false, export: false },
        businessStrategies: { view: true, create: false, edit: false, delete: false, export: false },
        executionMap: { view: true, create: true, edit: true, delete: false, export: false }
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
    description: '普通员工：可查看和编辑自己的任务、商机、项目数据，可查看目标数据但不可编辑，无系统设置权限'
  },
  manager: {
    roleId: 'manager',
    roleName: '部门经理',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: true },
      tasks: { view: true, create: true, edit: true, delete: true, export: true },
      opportunities: { view: true, create: true, edit: true, delete: true, export: true },
      projects: { view: true, create: true, edit: true, delete: true, export: true },
      goals: {
        salesGoals: { view: true, create: true, edit: true, delete: false, export: true },
        opportunityGoals: { view: true, create: true, edit: true, delete: false, export: true },
        businessStrategies: { view: true, create: true, edit: true, delete: false, export: true },
        executionMap: { view: true, create: true, edit: true, delete: true, export: true }
      },
      profile: { view: true, create: false, edit: true, delete: false, export: false },
      settings: {
        userApproval: { view: true, create: false, edit: true, delete: false, export: false },
        employees: { view: true, create: true, edit: true, delete: false, export: true },
        departments: { view: true, create: false, edit: false, delete: false, export: false },
        roles: { view: true, create: false, edit: false, delete: false, export: false },
        typeSettings: { view: true, create: false, edit: false, delete: false, export: false },
        operationLogs: { view: true, create: false, edit: false, delete: false, export: true }
      }
    },
    description: '部门经理：可管理本部门及子部门的所有数据，可创建和编辑团队级目标，可审核用户、管理员工和查看操作日志'
  },
  executive: {
    roleId: 'executive',
    roleName: '高管',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, export: true },
      tasks: { view: true, create: true, edit: true, delete: true, export: true },
      opportunities: { view: true, create: true, edit: true, delete: true, export: true },
      projects: { view: true, create: true, edit: true, delete: true, export: true },
      goals: {
        salesGoals: { view: true, create: true, edit: true, delete: true, export: true },
        opportunityGoals: { view: true, create: true, edit: true, delete: true, export: true },
        businessStrategies: { view: true, create: true, edit: true, delete: true, export: true },
        executionMap: { view: true, create: true, edit: true, delete: true, export: true }
      },
      profile: { view: true, create: false, edit: true, delete: false, export: false },
      settings: {
        userApproval: { view: true, create: false, edit: true, delete: false, export: true },
        employees: { view: true, create: true, edit: true, delete: false, export: true },
        departments: { view: true, create: true, edit: true, delete: true, export: true },
        roles: { view: true, create: false, edit: false, delete: false, export: true },
        typeSettings: { view: true, create: true, edit: true, delete: true, export: true },
        operationLogs: { view: true, create: false, edit: false, delete: false, export: true }
      }
    },
    description: '高管：可查看全公司所有数据，可创建和编辑团队级目标，可管理部门、员工、类型设置，可查看操作日志'
  }
};

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('开始更新角色权限配置...');
  
  const results = [];
  
  try {
    // 更新3个默认角色
    for (const [roleId, config] of Object.entries(ROLE_CONFIGS)) {
      try {
        // 使用 doc().set() 实现 upsert
        const result = await db.collection('role_permissions')
          .where({ roleId })
          .update({
            data: {
              roleName: config.roleName,
              permissions: config.permissions,
              description: config.description,
              updatedAt: new Date()
            }
          });
        
        if (result.stats.updated > 0) {
          results.push({ roleId, status: 'updated', message: `更新成功: ${config.roleName}` });
        } else {
          // 如果没有更新到,说明不存在,需要插入
          await db.collection('role_permissions').add({
            data: {
              ...config,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          results.push({ roleId, status: 'inserted', message: `插入成功: ${config.roleName}` });
        }
      } catch (err) {
        console.error(`处理角色 ${roleId} 失败:`, err);
        results.push({ roleId, status: 'error', error: err.message });
      }
    }
    
    // 删除admin角色定义(如果存在)
    try {
      const deleteResult = await db.collection('role_permissions')
        .where({ roleId: 'admin' })
        .remove();
      
      if (deleteResult.stats.removed > 0) {
        results.push({ roleId: 'admin', status: 'deleted', message: 'admin角色已删除(由代码层面控制权限)' });
      }
    } catch (err) {
      console.error('删除admin角色失败:', err);
    }
    
    console.log('角色权限配置更新完成:', results);
    
    return {
      success: true,
      results,
      summary: `成功处理 ${results.length} 个角色`
    };
    
  } catch (error) {
    console.error('更新失败:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
};
