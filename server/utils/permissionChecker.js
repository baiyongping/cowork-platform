/**
 * 权限检查工具函数库 (JavaScript版本)
 * v2.1.0 - 2025-12-15
 * 
 * 实现完整的权限检查规则（F-001至F-008, D-001至D-009）
 */

const logger = require('../src/utils/logger');

/**
 * 获取用户的角色和权限信息
 */
async function getUserRoleInfo(user) {
  const db = require('../src/config/cloudbase').db;
  
  // 查询用户角色
  const { data: [roleData] } = await db.collection('roles')
    .where({ _id: user.roleId })
    .get();
    
  return roleData || null;
}

/**
 * 检查功能权限
 * 规则: F-001至F-008
 * 
 * @param {Object} user - 用户对象
 * @param {string} module - 模块名称 (tasks/opportunities/projects/goals)
 * @param {string} subModule - 子模块名称 (可选)
 * @param {string} permission - 权限类型 (view/create/edit/delete)
 * @returns {boolean}
 */
async function checkFunctionPermission(user, module, subModule = '', permission = 'view') {
  try {
    // 系统管理员拥有所有权限
    if (user.role === 'admin') {
      return true;
    }

    // 获取用户角色信息
    const roleData = await getUserRoleInfo(user);
    if (!roleData || !roleData.permissions) {
      logger.warn(`用户${user.name}无角色权限配置`);
      return false;
    }

    // 构建权限key
    const permissionKey = subModule 
      ? `${module}.${subModule}.${permission}`
      : `${module}.${permission}`;

    // 检查权限
    const hasPermission = roleData.permissions.includes(permissionKey);

    if (!hasPermission) {
      logger.info(`权限检查: 用户${user.name} 无权限 ${permissionKey}`);
    }

    return hasPermission;
  } catch (error) {
    logger.error('功能权限检查失败', error);
    return false;
  }
}

/**
 * 检查数据权限
 * 规则: D-001至D-009
 * 
 * @param {Object} user - 用户对象
 * @param {Object} dataItem - 数据项
 * @param {string} action - 操作类型 (view/edit/delete)
 * @returns {boolean}
 */
async function checkDataPermission(user, dataItem, action = 'view') {
  try {
    // 系统管理员拥有所有权限
    if (user.role === 'admin') {
      return true;
    }

    // D-001: 创建人永远可以查看、编辑、删除
    if (dataItem.creatorId === user._id) {
      return true;
    }

    // D-002: 责任人可以查看、编辑（不能删除）
    if (dataItem.ownerId === user._id) {
      return action !== 'delete';
    }

    // D-003: 协同人可以查看、编辑（不能删除）
    if (dataItem.collaboratorIds && dataItem.collaboratorIds.includes(user._id)) {
      return action !== 'delete';
    }

    // D-004: 下级数据，上级可以查看、编辑、删除
    const isSubordinate = await isUserSubordinate(dataItem.creatorId, user._id);
    if (isSubordinate) {
      return true;
    }

    // D-005: 同部门数据，部门经理可以查看
    if (user.isExecutive && action === 'view') {
      const isSameDepartment = await isInSameDepartment(dataItem.creatorId, user._id);
      if (isSameDepartment) {
        return true;
      }
    }

    // D-006: 公开数据，所有人可以查看
    if (dataItem.isPublic && action === 'view') {
      return true;
    }

    // D-007: 编辑锁定的数据，只有创建人可以编辑
    if (dataItem.isEditLocked && (action === 'edit' || action === 'delete')) {
      return dataItem.creatorId === user._id;
    }

    // 默认拒绝
    return false;
  } catch (error) {
    logger.error('数据权限检查失败', error);
    return false;
  }
}

/**
 * 获取用户可访问的数据列表
 * 
 * @param {Object} user - 用户对象
 * @param {Array} dataList - 数据列表
 * @returns {Array} 过滤后的数据列表
 */
async function getUserAccessibleData(user, dataList) {
  try {
    // 系统管理员可以访问所有数据
    if (user.role === 'admin') {
      return dataList;
    }

    // 获取用户的下级ID列表
    const subordinateIds = await getSubordinates(user._id);
    
    // 获取用户的部门成员ID列表（如果是部门经理）
    let departmentMemberIds = [];
    if (user.isExecutive) {
      departmentMemberIds = await getDepartmentMembers(user.departmentId);
    }

    // 过滤数据
    const accessibleData = dataList.filter(item => {
      // D-001: 创建人
      if (item.creatorId === user._id) return true;

      // D-002: 责任人
      if (item.ownerId === user._id) return true;

      // D-003: 协同人
      if (item.collaboratorIds && item.collaboratorIds.includes(user._id)) return true;

      // D-004: 下级数据
      if (subordinateIds.includes(item.creatorId)) return true;

      // D-005: 同部门数据（部门经理）
      if (user.isExecutive && departmentMemberIds.includes(item.creatorId)) return true;

      // D-006: 公开数据
      if (item.isPublic) return true;

      return false;
    });

    return accessibleData;
  } catch (error) {
    logger.error('获取可访问数据失败', error);
    return [];
  }
}

/**
 * 工作台任务列表特殊规则
 * 规则: D-008, D-009
 * 
 * @param {Object} user - 用户对象
 * @param {Array} tasks - 任务列表
 * @returns {Array} 过滤后的任务列表
 */
