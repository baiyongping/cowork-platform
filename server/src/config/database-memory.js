const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoServer;

/**
 * 启动内存数据库（用于开发测试）
 */
async function connectMemoryDB() {
  try {
    // 创建内存MongoDB实例
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'jihua_oa_platform'
      }
    });

    const uri = mongoServer.getUri();
    logger.info('内存数据库启动成功:', uri);

    // 连接到内存数据库
    await mongoose.connect(uri, {
      dbName: 'jihua_oa_platform'
    });

    logger.info('已连接到内存数据库');

    // 初始化测试数据
    await initTestData();

    return mongoose.connection;
  } catch (error) {
    logger.error('内存数据库连接失败:', error);
    throw error;
  }
}

/**
 * 初始化测试数据
 */
async function initTestData() {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');

  try {
    // 检查是否已有管理员
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      logger.info('测试数据已存在');
      return;
    }

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const testUsers = [
      {
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        email: 'admin@jihua.com',
        phone: '13800138000',
        position: '系统管理员',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        status: '在职',
        isActive: true
      },
      {
        username: 'zhangsan',
        password: await bcrypt.hash('123456', 10),
        name: '张三',
        email: 'zhangsan@jihua.com',
        phone: '13800138001',
        position: '销售经理',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan',
        status: '在职',
        isActive: true
      },
      {
        username: 'lisi',
        password: await bcrypt.hash('123456', 10),
        name: '李四',
        email: 'lisi@jihua.com',
        phone: '13800138002',
        position: '项目经理',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi',
        status: '在职',
        isActive: true
      }
    ];

    await User.insertMany(testUsers);
    logger.info('✅ 测试用户创建成功');
    logger.info('登录账号: admin / admin123');
    logger.info('登录账号: zhangsan / 123456');
    logger.info('登录账号: lisi / 123456');

  } catch (error) {
    logger.error('初始化测试数据失败:', error);
  }
}

/**
 * 关闭数据库连接
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
  }
}

module.exports = {
  connectMemoryDB,
  disconnectDB
};
