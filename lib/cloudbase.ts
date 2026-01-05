import cloudbase from '@cloudbase/js-sdk';
import { showError, showSuccess } from '../utils/ui-feedback';
import { CLOUDBASE_ENV_ID, CLOUDBASE_CONSOLE } from '../constants/cloudbase';

// 从环境变量读取 CloudBase 环境 ID，如果没有则使用配置文件中的默认值
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || CLOUDBASE_ENV_ID;

console.log('🔧 CloudBase 环境:', ENV_ID);
console.log('🔧 当前模式:', import.meta.env.MODE);

// 初始化CloudBase
const app = cloudbase.init({
  env: ENV_ID
});

// 延迟初始化数据库实例（避免循环依赖问题）
let _db: ReturnType<typeof app.database> | null = null;
let dbInitTime: number | null = null;

export const db = new Proxy({} as ReturnType<typeof app.database>, {
  get(target, prop) {
    if (!_db) {
      console.log('🔧 初始化 CloudBase 数据库连接...');
      _db = app.database();
      dbInitTime = Date.now();
      console.log('✅ 数据库实例已创建');
    }
    return (_db as any)[prop];
  }
});

/**
 * 获取数据库初始化时间
 */
export function getDbInitTime(): number | null {
  return dbInitTime;
}

/**
 * 检查数据库是否已初始化
 */
export function isDbInitialized(): boolean {
  return _db !== null;
}

// 获取认证实例
export const auth = app.auth();

// 导出云函数调用方法
export const callFunction = app.callFunction.bind(app);

// 🔧 自动进行匿名登录（提供认证上下文）
// 注意：这不影响我们的自定义用户系统，只是满足 SDK 的认证要求
let authPromise: Promise<void> | null = null;
let isLoggedOut = false; // 🔧 标记用户是否主动退出登录

/**
 * 重置认证状态（用于退出登录后重新初始化）
 */
export function resetAuth() {
  console.log('🔄 重置 CloudBase 认证缓存');
  authPromise = null;
  isLoggedOut = true; // 标记为已退出
}

/**
 * 登录成功后重置退出标记
 */
export function clearLogoutFlag() {
  isLoggedOut = false;
}

export async function ensureAuth() {
  // 🎯 关键修复：使用 Promise 缓存，确保只执行一次匿名登录
  if (authPromise) {
    // ✅ 后续调用：直接返回缓存的 Promise，不打印日志
    return authPromise;
  }
  
  // ✅ 首次调用：创建 Promise 并缓存
  authPromise = (async () => {
    try {
      console.log('🔍 [首次] 检查登录状态...');
      const loginState = await auth.getLoginState();
      
      if (!loginState) {
        // ✅ 修复：始终执行匿名登录，提供认证上下文
        // 即使之前退出过，页面刷新后也需要重新获取认证上下文
        console.log('🔐 执行匿名登录，提供认证上下文...');
        try {
          await auth.signInAnonymously();
          console.log('✅ 匿名登录成功');
          // 登录成功后清除退出标志
          isLoggedOut = false;
        } catch (authError: any) {
          console.error('❌ 匿名登录失败:', authError?.message || authError);
          throw authError; // 抛出错误，让外层处理
        }
      } else {
        console.log('✅ 已有登录状态 - 用户UID:', loginState.user?.uid);
        // 有登录状态时也清除退出标志
        isLoggedOut = false;
      }
    } catch (error: any) {
      // ⚠️ 外层错误也不抛出，只记录日志
      console.error('❌ CloudBase 认证检查遇到问题:', error?.message || error);
      console.warn('⚠️ 系统将继续运行，用户登录后会重新认证');
      // ✅ 不清除 authPromise，避免无限重试
    }
  })();
  
  return authPromise;
}

// 自动执行认证检查（不强制要求成功）
ensureAuth().then(() => {
  console.log('✓ CloudBase 认证检查完成');
}).catch(err => {
  console.warn('⚠️ CloudBase 认证检查遇到问题，但系统仍可正常使用:', err?.message || err);
});

// 🐛 暴露调试函数到全局（提供多个别名，方便输入）
if (typeof window !== 'undefined') {
  const debugFunc = async () => {
    try {
      console.log('🐛 开始调试查询...');
      const result = await db.collection('users').get();
      console.log('='.repeat(80));
      console.log('查询结果:', result);
      console.log('用户数量:', result.data?.length || 0);
      
      if (result.data && result.data.length > 0) {
        const pending = result.data.filter((u: any) => u.approvalStatus === 'pending');
        const approved = result.data.filter((u: any) => u.approvalStatus === 'approved');
        
        console.log('\n待审核:', pending.length);
        console.log('已审核:', approved.length);
        console.log('\n所有用户:');
        result.data.forEach((u: any, i: number) => {
          console.log(`${i + 1}. ${u.username} - ${u.approvalStatus}`);
        });
        console.log('='.repeat(80));
        
        alert(`✅ 找到 ${result.data.length} 个用户\n待审核: ${pending.length}\n已审核: ${approved.length}`);
      } else {
        console.log('❌ 没有用户数据');
        alert('❌ 数据库中没有用户数据');
      }
    } catch (e: any) {
      console.error('❌ 查询失败:', e);
      alert('❌ 查询失败: ' + e.message);
    }
  };
  
  // 提供多个别名，方便使用
  (window as any).debugCloudBase = debugFunc;
  (window as any).debugCloudbase = debugFunc;
  (window as any).debugDB = debugFunc;
  (window as any).debug = debugFunc;
}

// 导出 app 实例（用于云存储等功能）
export { app };

export default app;