async function getTeamTasksForDashboard(user, tasks) {
  try {
    // 系统管理员可以看到所有任务
    if (user.role === 'admin') {
      return tasks;
    }

    // 获取用户团队
    const userTeam = user.team || '';

    // 过滤任务
    const dashboardTasks = tasks.filter(task => {
      // D-008: 同团队的团队级任务
      if (task.level === '团队级' && task.team === userTeam) {
        return true;
      }

      // D-009: 公司级任务
      if (task.level === '公司级') {
        return true;
      }

      // 自己相关的任务（创建人、责任人、协同人）
      if (task.creatorId === user._id || 
          task.ownerId === user._id ||
          (task.collaboratorIds && task.collaboratorIds.includes(user._id))) {
        return true;
      }

      return false;
    });

    return dashboardTasks;
  } catch (error) {
    logger.error('工作台任务过滤失败', error);
    return [];
  }
}

/**
 * 检查编辑权限（组合功能权限+数据权限）
 * 
 * @param {Object} user - 用户对象
 * @param {string} module - 模块名称
 * @param {Object} dataItem - 数据项
 * @returns {boolean}
 */
async function canEdit(user, module, dataItem) {
  // 1. 检查功能权限
  const hasFunctionPermission = await checkFunctionPermission(user, module, '', 'edit');
  if (!hasFunctionPermission) {
    return false;
  }

  // 2. 检查数据权限
  const hasDataPermission = await checkDataPermission(user, dataItem, 'edit');
  return hasDataPermission;
}

/**
 * 检查删除权限（组合功能权限+数据权限）
 * 
 * @param {Object} user - 用户对象
 * @param {string} module - 模块名称
 * @param {Object} dataItem - 数据项
 * @returns {boolean}
 */
async function canDelete(user, module, dataItem) {
  // 1. 检查功能权限
  const hasFunctionPermission = await checkFunctionPermission(user, module, '', 'delete');
  if (!hasFunctionPermission) {
    return false;
  }

  // 2. 检查数据权限
  const hasDataPermission = await checkDataPermission(user, dataItem, 'delete');
  return hasDataPermission;
}

/**
 * 递归获取用户的所有下级ID
 * 
 * @param {string} userId - 用户ID
 * @returns {Array} 下级ID数组
 */
async function getSubordinates(userId) {
  try {
    const db = require('../src/config/cloudbase').db;
    const subordinateIds = [];

    // 查询直接下级
    const { data: directSubordinates } = await db.collection('users')
      .where({ superiorId: userId })
      .get();

    for (const subordinate of directSubordinates) {
      subordinateIds.push(subordinate._id);
      
      // 递归获取下级的下级
      const subSubordinates = await getSubordinates(subordinate._id);
      subordinateIds.push(...subSubordinates);
    }

    return subordinateIds;
  } catch (error) {
    logger.error('获取下级失败', error);
    return [];
  }
}

/**
 * 递归获取部门及子部门的所有成员ID
 * 
 * @param {string} departmentId - 部门ID
 * @returns {Array} 成员ID数组
 */
async function getDepartmentMembers(departmentId) {
  try {
    const db = require('../src/config/cloudbase').db;
    const memberIds = [];

    // 查询当前部门成员
    const { data: members } = await db.collection('users')
      .where({ departmentId: departmentId })
      .get();

    members.forEach(member => {
      memberIds.push(member._id);
    });

    // 查询子部门
    const { data: subDepartments } = await db.collection('departments')
      .where({ parentId: departmentId })
      .get();

    // 递归获取子部门成员
    for (const subDept of subDepartments) {
      const subMembers = await getDepartmentMembers(subDept._id);
      memberIds.push(...subMembers);
    }

    return memberIds;
  } catch (error) {
    logger.error('获取部门成员失败', error);
    return [];
  }
}

/**
 * 检查用户A是否是用户B的下级
 * 
 * @param {string} userAId - 用户A的ID
 * @param {string} userBId - 用户B的ID（上级）
 * @returns {boolean}
 */
async function isUserSubordinate(userAId, userBId) {
  try {
    const subordinateIds = await getSubordinates(userBId);
    return subordinateIds.includes(userAId);
  } catch (error) {
    logger.error('检查上下级关系失败', error);
    return false;
  }
}

/**
 * 检查两个用户是否在同一个部门
 * 
 * @param {string} userAId - 用户A的ID
 * @param {string} userBId - 用户B的ID
 * @returns {boolean}
 */
async function isInSameDepartment(userAId, userBId) {
  try {
    const db = require('../src/config/cloudbase').db;
    
    const { data: [userA] } = await db.collection('users')
      .where({ _id: userAId })
      .get();
      
    const { data: [userB] } = await db.collection('users')
      .where({ _id: userBId })
      .get();

    if (!userA || !userB) return false;

    return userA.departmentId === userB.departmentId;
  } catch (error) {
    logger.error('检查同部门关系失败', error);
    return false;
  }
}

module.exports = {
  checkFunctionPermission,
  checkDataPermission,
  getUserAccessibleData,
  getTeamTasksForDashboard,
  canEdit,
  canDelete,
  getSubordinates,
  getDepartmentMembers,
  isUserSubordinate,
  isInSameDepartment
};
