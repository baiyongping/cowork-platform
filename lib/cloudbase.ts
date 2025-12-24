import cloudbase from '@cloudbase/js-sdk';

// 从环境变量读取 CloudBase 环境 ID
// 默认使用 Parasaga 生产环境
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'parasaga-5g6ibiua4b9422eb';

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

// 🔧 自动进行匿名登录（提供认证上下文）
// 注意：这不影响我们的自定义用户系统，只是满足 SDK 的认证要求
let authPromise: Promise<void> | null = null;

/**
 * 重置认证状态（用于退出登录后重新初始化）
 */
export function resetAuth() {
  console.log('🔄 重置 CloudBase 认证缓存');
  authPromise = null;
}

export async function ensureAuth() {
  // 🎯 关键修复：使用 Promise 缓存，确保只执行一次匿名登录
  if (authPromise) {
    console.log('⏳ 等待现有认证流程完成...');
    return authPromise;
  }
  
  authPromise = (async () => {
    try {
      console.log('🔍 检查登录状态...');
      const loginState = await auth.getLoginState();
      
      if (!loginState) {
        console.log('🔧 尝试匿名登录...');
        try {
          await auth.signInAnonymously();
          
          // 验证登录成功
          const newLoginState = await auth.getLoginState();
          if (newLoginState?.user?.uid) {
            console.log('✅ 匿名登录成功 - 用户UID:', newLoginState.user.uid);
          } else {
            console.warn('⚠️ 匿名登录失败：无法获取用户信息');
            throw new Error('匿名登录失败：无法获取用户信息');
          }
        } catch (anonymousError: any) {
          // 🎯 匿名登录失败的详细处理
          const errorMsg = anonymousError?.error_description || anonymousError?.message || String(anonymousError);
          console.error('❌ 匿名登录失败:', errorMsg);
          
          // 🎯 如果是CORS错误，提供明确提示
          if (anonymousError?.error === 'permission_denied' && errorMsg.includes('cors')) {
            console.error('📋 CORS错误：请在CloudBase控制台添加安全域名:', window.location.origin);
            console.error('🔗 控制台地址: https://tcb.cloud.tencent.com/dev?envId=' + ENV_ID + '#/settings');
          }
          
          // ⚠️ 不抛出错误，允许系统继续运行（用户登录后会重新认证）
          console.warn('⚠️ 系统将在用户登录后再访问数据库');
        }
      } else {
        console.log('✅ 已有登录状态 - 用户UID:', loginState.user?.uid);
      }
    } catch (error: any) {
      // ⚠️ 外层错误也不抛出，只记录日志
      console.error('❌ CloudBase 认证检查遇到问题:', error?.message || error);
      console.warn('⚠️ 系统将继续运行，用户登录后会重新认证');
      // 不清除缓存，避免无限重试
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
