/**
 * 日志管理工具
 * 提供统一的日志输出接口,支持开发/生产环境区分
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;
  private enableConsole: boolean;
  private logs: Array<{
    level: LogLevel;
    message: string;
    data?: any;
    timestamp: Date;
  }> = [];

  private maxLogs = 1000; // 最多保存1000条日志

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.enableConsole = this.isDevelopment || localStorage.getItem('enableLog') === 'true';
  }

  /**
   * 调试日志 - 仅开发环境输出
   */
  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.log('debug', message, data);
      console.log(`🐛 [DEBUG] ${message}`, data || '');
    }
  }

  /**
   * 信息日志
   */
  info(message: string, data?: any) {
    this.log('info', message, data);
    if (this.enableConsole) {
      console.log(`ℹ️  [INFO] ${message}`, data || '');
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: any) {
    this.log('warn', message, data);
    if (this.enableConsole) {
      console.warn(`⚠️  [WARN] ${message}`, data || '');
    }
  }

  /**
   * 错误日志 - 始终输出
   */
  error(message: string, error?: any) {
    this.log('error', message, error);
    console.error(`❌ [ERROR] ${message}`, error || '');
  }

  /**
   * 记录日志到内存
   */
  private log(level: LogLevel, message: string, data?: any) {
    this.logs.push({
      level,
      message,
      data,
      timestamp: new Date()
    });

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(level?: LogLevel) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = [];
  }

  /**
   * 导出日志为JSON
   */
  export() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 启用/禁用控制台输出
   */
  setConsoleEnabled(enabled: boolean) {
    this.enableConsole = enabled;
    localStorage.setItem('enableLog', enabled ? 'true' : 'false');
  }
}

// 导出单例
export const logger = new Logger();

// 便捷方法
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: any) => logger.error(message, error)
};

export default logger;
