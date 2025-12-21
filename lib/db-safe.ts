/**
 * 安全的数据库访问工具
 * 确保在数据库初始化完成后才能访问
 */

import { db, ensureAuth } from './cloudbase';

/**
 * 数据库状态
 */
let dbReady = false;
let initPromise: Promise<void> | null = null;

/**
 * 确保数据库已初始化并可用
 */
export async function ensureDbReady(): Promise<void> {
  // 如果已经就绪，直接返回
  if (dbReady) {
    return;
  }

  // 如果正在初始化，等待完成
  if (initPromise) {
    return initPromise;
  }

  // 开始初始化
  initPromise = (async () => {
    try {
      console.log('🔄 正在初始化数据库连接...');
      
      // 1. 确保认证完成
      await ensureAuth();
      
      // 2. 测试数据库连接（执行一个简单查询）
      try {
        const testResult = await db.collection('users').limit(1).get();
        console.log('✅ 数据库连接测试成功:', {
          requestId: testResult.requestId,
          hasData: testResult.data && testResult.data.length > 0
        });
      } catch (dbError: any) {
        console.error('❌ 数据库连接测试失败:', dbError);
        throw new Error('数据库连接失败: ' + (dbError.message || '未知错误'));
      }
      
      // 3. 标记为就绪
      dbReady = true;
      console.log('✅ 数据库已就绪');
    } catch (error: any) {
      console.error('❌ 数据库初始化失败:', error);
      initPromise = null; // 重置，允许下次重试
      throw error;
    }
  })();

  return initPromise;
}

/**
 * 获取数据库实例（确保已初始化）
 */
export async function getDb() {
  await ensureDbReady();
  return db;
}

/**
 * 安全的数据库操作包装器
 * 自动处理初始化和错误
 */
export async function safeDbOperation<T>(
  operation: (db: typeof import('./cloudbase').db) => Promise<T>,
  operationName = '数据库操作'
): Promise<T> {
  try {
    // 确保数据库就绪
    await ensureDbReady();
    
    // 执行操作
    console.log(`📊 执行${operationName}...`);
    const result = await operation(db);
    console.log(`✅ ${operationName}完成`);
    
    return result;
  } catch (error: any) {
    console.error(`❌ ${operationName}失败:`, error);
    
    // 友好的错误提示
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('permission denied') || errorMessage.includes('cors')) {
      throw new Error('数据库访问被拒绝，请检查安全域名配置或登录状态');
    } else if (errorMessage.includes('network')) {
      throw new Error('网络连接失败，请检查网络状态');
    } else {
      throw new Error(`${operationName}失败: ${errorMessage}`);
    }
  }
}

/**
 * 重置数据库状态（用于退出登录后重新初始化）
 */
export function resetDbState() {
  console.log('🔄 重置数据库状态');
  dbReady = false;
  initPromise = null;
}

/**
 * 检查数据库是否就绪
 */
export function isDbReady(): boolean {
  return dbReady;
}

// 自动初始化（不阻塞主线程）
ensureDbReady().catch(err => {
  console.warn('⚠️ 数据库自动初始化失败，将在首次使用时重试:', err.message);
});
