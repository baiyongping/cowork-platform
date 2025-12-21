/**
 * 任务控制器
 * v2.1.0 - 集成权限检查
 */

const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getUserAccessibleData, getTeamTasksForDashboard } = require('../../utils/permissionChecker');

/**
 * 获取任务列表（集成权限过滤）
 */
exports.getTaskList = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    keyword,
    status,
    type,
    priority,
    ownerId,
    startDate,
    endDate
  } = req.query;
  
  const query = { isDeleted: false };
  
  // 关键词搜索
  if (keyword) {
    query.$or = [
      { title: new RegExp(keyword, 'i') },
      { description: new RegExp(keyword, 'i') }
    ];
  }
  
  // 状态筛选
  if (status) {
    query.status = status;
  }
  
  // 类型筛选
  if (type) {
    query.type = type;
  }
  
  // 优先级筛选
  if (priority) {
    query.priority = priority;
  }
  
  // 负责人筛选
  if (ownerId) {
    query.ownerId = ownerId;
  }
  
  // 日期范围筛选
  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }
  
  // 查询所有符合条件的任务
  const allTasks = await Task.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .lean();
  
  // 权限过滤：只返回用户有权限查看的任务
  const accessibleTasks = await getUserAccessibleData(req.user, allTasks);
  
  // 分页处理
  const total = accessibleTasks.length;
  const skip = (page - 1) * limit;
  const tasks = accessibleTasks.slice(skip, skip + parseInt(limit));
  
  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
};

/**
 * 获取任务详情
 */
exports.getTaskDetail = async (req, res) => {
  const { id } = req.params;
  
  const task = await Task.findOne({ _id: id, isDeleted: false });

  if (!task) {
    throw new ApiError(404, '任务不存在');
  }
  
  res.json({
    success: true,
    data: task
  });
};

/**
 * 创建任务
 */
exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }
  
  const taskData = {
    ...req.body,
    ownerId: req.body.ownerId || req.userId,
    creatorId: req.userId,
    creatorName: req.user?.name || '未知'
  };
  
  const task = await Task.create(taskData);
  
  logger.info(`任务创建: ${task.title}`, { userId: req.userId, taskId: task._id });
  
  res.status(201).json({
    success: true,
    message: '任务创建成功',
    data: task
  });
};

/**
 * 更新任务
 */
exports.updateTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }
  
  const { id } = req.params;
  const updateData = req.body;
  
  // 不允许修改创建人信息
  delete updateData.creatorId;
  delete updateData.creatorName;
  
  const task = await Task.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateData },
    { new: true, runValidators: true }
  );
  
  if (!task) {
    throw new ApiError(404, '任务不存在');
  }
  
  logger.info(`任务更新: ${task.title}`, { userId: req.userId, taskId: task._id });
  
  res.json({
    success: true,
    message: '任务更新成功',
    data: task
  });
};

/**
 * 删除任务（软删除）
 */
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  
  const task = await Task.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  
  if (!task) {
    throw new ApiError(404, '任务不存在');
  }
  
  logger.info(`任务删除: ${task.title}`, { userId: req.userId, taskId: task._id });
  
  res.json({
    success: true,
    message: '任务删除成功'
  });
};

/**
 * 获取我的待办任务
 */
exports.getMyPendingTasks = async (req, res) => {
  const tasks = await Task.find({ 
      ownerId: req.userId,
      status: { $in: ['pending', 'in_progress'] },
      isDeleted: false
    })
    .sort({ priority: -1, endDate: 1 })
    .limit(100)
    .lean();
  
  res.json({
    success: true,
    data: tasks
  });
};

/**
 * 获取我的已完成任务
 */
exports.getMyCompletedTasks = async (req, res) => {
  const tasks = await Task.find({ 
      ownerId: req.userId,
      status: 'completed',
      isDeleted: false
    })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  
  res.json({
    success: true,
    data: tasks
  });
};

/**
 * 获取任务统计
 */
exports.getTaskStats = async (req, res) => {
  const stats = await Task.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        }
      }
    }
  ]);
  
  const result = stats[0] || { total: 0 };
  
  // 按状态统计
  const statusMap = {};
  if (result.byStatus) {
    result.byStatus.forEach(item => {
      statusMap[item.status] = (statusMap[item.status] || 0) + 1;
    });
  }
  result.byStatus = statusMap;
  
  // 按优先级统计
  const priorityMap = {};
  if (result.byPriority) {
    result.byPriority.forEach(item => {
      priorityMap[item.priority] = (priorityMap[item.priority] || 0) + 1;
    });
  }
  result.byPriority = priorityMap;
  
  // 按类型统计
  const typeMap = {};
  if (result.byType) {
    result.byType.forEach(item => {
      typeMap[item.type] = (typeMap[item.type] || 0) + 1;
    });
  }
  result.byType = typeMap;
  
  res.json({
    success: true,
    data: result
  });
};

/**
 * 添加协同人
 */
exports.addCollaborator = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  const task = await Task.findByIdAndUpdate(
    id,
    { $addToSet: { collaboratorIds: userId } },
    { new: true }
  );
  
  if (!task) {
    throw new ApiError(404, '任务不存在');
  }
  
  res.json({
    success: true,
    message: '协同人添加成功',
    data: task
  });
};

/**
 * 移除协同人
 */
exports.removeCollaborator = async (req, res) => {
  const { id, userId } = req.params;
  
  const task = await Task.findByIdAndUpdate(
    id,
    { $pull: { collaboratorIds: userId } },
    { new: true }
  );
  
  if (!task) {
    throw new ApiError(404, '任务不存在');
  }
  
  res.json({
    success: true,
    message: '协同人移除成功',
    data: task
  });
};

module.exports = {
  getTaskList: exports.getTaskList,
  getTaskDetail: exports.getTaskDetail,
  createTask: exports.createTask,
  updateTask: exports.updateTask,
  deleteTask: exports.deleteTask,
  getMyPendingTasks: exports.getMyPendingTasks,
  getMyCompletedTasks: exports.getMyCompletedTasks,
  getTaskStats: exports.getTaskStats,
  addCollaborator: exports.addCollaborator,
  removeCollaborator: exports.removeCollaborator
};
