/**
 * 日志工具
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: '\x1b[31m', // 红色
  warn: '\x1b[33m',  // 黄色
  info: '\x1b[36m',  // 青色
  debug: '\x1b[90m', // 灰色
  reset: '\x1b[0m'
};

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function writeToFile(level, message) {
  const logFile = path.join(LOG_DIR, `${level}.log`);
  const formattedMessage = formatMessage(level, message);
  
  fs.appendFile(logFile, formattedMessage + '\n', (err) => {
    if (err) console.error('写入日志文件失败:', err);
  });
}

function log(level, message, meta = {}) {
  if (levels[level] > levels[LOG_LEVEL]) {
    return;
  }
  
  const formattedMessage = formatMessage(level, message, meta);
  const coloredMessage = `${colors[level]}${formattedMessage}${colors.reset}`;
  
  // 控制台输出
  if (level === 'error') {
    console.error(coloredMessage);
  } else if (level === 'warn') {
    console.warn(coloredMessage);
  } else {
    console.log(coloredMessage);
  }
  
  // 写入文件（生产环境）
  if (process.env.NODE_ENV === 'production') {
    writeToFile(level, message);
  }
}

module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};
