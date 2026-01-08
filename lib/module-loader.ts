/**
 * 模块加载器 - 合并配置文件和数据库配置
 * 
 * 功能：
 * 1. 从配置文件加载基础模块
 * 2. 从数据库加载扩展配置
 * 3. 合并配置（数据库优先级高）
 * 4. 缓存结果提高性能
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-08
 */

import { SYSTEM_MODULES, type ModuleDefinition } from '@/constants/modules';
import { db } from './cloudbase';

/**
 * 数据库中的模块配置格式
 */
export interface ModuleConfig {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  parentId?: string;
  order: number;
  isEnabled: boolean;
  isCustom: boolean;
  defaultPermission: string;
  metadata: {
    collections: string[];
    fields: Record<string, any>;
    routes: string[];
    apis: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}

/**
 * 扩展的模块定义（包含数据库字段）
 */
export interface ExtendedModuleDefinition extends ModuleDefinition {
  order?: number;
  icon?: string;
  metadata?: ModuleConfig['metadata'];
  isCustom?: boolean;
}

/**
 * 模块加载器类
 */
export class ModuleLoader {
  private static cachedModules: ExtendedModuleDefinition[] | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 加载所有模块（配置文件 + 数据库）
   * @param force 是否强制刷新缓存
   */
  static async loadModules(force = false): Promise<ExtendedModuleDefinition[]> {
    try {
      // 检查缓存是否有效
      const now = Date.now();
      if (!force && this.cachedModules && (now - this.cacheTimestamp < this.CACHE_DURATION)) {
        console.log('[ModuleLoader] 使用缓存数据');
        return this.cachedModules;
      }

      console.log('[ModuleLoader] 开始加载模块配置...');

      // 1. 从配置文件加载基础模块
      const baseModules = this.cloneModules(SYSTEM_MODULES);
      console.log(`[ModuleLoader] 配置文件模块数: ${this.countAllModules(baseModules)}`);

      // 2. 从数据库加载扩展配置
      const { data: dbConfigs } = await db.collection('modulesConfig')
        .where({ isEnabled: true })
        .orderBy('order', 'asc')
        .get<ModuleConfig>();

      console.log(`[ModuleLoader] 数据库配置数: ${dbConfigs.length}`);

      // 3. 合并配置（数据库优先级高）
      const mergedModules = this.mergeConfigs(baseModules, dbConfigs);
      console.log(`[ModuleLoader] 合并后模块数: ${this.countAllModules(mergedModules)}`);

      // 4. 缓存结果
      this.cachedModules = mergedModules;
      this.cacheTimestamp = now;

      return mergedModules;
    } catch (error) {
      console.error('[ModuleLoader] 加载模块失败:', error);
      // 如果数据库加载失败，降级使用配置文件
      console.log('[ModuleLoader] 降级使用配置文件数据');
      return this.cloneModules(SYSTEM_MODULES);
    }
  }

  /**
   * 合并配置逻辑
   */
  private static mergeConfigs(
    base: ModuleDefinition[],
    db: ModuleConfig[]
  ): ExtendedModuleDefinition[] {
    // 创建数据库配置映射
    const dbMap = new Map<string, ModuleConfig>(db.map(m => [m._id, m]));

    // 合并一级模块
    const merged = base.map(module => {
      const dbConfig = dbMap.get(module.id);
      let mergedModule: ExtendedModuleDefinition;

      if (dbConfig) {
        // 合并数据库配置
        mergedModule = {
          ...module,
          name: dbConfig.displayName || module.name,
          description: dbConfig.description || module.description,
          order: dbConfig.order,
          icon: dbConfig.icon || undefined,
          metadata: dbConfig.metadata,
          isCustom: dbConfig.isCustom
        };

        // 合并子模块
        if (module.children) {
          mergedModule.children = module.children.map(child => {
            const childDb = dbMap.get(child.id);
            if (childDb) {
              return {
                ...child,
                name: childDb.displayName || child.name,
                description: childDb.description || child.description,
                order: childDb.order,
                icon: childDb.icon || undefined,
                metadata: childDb.metadata,
                isCustom: childDb.isCustom
              };
            }
            return child;
          });

          // 按 order 排序子模块
          mergedModule.children.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        }
      } else {
        mergedModule = module as ExtendedModuleDefinition;
      }

      return mergedModule;
    });

    // 添加数据库中的自定义模块（不在配置文件中的）
    const baseIds = new Set(this.getAllModuleIds(base));
    const customModules = db
      .filter(m => m.isCustom && !baseIds.has(m._id))
      .map(this.convertToModuleDefinition);

    // 合并自定义模块
    const result = [...merged, ...customModules];

    // 按 order 排序一级模块
    result.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return result;
  }

