/**
 * 数据库配置和连接
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * 连接MongoDB数据库
 */
async function connectDB() {
  if (isConnected) {
    logger.info('数据库已连接');
    return;
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      minPoolSize: 10,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    
    isConnected = true;
    logger.info('✅ 数据库连接成功');
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      logger.error('数据库连接错误:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('数据库连接断开');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('数据库重新连接成功');
      isConnected = true;
    });
    
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

/**
 * 断开数据库连接
 */
async function disconnectDB() {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
    throw error;
  }
}

/**
 * 获取数据库连接状态
 */
function getConnectionStatus() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus
};
