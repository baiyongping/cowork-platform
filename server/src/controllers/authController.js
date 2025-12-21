/**
 * 认证控制器
 */

const { validationResult } = require('express-validator');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * 用户登录
 */
exports.login = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }

  const { username, password } = req.body;

  // 查找用户（不使用populate，因为Role和Department模型还未创建）
  const user = await User.findOne({ username })
    .select('+password');

  if (!user) {
    throw new ApiError(401, '用户名或密码错误', 'Invalid credentials');
  }

  // 检查账号状态
  if (!user.isActive) {
    throw new ApiError(401, '账号已被禁用', 'Account disabled');
  }

  if (user.status !== '在职') {
    throw new ApiError(401, '账号状态异常', 'Account status invalid');
  }

  // 验证密码
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, '用户名或密码错误', 'Invalid credentials');
  }

  // 更新最后登录时间
  user.lastLoginTime = new Date();
  await user.save();

  // 生成Token
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // 记录日志
  logger.info(`用户登录: ${username}`, { userId: user._id });

  // 返回用户信息和Token
  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        department: user.departmentId,
        roles: user.roleIds,
        position: user.position,
        status: user.status
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  });
};

/**
 * 用户注册（管理员创建用户）
 */
exports.register = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }

  const { username, password, name, email, phone, departmentId, roleIds, position } = req.body;

  // 检查用户名是否已存在
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throw new ApiError(409, '用户名已存在', 'Username already exists');
  }

  // 检查邮箱是否已存在
  if (email) {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new ApiError(409, '邮箱已被使用', 'Email already in use');
    }
  }

  // 创建用户
  const user = await User.create({
    username,
    password,
    name,
    email,
    phone,
    departmentId,
    roleIds,
    position,
    createdBy: req.userId
  });

  // 记录日志
  logger.info(`创建用户: ${username}`, { 
    userId: user._id, 
    createdBy: req.userId 
  });

  res.status(201).json({
    success: true,
    message: '用户创建成功',
    data: {
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        departmentId: user.departmentId,
        roleIds: user.roleIds,
        position: user.position
      }
    }
  });
};

/**
 * 用户登出
 */
exports.logout = async (req, res) => {
  // 这里可以实现Token黑名单机制
  logger.info(`用户登出`, { userId: req.userId });

  res.json({
    success: true,
    message: '登出成功'
  });
};

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new ApiError(404, '用户不存在', 'User not found');
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        department: user.departmentId,
        roles: user.roleIds,
        position: user.position,
        status: user.status,
        isActive: user.isActive,
        lastLoginTime: user.lastLoginTime,
        createdAt: user.createdAt
      }
    }
  });
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
  // 验证请求
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }

  const { oldPassword, newPassword } = req.body;

  // 查找用户
  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    throw new ApiError(404, '用户不存在', 'User not found');
  }

  // 验证旧密码
  const isPasswordValid = await user.comparePassword(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, '原密码错误', 'Invalid old password');
  }

  // 更新密码
  user.password = newPassword;
  await user.save();

  // 记录日志
  logger.info(`用户修改密码`, { userId: req.userId });

  res.json({
    success: true,
    message: '密码修改成功'
  });
};

/**
 * 刷新Token
 */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'RefreshToken不能为空', 'RefreshToken required');
  }

  try {
    // 验证refreshToken
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      throw new ApiError(400, '无效的RefreshToken', 'Invalid refresh token');
    }

    // 查找用户
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new ApiError(401, '用户不存在或已被禁用', 'User not found or disabled');
    }

    // 生成新的Token
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    throw new ApiError(401, 'RefreshToken无效或已过期', 'Invalid or expired refresh token');
  }
};
