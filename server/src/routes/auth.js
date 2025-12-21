/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
// 使用CloudBase版本的控制器
const authController = require('../controllers/authControllerCloudBase');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

// 验证规则
const loginValidator = [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
];

const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度为3-20个字符')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('姓名不能为空'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('邮箱格式不正确'),
  body('phone')
    .optional()
    .matches(/^1[3-9]\d{9}$/)
    .withMessage('手机号格式不正确')
];

const changePasswordValidator = [
  body('oldPassword').notEmpty().withMessage('原密码不能为空'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少6个字符')
];

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', loginValidator, asyncHandler(authController.login));

/**
 * @route   POST /api/auth/register
 * @desc    用户注册（需要管理员权限）
 * @access  Private/Admin
 */
router.post('/register', 
  authenticate, 
  registerValidator, 
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));

/**
 * @route   PUT /api/auth/password
 * @desc    修改密码
 * @access  Private
 */
router.put('/password', 
  authenticate, 
  changePasswordValidator, 
  asyncHandler(authController.changePassword)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新Token
 * @access  Public
 */
router.post('/refresh', asyncHandler(authController.refreshToken));

module.exports = router;
