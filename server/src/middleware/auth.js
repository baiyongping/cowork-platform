/**
 * 认证中间件
 */

const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

/**
 * JWT认证中间件
 */
async function authenticate(req, res, next) {
  try {
    // 获取token
    const token = extractToken(req);
    
    if (!token) {
      throw new ApiError(401, '请先登录', 'Unauthorized');
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查询用户
    const user = await User.findById(decoded.id)
      .select('-password');
    
    if (!user) {
      throw new ApiError(401, '用户不存在', 'User not found');
    }
    
    if (!user.isActive) {
      throw new ApiError(401, '账号已被禁用', 'Account disabled');
    }
    
    // 将用户信息挂载到request对象
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token已过期，请重新登录', 'Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Token无效', 'Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * 提取Token
 */
function extractToken(req) {
  // 从Header获取
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  
  // 从Query获取
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  // 从Cookie获取
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * 权限检查中间件
 * @param {string} module - 模块名称
 * @param {string} action - 操作名称
 */
function authorize(module, action) {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApiError(401, '请先登录', 'Unauthorized');
      }
      
      // 暂时跳过权限检查（因为Role模型还未创建）
      // TODO: 实现完整的权限检查
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 角色检查中间件
 * @param {string[]} roles - 允许的角色代码数组
 */
function requireRole(...roles) {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new ApiError(401, '请先登录', 'Unauthorized');
      }
      
      // 暂时跳过角色检查（因为Role模型还未创建）
      // TODO: 实现完整的角色检查
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 生成JWT Token
 */
function generateToken(user) {
  const payload = {
    id: user._id,
    username: user.username,
    name: user.name
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

/**
 * 生成刷新Token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
}

module.exports = {
  authenticate,
  authorize,
  requireRole,
  generateToken,
  generateRefreshToken
};
