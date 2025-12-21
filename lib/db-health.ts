/**
 * 数据库健康检查工具
 * 用于诊断数据库连接问题
 */

import { db, auth, isDbInitialized, getDbInitTime } from './cloudbase';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    dbInitialized: boolean;
    authReady: boolean;
    dbConnectable: boolean;
    dbReadable: boolean;
  };
  errors: string[];
  warnings: string[];
  meta: {
    dbInitTime: number | null;
    timestamp: number;
  };
}

/**
 * 执行数据库健康检查
 */
export async function checkDbHealth(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    checks: {
      dbInitialized: false,
      authReady: false,
      dbConnectable: false,
      dbReadable: false
    },
    errors: [],
    warnings: [],
    meta: {
      dbInitTime: null,
      timestamp: Date.now()
    }
  };

  // 1. 检查数据库是否已初始化
  try {
    result.checks.dbInitialized = isDbInitialized();
    result.meta.dbInitTime = getDbInitTime();
    
    if (!result.checks.dbInitialized) {
      result.warnings.push('数据库尚未初始化');
    }
  } catch (error: any) {
    result.errors.push('数据库初始化检查失败: ' + error.message);
  }

  // 2. 检查认证状态
  try {
    const loginState = await auth.getLoginState();
    result.checks.authReady = !!loginState;
    
    if (!loginState) {
      result.warnings.push('未检测到登录状态');
    }
  } catch (error: any) {
    result.errors.push('认证状态检查失败: ' + error.message);
  }

  // 3. 检查数据库连接
  try {
    // 执行一个简单的查询测试连接
    const testResult = await db.collection('users').limit(1).get();
    result.checks.dbConnectable = true;
    
    if (testResult.data && testResult.data.length > 0) {
      result.checks.dbReadable = true;
    } else {
      result.warnings.push('数据库可连接但无法读取数据（可能是空数据或权限问题）');
    }
  } catch (error: any) {
    result.errors.push('数据库连接测试失败: ' + error.message);
    result.checks.dbConnectable = false;
    result.checks.dbReadable = false;
  }

  // 评估整体健康状态
  if (result.errors.length > 0) {
    result.status = 'unhealthy';
  } else if (result.warnings.length > 0) {
    result.status = 'degraded';
  } else {
    result.status = 'healthy';
  }

  return result;
}

/**
 * 打印健康检查结果到控制台
 */
export function printHealthCheck(result: HealthCheckResult): void {
  console.log('='.repeat(80));
  console.log('📊 数据库健康检查报告');
  console.log('='.repeat(80));
  
  // 状态
  const statusEmoji = result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';
  console.log(`${statusEmoji} 状态: ${result.status.toUpperCase()}`);
  console.log('');
  
  // 检查项
  console.log('📋 检查项:');
  Object.entries(result.checks).forEach(([key, value]) => {
    const emoji = value ? '✅' : '❌';
    console.log(`  ${emoji} ${key}: ${value}`);
  });
  console.log('');
  
  // 错误
  if (result.errors.length > 0) {
    console.log('❌ 错误:');
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    console.log('');
  }
  
  // 警告
  if (result.warnings.length > 0) {
    console.log('⚠️ 警告:');
    result.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
    console.log('');
  }
  
  // 元信息
  console.log('ℹ️ 元信息:');
  console.log(`  数据库初始化时间: ${result.meta.dbInitTime ? new Date(result.meta.dbInitTime).toLocaleString() : '未初始化'}`);
  console.log(`  检查时间: ${new Date(result.meta.timestamp).toLocaleString()}`);
  
  console.log('='.repeat(80));
}

/**
 * 暴露到全局以便调试
 */
if (typeof window !== 'undefined') {
  (window as any).checkDbHealth = async () => {
    const result = await checkDbHealth();
    printHealthCheck(result);
    return result;
  };
  
  console.log('💡 提示: 运行 window.checkDbHealth() 可以检查数据库健康状态');
}
