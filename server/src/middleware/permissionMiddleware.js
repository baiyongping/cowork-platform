/**
 * 权限检查中间件
 * v2.1.0 - 统一权限控制
 * 
 * 功能：
 * 1. checkFunctionPermission - 检查功能权限
 * 2. checkDataPermission - 检查数据权限
 * 3. getAccessibleData - 获取可访问数据
 */

const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

// 导入权限检查函数（从utils/permissionChecker.ts转换为JS）
const {
  checkDataPermission,
  checkFunctionPermission,
  getUserAccessibleData,
  getTeamTasksForDashboard,
  canEdit,
  canDelete
} = require('../utils/permissionChecker');

/**
 * 检查功能权限中间件
 * @param {string} module - 模块名称 (tasks/opportunities/projects/goals)
 * @param {string} subModule - 子模块名称 (如 task-dashboard)
 * @param {string} permission - 权限类型 (view/create/edit/delete)
 */
function checkFunction(module, subModule = '', permission = 'view') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      // 检查功能权限
      const hasPermission = await checkFunctionPermission(user, module, subModule, permission);
      
      if (!hasPermission) {
        logger.warn(`权限拒绝: 用户${user.name}(${user._id}) 无权限访问 ${module}/${subModule}:${permission}`);
        throw new ApiError(403, '无权限访问此功能', {
          module,
          subModule,
          permission,
          reason: '功能权限不足'
        });
      }

      // 将权限信息挂载到request
      req.permissions = {
        module,
        subModule,
        permission,
        checked: true
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 检查数据权限中间件（单条数据）
 * @param {string} module - 模块名称
 * @param {string} action - 操作类型 (view/edit/delete)
 * @param {string} idParam - 数据ID参数名 (默认'id')
 */
function checkData(module, action = 'view', idParam = 'id') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const dataId = req.params[idParam];
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      if (!dataId) {
        throw new ApiError(400, '缺少数据ID');
      }

      // 获取数据库实例
      const db = require('../config/cloudbase').db;
      const collection = db.collection(module);
      
      // 查询数据
      const { data: [dataItem] } = await collection
        .where({ _id: dataId })
        .get();

      if (!dataItem) {
        throw new ApiError(404, '数据不存在');
      }

      // 检查数据权限
      const hasPermission = await checkDataPermission(user, dataItem, action);
      
      if (!hasPermission) {
        logger.warn(`权限拒绝: 用户${user.name}(${user._id}) 无权限${action} ${module}:${dataId}`);
        throw new ApiError(403, '无权限访问此数据', {
          module,
          dataId,
          action,
          reason: '数据权限不足'
        });
      }

      // 将数据挂载到request，避免重复查询
      req.dataItem = dataItem;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 过滤可访问数据中间件（列表查询）
 * @param {string} module - 模块名称
 */
function filterAccessibleData(module) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      // 获取所有数据
      const db = require('../config/cloudbase').db;
      const collection = db.collection(module);
      
      // 构建查询条件
      const query = req.query || {};
      const where = { isDeleted: false };
      
      // 应用筛选条件
      if (query.status) where.status = query.status;
      if (query.level) where.level = query.level;
      if (query.type) where.type = query.type;
      if (query.keyword) {
        where.name = new RegExp(query.keyword, 'i');
      }

      // 查询所有符合条件的数据
      const { data: allData } = await collection
        .where(where)
        .get();

      // 过滤用户可访问的数据
      const accessibleData = await getUserAccessibleData(user, allData);

      // 将过滤后的数据挂载到request
      req.accessibleData = accessibleData;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 检查编辑权限（组合功能权限+数据权限）
 * @param {string} module - 模块名称
 * @param {string} idParam - 数据ID参数名
 */
function checkEditPermission(module, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const dataId = req.params[idParam];
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      if (!dataId) {
        throw new ApiError(400, '缺少数据ID');
      }

      // 获取数据
      const db = require('../config/cloudbase').db;
      const collection = db.collection(module);
      const { data: [dataItem] } = await collection
        .where({ _id: dataId })
        .get();

      if (!dataItem) {
        throw new ApiError(404, '数据不存在');
      }

      // 使用canEdit函数检查（包含功能权限+数据权限）
      const hasPermission = await canEdit(user, module, dataItem);
      
      if (!hasPermission) {
        logger.warn(`编辑权限拒绝: 用户${user.name}(${user._id}) 无权限编辑 ${module}:${dataId}`);
        throw new ApiError(403, '无权限编辑此数据');
      }

      // 将数据挂载到request
      req.dataItem = dataItem;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 检查删除权限（组合功能权限+数据权限）
 * @param {string} module - 模块名称
 * @param {string} idParam - 数据ID参数名
 */
function checkDeletePermission(module, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const dataId = req.params[idParam];
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      if (!dataId) {
        throw new ApiError(400, '缺少数据ID');
      }

      // 获取数据
      const db = require('../config/cloudbase').db;
      const collection = db.collection(module);
      const { data: [dataItem] } = await collection
        .where({ _id: dataId })
        .get();

      if (!dataItem) {
        throw new ApiError(404, '数据不存在');
      }

      // 使用canDelete函数检查（包含功能权限+数据权限）
      const hasPermission = await canDelete(user, module, dataItem);
      
      if (!hasPermission) {
        logger.warn(`删除权限拒绝: 用户${user.name}(${user._id}) 无权限删除 ${module}:${dataId}`);
        throw new ApiError(403, '无权限删除此数据');
      }

      // 将数据挂载到request
      req.dataItem = dataItem;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 工作台任务特殊处理中间件
 */
function filterDashboardTasks() {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApiError(401, '请先登录');
      }

      // 获取所有任务
      const db = require('../config/cloudbase').db;
      const { data: allTasks } = await db.collection('tasks')
        .where({ isDeleted: false })
        .get();

      // 应用工作台特殊规则（D-008, D-009）
      const dashboardTasks = await getTeamTasksForDashboard(user, allTasks);

      // 将过滤后的任务挂载到request
      req.dashboardTasks = dashboardTasks;

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  checkFunction,
  checkData,
  filterAccessibleData,
  checkEditPermission,
  checkDeletePermission,
  filterDashboardTasks
};
