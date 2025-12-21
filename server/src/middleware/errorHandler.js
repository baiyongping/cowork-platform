/**
 * 错误处理中间件
 */

const logger = require('../utils/logger');

/**
 * 404 处理
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `路由不存在: ${req.method} ${req.path}`,
    error: 'Not Found'
  });
}

/**
 * 统一错误处理
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('API错误:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    user: req.user?.id
  });

  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // MongoDB 错误
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    // 唯一索引冲突
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '数据已存在',
        error: 'Duplicate key error'
      });
    }
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token无效',
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token已过期',
      error: 'Token expired'
    });
  }

  // 自定义错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.error || 'Custom error'
    });
  }

  // 默认服务器错误
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 异步错误包装器
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 自定义错误类
 */
class ApiError extends Error {
  constructor(statusCode, message, error = 'API Error') {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.name = 'ApiError';
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  ApiError
};
