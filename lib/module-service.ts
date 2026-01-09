import { callFunction } from './cloudbase';

export interface ModuleConfig {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  order: number;
  isEnabled: boolean;
  isCustom: boolean;
  defaultPermission: string;
  metadata: {
    collections: string[];
    fields: Record<string, FieldInfo[]>;
    routes: string[];
    apis: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface FieldInfo {
  name: string;
  type: string;
  description: string;
  nullable: boolean;
  examples: any[];
}

/**
 * 模块管理服务
 */
export const moduleService = {
  /**
   * 获取模块列表
   */
  async list(filter?: {
    isEnabled?: boolean;
    isCustom?: boolean;
    parentId?: string | null;
  }, sort?: {
    field?: string;
    order?: 'asc' | 'desc';
  }): Promise<ModuleConfig[]> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'list',
          data: { filter, sort }
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '获取模块列表失败');
      }
      
      return res.result.data;
    } catch (error: any) {
      console.error('获取模块列表失败:', error);
      throw new Error(error.message || '获取模块列表失败');
    }
  },
  
  /**
   * 获取模块详情
   */
  async get(moduleId: string): Promise<ModuleConfig> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'get',
          data: { moduleId }
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '获取模块失败');
      }
      
      return res.result.data;
    } catch (error: any) {
      console.error('获取模块失败:', error);
      throw new Error(error.message || '获取模块失败');
    }
  },
  
  /**
   * 创建模块
   */
  async create(moduleData: Partial<ModuleConfig>): Promise<ModuleConfig> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'create',
          data: moduleData
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '创建模块失败');
      }
      
      return res.result.data;
    } catch (error: any) {
      console.error('创建模块失败:', error);
      throw new Error(error.message || '创建模块失败');
    }
  },
  
  /**
   * 更新模块
   */
  async update(moduleId: string, updates: Partial<ModuleConfig>): Promise<ModuleConfig> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'update',
          data: { moduleId, updates }
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '更新模块失败');
      }
      
      return res.result.data;
    } catch (error: any) {
      console.error('更新模块失败:', error);
      throw new Error(error.message || '更新模块失败');
    }
  },
  
  /**
   * 删除模块
   */
  async delete(moduleId: string): Promise<void> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'delete',
          data: { moduleId }
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '删除模块失败');
      }
    } catch (error: any) {
      console.error('删除模块失败:', error);
      throw new Error(error.message || '删除模块失败');
    }
  },
  
  /**
   * 调整排序
   */
  async reorder(modules: { id: string; order: number }[]): Promise<void> {
    try {
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'reorder',
          data: { modules }
        }
      });
      
      if (!res.result.success) {
        throw new Error(res.result.error || '更新排序失败');
      }
    } catch (error: any) {
      console.error('更新排序失败:', error);
      throw new Error(error.message || '更新排序失败');
    }
  },
  
  /**
   * 切换启用状态
   */
  async toggleEnable(moduleId: string, isEnabled: boolean): Promise<void> {
    try {
      console.log('🔧 [moduleService] 切换模块状态:', { moduleId, isEnabled });
      const res = await callFunction({
        name: 'module-management',
        data: {
          action: 'toggleEnable',
          data: { moduleId, isEnabled }
        }
      });
      
      console.log('✅ [moduleService] 状态切换响应:', res);
      
      if (!res.result?.success) {
        throw new Error(res.result?.error || '更新状态失败');
      }
    } catch (error: any) {
      console.error('❌ [moduleService] 更新状态失败:', error);
      throw new Error(error.message || '更新状态失败');
    }
  }
};
