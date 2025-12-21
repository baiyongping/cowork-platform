-- ============================================
-- 初始化3个默认角色
-- Version: v2.1.1
-- Date: 2025-12-15
-- 说明: admin超级管理员无需在数据库中定义,代码层面直接给予全部权限
-- ============================================

-- 清空现有角色数据(如果存在)
DELETE FROM role_permissions WHERE roleId IN ('employee', 'manager', 'executive');

-- 1. 普通员工角色
INSERT INTO role_permissions (roleId, roleName, permissions, description) VALUES (
  'employee',
  '普通员工',
  '{
    "dashboard": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
    "tasks": {"view": true, "create": true, "edit": true, "delete": false, "export": false},
    "opportunities": {"view": true, "create": true, "edit": true, "delete": false, "export": false},
    "projects": {"view": true, "create": true, "edit": true, "delete": false, "export": false},
    "goals": {
      "salesGoals": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "opportunityGoals": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "businessStrategies": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "executionMap": {"view": true, "create": true, "edit": true, "delete": false, "export": false}
    },
    "profile": {"view": true, "create": false, "edit": true, "delete": false, "export": false},
    "settings": {
      "userApproval": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "employees": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "departments": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "roles": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "typeSettings": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "operationLogs": {"view": false, "create": false, "edit": false, "delete": false, "export": false}
    }
  }',
  '普通员工：可查看和编辑自己的任务、商机、项目数据，可查看目标数据但不可编辑，无系统设置权限'
);

-- 2. 部门经理角色
INSERT INTO role_permissions (roleId, roleName, permissions, description) VALUES (
  'manager',
  '部门经理',
  '{
    "dashboard": {"view": true, "create": false, "edit": false, "delete": false, "export": true},
    "tasks": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "opportunities": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "projects": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "goals": {
      "salesGoals": {"view": true, "create": true, "edit": true, "delete": false, "export": true},
      "opportunityGoals": {"view": true, "create": true, "edit": true, "delete": false, "export": true},
      "businessStrategies": {"view": true, "create": true, "edit": true, "delete": false, "export": true},
      "executionMap": {"view": true, "create": true, "edit": true, "delete": true, "export": true}
    },
    "profile": {"view": true, "create": false, "edit": true, "delete": false, "export": false},
    "settings": {
      "userApproval": {"view": true, "create": false, "edit": true, "delete": false, "export": false},
      "employees": {"view": true, "create": true, "edit": true, "delete": false, "export": true},
      "departments": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "roles": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "typeSettings": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
      "operationLogs": {"view": true, "create": false, "edit": false, "delete": false, "export": true}
    }
  }',
  '部门经理：可管理本部门及子部门的所有数据，可创建和编辑团队级目标，可审核用户、管理员工和查看操作日志'
);

-- 3. 高管角色
INSERT INTO role_permissions (roleId, roleName, permissions, description) VALUES (
  'executive',
  '高管',
  '{
    "dashboard": {"view": true, "create": false, "edit": false, "delete": false, "export": true},
    "tasks": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "opportunities": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "projects": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
    "goals": {
      "salesGoals": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
      "opportunityGoals": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
      "businessStrategies": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
      "executionMap": {"view": true, "create": true, "edit": true, "delete": true, "export": true}
    },
    "profile": {"view": true, "create": false, "edit": true, "delete": false, "export": false},
    "settings": {
      "userApproval": {"view": true, "create": false, "edit": true, "delete": false, "export": true},
      "employees": {"view": true, "create": true, "edit": true, "delete": false, "export": true},
      "departments": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
      "roles": {"view": true, "create": false, "edit": false, "delete": false, "export": true},
      "typeSettings": {"view": true, "create": true, "edit": true, "delete": true, "export": true},
      "operationLogs": {"view": true, "create": false, "edit": false, "delete": false, "export": true}
    }
  }',
  '高管：可查看全公司所有数据，可创建和编辑公司级目标，可管理部门、员工、类型设置，可查看操作日志'
);

-- ============================================
-- 说明: admin角色不在数据库中定义
-- admin用户直接在代码层面拥有所有功能的完整权限
-- ============================================
