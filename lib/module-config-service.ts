/**
 * 模块配置同步服务
 * 负责从数据库加载模块配置并同步到前端
 */

import { callFunction } from './cloudbase';
import type { Module } from '../types';

export interface ModuleConfigCache {
  modules: Module[];
  timestamp: number;
}

const CACHE_KEY = 'module_config_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

/**
 * 从数据库加载模块配置
 */
export async function loadModuleConfig(): Promise<Module[]> {
  try {
    const res = await callFunction({
      name: 'module-management',
      data: {
        action: 'query',
        data: {}
      }
    });

    if (res.result?.success && res.result?.data) {
      const modules = res.result.data
        .filter((m: Module) => m.enabled !== false)
        .sort((a: Module, b: Module) => (a.order || 0) - (b.order || 0));
      
      // 更新缓存
      const cache: ModuleConfigCache = {
        modules,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      
      return modules;
    }
    
    return [];
  } catch (error) {
    console.error('加载模块配置失败:', error);
    return getCachedConfig();
  }
}

/**
 * 获取缓存的模块配置
 */
export function getCachedConfig(): Module[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    
    const cache: ModuleConfigCache = JSON.parse(cached);
    
    // 检查缓存是否过期
    if (Date.now() - cache.timestamp > CACHE_DURATION) {
      return [];
    }
    
    return cache.modules;
  } catch (error) {
    console.error('读取缓存配置失败:', error);
    return [];
  }
}

/**
 * 清除缓存（用于配置更新后强制重新加载）
 */
export function clearModuleConfigCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * 检查模块是否启用
 */
export function isModuleEnabled(moduleKey: string, modules: Module[]): boolean {
  const module = modules.find(m => m.key === moduleKey);
  return module ? module.enabled !== false : false;
}
