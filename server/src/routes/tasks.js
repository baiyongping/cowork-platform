/**
 * 任务路由
 * v2.1.0 - 集成权限检查
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const taskController = require('../controllers/taskController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { checkFunction, checkEditPermission, checkDeletePermission } = require('../middleware/permissionMiddleware');

// 所有任务路由都需要认证
router.use(authenticate);

// 验证规则
const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('任务标题不能为空'),
  body('type').optional().isIn(['development', 'sales', 'project', 'daily']).withMessage('任务类型无效'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('优先级无效'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('任务状态无效'),
  body('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
  body('endDate').optional().isISO8601().withMessage('截止日期格式不正确'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('进度值必须在0-100之间')
];

/**
 * @route   GET /api/tasks
 * @desc    获取任务列表
 * @access  Private (需要查看权限)
 */
router.get('/', 
  checkFunction('tasks', '', 'view'),
  asyncHandler(taskController.getTaskList)
);

/**
 * @route   GET /api/tasks/:id
 * @desc    获取任务详情
 * @access  Private (需要查看权限)
 */
router.get('/:id', 
  checkFunction('tasks', '', 'view'),
  asyncHandler(taskController.getTaskDetail)
);

/**
 * @route   POST /api/tasks
 * @desc    创建任务
 * @access  Private (需要创建权限)
 */
router.post('/', 
  checkFunction('tasks', '', 'create'),
  createTaskValidator,
  asyncHandler(taskController.createTask)
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    更新任务
 * @access  Private (需要编辑权限)
 */
router.put('/:id', 
  checkEditPermission('tasks'),
  asyncHandler(taskController.updateTask)
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    删除任务
 * @access  Private (需要删除权限)
 */
router.delete('/:id', 
  checkDeletePermission('tasks'),
  asyncHandler(taskController.deleteTask)
);

/**
 * @route   GET /api/tasks/my/pending
 * @desc    获取我的待办任务
 * @access  Private
 */
router.get('/my/pending', asyncHandler(taskController.getMyPendingTasks));

/**
 * @route   GET /api/tasks/my/completed
 * @desc    获取我的已完成任务
 * @access  Private
 */
router.get('/my/completed', asyncHandler(taskController.getMyCompletedTasks));

/**
 * @route   GET /api/tasks/statistics/overview
 * @desc    获取任务统计概览
 * @access  Private
 */
router.get('/statistics/overview', asyncHandler(taskController.getTaskStats));

/**
 * @route   POST /api/tasks/:id/collaborators
 * @desc    添加协同人
 * @access  Private
 */
router.post('/:id/collaborators', asyncHandler(taskController.addCollaborator));

/**
 * @route   DELETE /api/tasks/:id/collaborators/:userId
 * @desc    移除协同人
 * @access  Private
 */
router.delete('/:id/collaborators/:userId', asyncHandler(taskController.removeCollaborator));

module.exports = router;
