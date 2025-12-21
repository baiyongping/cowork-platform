-- ============================================
-- 添加user角色（普通用户默认角色）
-- Version: v2.2.1
-- Date: 2025-12-16
-- 说明: user角色是所有新注册用户的默认角色
-- 权限: 仅工作台查看和个人信息查看/编辑
-- ============================================

-- 删除已存在的user角色(如果存在)
DELETE FROM role_permissions WHERE roleId = 'user';

-- 添加user角色
INSERT INTO role_permissions (roleId, roleName, permissions, description) VALUES (
  'user',
  '普通用户',
  '{
    "dashboard": {"view": true, "create": false, "edit": false, "delete": false, "export": false},
    "tasks": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
    "opportunities": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
    "projects": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
    "goals": {
      "salesGoals": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "opportunityGoals": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "businessStrategies": {"view": false, "create": false, "edit": false, "delete": false, "export": false},
      "executionMap": {"view": false, "create": false, "edit": false, "delete": false, "export": false}
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
  '普通用户：仅可查看工作台和个人信息，可编辑个人信息，无其他功能权限。这是所有新注册用户的默认角色。'
);

-- ============================================
-- 说明: 
-- 1. user是最低权限角色，仅限查看工作台和管理个人信息
-- 2. 所有新注册用户默认分配user角色
-- 3. 管理员可在系统设置中为用户分配其他角色（employee、manager等）
-- ============================================
