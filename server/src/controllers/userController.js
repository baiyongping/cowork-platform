/**
 * 用户控制器
 */

const { validationResult } = require('express-validator');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * 获取用户列表
 */
exports.getUserList = async (req, res) => {
  const { page = 1, limit = 10, keyword, departmentId, status } = req.query;
  
  const skip = (page - 1) * limit;
  const query = { isActive: true };
  
  // 关键词搜索
  if (keyword) {
    query.$or = [
      { name: new RegExp(keyword, 'i') },
      { username: new RegExp(keyword, 'i') },
      { email: new RegExp(keyword, 'i') },
      { phone: new RegExp(keyword, 'i') }
    ];
  }
  
  // 部门筛选
  if (departmentId) {
    query.departmentId = departmentId;
  }
  
  // 状态筛选
  if (status) {
    query.status = status;
  }
  
  const [users, total] = await Promise.all([
    User.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 }),
    User.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: {
      users,
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
 * 获取用户详情
 */
exports.getUserDetail = async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id);

  if (!user || !user.isActive) {
    throw new ApiError(404, '用户不存在');
  }
  
  res.json({
    success: true,
    data: { user }
  });
};

/**
 * 更新用户信息
 */
exports.updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, '请求参数错误', errors.array());
  }
  
  const { id } = req.params;
  const updateData = req.body;
  
  // 不允许直接更新密码和用户名
  delete updateData.password;
  delete updateData.username;
  
  const user = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    throw new ApiError(404, '用户不存在');
  }
  
  logger.info(`用户信息更新: ${user.username}`, { userId: req.userId });
  
  res.json({
    success: true,
    message: '用户信息更新成功',
    data: { user }
  });
};

/**
 * 删除用户（软删除）
 */
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  
  // 不能删除自己
  if (id === req.userId) {
    throw new ApiError(400, '不能删除自己');
  }
  
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  
  if (!user) {
    throw new ApiError(404, '用户不存在');
  }
  
  logger.info(`用户删除: ${user.username}`, { userId: req.userId });
  
  res.json({
    success: true,
    message: '用户删除成功'
  });
};

/**
 * 获取部门成员
 */
exports.getDepartmentMembers = async (req, res) => {
  const { departmentId } = req.params;
  
  const query = {
    departmentId,
    isActive: true,
    status: '在职'
  };
  
  const users = await User.find(query)
    .select('name username position email phone avatar')
    .lean();
  
  res.json({
    success: true,
    data: users
  });
};

module.exports = {
  getUserList: exports.getUserList,
  getUserDetail: exports.getUserDetail,
  updateUser: exports.updateUser,
  deleteUser: exports.deleteUser,
  getDepartmentMembers: exports.getDepartmentMembers
};
