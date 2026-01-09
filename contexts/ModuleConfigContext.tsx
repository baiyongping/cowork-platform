/**
 * 模块配置全局上下文
 * 提供模块配置的全局访问和更新机制
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadModuleConfig, clearModuleConfigCache, getCachedConfig } from '../lib/module-config-service';
import type { Module } from '../types';

interface ModuleConfigContextType {
  modules: Module[];
  loading: boolean;
  reloadModules: () => Promise<void>;
}

const ModuleConfigContext = createContext<ModuleConfigContextType | undefined>(undefined);

export const ModuleConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载模块配置
  const loadModules = useCallback(async () => {
    // ✅ 检查用户是否已登录
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.log('⏳ [ModuleConfig] 用户未登录，跳过加载模块配置');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 先尝试从缓存加载
      const cached = getCachedConfig();
      if (cached.length > 0) {
        setModules(cached);
        setLoading(false);
        
        // 后台更新
        const latest = await loadModuleConfig();
        if (latest.length > 0) {
          setModules(latest);
        }
      } else {
        // 缓存不存在，直接加载
        const latest = await loadModuleConfig();
        setModules(latest);
      }
    } catch (error) {
      console.error('加载模块配置失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 强制重新加载（清除缓存）
  const reloadModules = useCallback(async () => {
    clearModuleConfigCache();
    await loadModules();
  }, [loadModules]);

  // 初始加载
  useEffect(() => {
    loadModules();
  }, [loadModules]);

  return (
    <ModuleConfigContext.Provider value={{ modules, loading, reloadModules }}>
      {children}
    </ModuleConfigContext.Provider>
  );
};

export const useModuleConfig = () => {
  const context = useContext(ModuleConfigContext);
  if (!context) {
    throw new Error('useModuleConfig must be used within ModuleConfigProvider');
  }
  return context;
};
