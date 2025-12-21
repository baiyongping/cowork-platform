/**
 * 用户路由
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');

// 所有用户路由都需要认证
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    获取用户列表
 * @access  Private
 */
router.get('/', asyncHandler(userController.getUserList));

/**
 * @route   GET /api/users/:id
 * @desc    获取用户详情
 * @access  Private
 */
router.get('/:id', asyncHandler(userController.getUserDetail));

/**
 * @route   PUT /api/users/:id
 * @desc    更新用户信息
 * @access  Private/Admin
 */
router.put('/:id', 
  authorize('users', 'edit'),
  asyncHandler(userController.updateUser)
);

/**
 * @route   DELETE /api/users/:id
 * @desc    删除用户
 * @access  Private/Admin
 */
router.delete('/:id', 
  authorize('users', 'delete'),
  asyncHandler(userController.deleteUser)
);

/**
 * @route   GET /api/users/department/:departmentId
 * @desc    获取部门成员列表
 * @access  Private
 */
router.get('/department/:departmentId', 
  asyncHandler(userController.getDepartmentMembers)
);

module.exports = router;
