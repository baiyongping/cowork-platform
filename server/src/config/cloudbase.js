/**
 * CloudBase配置和初始化
 * 统一使用CloudBase数据库，与前端共享同一数据源
 */

const cloudbase = require('@cloudbase/node-sdk');
const logger = require('../utils/logger');

let app = null;
let db = null;
let auth = null;
let isInitialized = false;

/**
 * 初始化CloudBase
 */
function initCloudBase() {
  if (isInitialized) {
    logger.info('CloudBase已初始化');
    return { app, db, auth };
  }

  try {
    const envId = process.env.CLOUDBASE_ENV_ID || 'jihua-oa-dev-3goht9irae4d949f';
    
    logger.info(`正在初始化CloudBase，环境ID: ${envId}`);

    // 初始化CloudBase应用
    app = cloudbase.init({
      env: envId,
      // 如果需要服务端权限，配置secretId和secretKey
      // secretId: process.env.CLOUDBASE_SECRET_ID,
      // secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    // 获取数据库实例
    db = app.database();
    
    // 获取认证实例
    auth = app.auth();

    isInitialized = true;
    logger.info('✅ CloudBase初始化成功');

    return { app, db, auth };
  } catch (error) {
    logger.error('CloudBase初始化失败:', error);
    throw error;
  }
}

/**
 * 获取CloudBase实例
 */
function getCloudBase() {
  if (!isInitialized) {
    return initCloudBase();
  }
  return { app, db, auth };
}

/**
 * 获取数据库实例
 */
function getDatabase() {
  if (!db) {
    initCloudBase();
  }
  return db;
}

/**
 * 获取认证实例
 */
function getAuth() {
  if (!auth) {
    initCloudBase();
  }
  return auth;
}

module.exports = {
  initCloudBase,
  getCloudBase,
  getDatabase,
  getAuth,
  // 导出实例（延迟初始化）
  get app() { return app || initCloudBase().app; },
  get db() { return db || initCloudBase().db; },
  get auth() { return auth || initCloudBase().auth; }
};