  /**
   * 将数据库格式转换为模块定义格式
   */
  private static convertToModuleDefinition(dbConfig: ModuleConfig): ExtendedModuleDefinition {
    const module: ExtendedModuleDefinition = {
      id: dbConfig._id,
      name: dbConfig.displayName,
      description: dbConfig.description,
      order: dbConfig.order,
      icon: dbConfig.icon || undefined,
      metadata: dbConfig.metadata,
      isCustom: dbConfig.isCustom,
      defaultPermission: this.convertPermissionFromString(dbConfig.defaultPermission)
    };

    return module;
  }

  /**
   * 转换权限字符串为对象
   */
  private static convertPermissionFromString(permission: string) {
    const permissionMap: Record<string, any> = {
      'view_only': { view: true, create: false, edit: false, delete: false, export: false },
      'view_create': { view: true, create: true, edit: false, delete: false, export: false },
      'full_permission': { view: true, create: true, edit: true, delete: true, export: true }
    };
    return permissionMap[permission] || permissionMap['view_only'];
  }

  /**
   * 深拷贝模块数组
   */
  private static cloneModules(modules: ModuleDefinition[]): ModuleDefinition[] {
    return modules.map(m => ({
      ...m,
      children: m.children ? m.children.map(c => ({ ...c })) : undefined
    }));
  }

  /**
   * 获取所有模块ID（包括子模块）
   */
  private static getAllModuleIds(modules: ModuleDefinition[]): Set<string> {
    const ids = new Set<string>();
    modules.forEach(module => {
      ids.add(module.id);
      if (module.children) {
        module.children.forEach(child => ids.add(child.id));
      }
    });
    return ids;
  }

  /**
   * 统计所有模块数量（包括子模块）
   */
  private static countAllModules(modules: ModuleDefinition[]): number {
    let count = modules.length;
    modules.forEach(module => {
      if (module.children) {
        count += module.children.length;
      }
    });
    return count;
  }

  /**
   * 清除缓存
   */
  static clearCache() {
    console.log('[ModuleLoader] 清除缓存');
    this.cachedModules = null;
    this.cacheTimestamp = 0;
  }

  /**
   * 根据ID查找模块
   */
  static async findModuleById(moduleId: string): Promise<ExtendedModuleDefinition | null> {
    const modules = await this.loadModules();

    // 在一级模块中查找
    for (const module of modules) {
      if (module.id === moduleId) {
        return module;
      }

      // 在子模块中查找
      if (module.children) {
        const child = module.children.find(c => c.id === moduleId);
        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  /**
   * 获取所有一级模块
   */
  static async getRootModules(): Promise<ExtendedModuleDefinition[]> {
    const modules = await this.loadModules();
    return modules;
  }

  /**
   * 获取指定模块的子模块
   */
  static async getChildModules(parentId: string): Promise<ExtendedModuleDefinition[]> {
    const module = await this.findModuleById(parentId);
    return module?.children || [];
  }

  /**
   * 获取所有模块的扁平列表（包括子模块）
   */
  static async getFlatModules(): Promise<ExtendedModuleDefinition[]> {
    const modules = await this.loadModules();
    const flat: ExtendedModuleDefinition[] = [];

    modules.forEach(module => {
      flat.push(module);
      if (module.children) {
        flat.push(...module.children);
      }
    });

    return flat;
  }
}
