/**
 * 际华定制协同办公管理平台 - 后端API入口
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
// 使用CloudBase配置
const { initCloudBase } = require('./config/cloudbase');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 中间件配置
// ============================================

// 安全防护
app.use(helmet());

// 跨域配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 压缩响应
app.use(compression());

// 请求日志
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// 健康检查
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ============================================
// API路由
// ============================================

app.use(process.env.API_PREFIX || '/api', routes);

// ============================================
// 错误处理
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 启动服务器
// ============================================

async function startServer() {
  try {
    // 初始化CloudBase
    logger.info('🔌 初始化CloudBase数据库...');
    initCloudBase();
    logger.info('✅ CloudBase初始化成功');
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功`);
      logger.info(`📡 环境: ${process.env.NODE_ENV}`);
      logger.info(`🔗 地址: http://localhost:${PORT}`);
      logger.info(`📚 API: http://localhost:${PORT}${process.env.API_PREFIX || '/api'}`);
      logger.info(`✅ 健康检查: http://localhost:${PORT}/health`);
      logger.info(`💾 数据库: CloudBase MongoDB (与前端共享)`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，准备关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，准备关闭服务器...');
  process.exit(0);
});

// 启动
startServer();

module.exports = app;
