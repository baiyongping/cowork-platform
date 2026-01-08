/**
 * 元数据采集器 - 自动采集模块的数据库集合、字段、路由、API信息
 * 
 * 功能：
 * 1. 扫描模块关联的数据库集合
 * 2. 扫描集合的字段信息
 * 3. 扫描前端路由
 * 4. 扫描API接口
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-08
 */

import { db } from './cloudbase';

/**
 * 字段信息
 */
export interface FieldInfo {
  name: string;
  type: string;
  description?: string;
  isRequired?: boolean;
  defaultValue?: any;
}

/**
 * 集合信息
 */
export interface CollectionInfo {
  name: string;
  description?: string;
  recordCount: number;
  fields: FieldInfo[];
  indexes?: any[];
}

/**
 * 元数据采集器类
 */
export class MetadataCollector {
  /**
   * 扫描模块的数据库集合
   * 
   * 策略：
   * 1. 根据模块ID猜测可能的集合名（如 tasks -> tasks）
   * 2. 从代码中分析（静态分析，需要手动配置）
   */
  static async scanCollections(moduleId: string): Promise<string[]> {
    console.log(`[MetadataCollector] 扫描模块 ${moduleId} 的集合...`);

    // 预定义的模块-集合映射
    const MODULE_COLLECTION_MAP: Record<string, string[]> = {
      'tasks': ['tasks', 'taskComments'],
      'issues': ['issueRecords'],
      'opportunities': ['opportunities'],
      'projects': ['projects', 'projectTasks'],
      'meetings': ['meetings', 'meetingNotes'],
      'goal': ['goals', 'goalDecompositions', 'decompositionTables', 'quarterlyMeasures', 'safeguards', 'outcomeGoals'],
      'salesGoal': ['goals'],
      'productOrder': ['goals'],
      'strategy': ['quarterlyMeasures', 'safeguards'],
      'outcome': ['outcomeGoals'],
      'decomposition': ['goalDecompositions', 'decompositionTables'],
      'budget': ['budgetSubjects', 'budgetExecution'],
      'annual': ['budgetSubjects'],
      'execution': ['budgetExecution'],
      'asset': ['budgetSubjects'],
      'hr': ['budgetSubjects'],
      'profile': ['users', 'messages'],
      'info': ['users'],
      'message': ['messages'],
      'settings': ['users', 'departments', 'roles', 'typeSettings', 'operationLogs'],
      'employees': ['users'],
      'departments': ['departments'],
      'roles': ['roles'],
      'typeSettings': ['typeSettings'],
      'operationLogs': ['operationLogs']
    };

    return MODULE_COLLECTION_MAP[moduleId] || [];
  }

  /**
   * 扫描集合的字段信息
   * 
   * 策略：采样实际数据分析字段类型
   */
  static async scanFields(collection: string): Promise<FieldInfo[]> {
    console.log(`[MetadataCollector] 扫描集合 ${collection} 的字段...`);

    try {
      // 采样前10条数据
      const { data: samples } = await db.collection(collection)
        .limit(10)
        .get();

      if (samples.length === 0) {
        console.log(`[MetadataCollector] 集合 ${collection} 暂无数据`);
        return [];
      }

      // 分析字段
      const fields = this.analyzeFields(samples);
      console.log(`[MetadataCollector] 集合 ${collection} 找到 ${fields.length} 个字段`);

      return fields;
    } catch (error) {
      console.error(`[MetadataCollector] 扫描字段失败:`, error);
      return [];
    }
  }

  /**
   * 分析字段类型
   */
  private static analyzeFields(samples: any[]): FieldInfo[] {
    if (samples.length === 0) return [];

    const fieldMap = new Map<string, FieldInfo>();

    // 遍历所有样本
    samples.forEach(sample => {
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = this.getFieldType(value);

        if (!fieldMap.has(key)) {
          fieldMap.set(key, {
            name: key,
            type: type,
            description: this.generateFieldDescription(key)
          });
        }
      });
    });

    return Array.from(fieldMap.values());
  }

  /**
   * 获取字段类型
   */
  private static getFieldType(value: any): string {
    if (value === null || value === undefined) return 'unknown';

    const type = typeof value;

    if (type === 'object') {
      if (Array.isArray(value)) return 'array';
      if (value instanceof Date) return 'date';
      return 'object';
    }

    return type;
  }

  /**
   * 生成字段描述（根据字段名推测）
   */
  private static generateFieldDescription(fieldName: string): string {
    const descriptions: Record<string, string> = {
      '_id': '记录ID',
      '_openid': '用户OpenID',
      'name': '名称',
      'title': '标题',
      'description': '描述',
      'status': '状态',
      'type': '类型',
      'level': '级别',
      'priority': '优先级',
      'owner': '负责人',
      'createdBy': '创建人',
      'createdAt': '创建时间',
      'updatedAt': '更新时间',
      'startDate': '开始日期',
      'endDate': '结束日期',
      'amount': '金额',
      'progress': '进度',
      'isEnabled': '是否启用',
      'isPublic': '是否公开'
    };

    return descriptions[fieldName] || fieldName;
  }

  /**
   * 扫描前端路由
   * 
   * 策略：预定义的模块-路由映射
   */
  static scanRoutes(moduleId: string): string[] {
    console.log(`[MetadataCollector] 扫描模块 ${moduleId} 的路由...`);

    const MODULE_ROUTE_MAP: Record<string, string[]> = {
      'tasks': ['/task-management'],
      'issues': ['/issue-management'],
      'opportunities': ['/opportunity-management'],
      'projects': ['/project-management'],
      'meetings': ['/meeting-management'],
      'goal': ['/goal-management', '/goal-decomposition', '/execution-map'],
      'salesGoal': ['/goal-management'],
      'productOrder': ['/goal-management'],
      'strategy': ['/goal-management'],
      'outcome': ['/goal-management'],
      'decomposition': ['/goal-decomposition'],
      'executionMap': ['/execution-map'],
      'budget': ['/budget-management'],
      'annual': ['/budget-management'],
      'execution': ['/budget-execution'],
      'settings': ['/system-settings']
    };

    return MODULE_ROUTE_MAP[moduleId] || [];
  }

  /**
   * 扫描API接口
   * 
   * 策略：根据模块ID推测常用API
   */
  static scanApis(moduleId: string): string[] {
    console.log(`[MetadataCollector] 扫描模块 ${moduleId} 的API...`);

    // 通用CRUD API模式
    const collections = this.getMainCollection(moduleId);
    if (!collections) return [];

    return [
      `GET /api/${collections}`,
      `GET /api/${collections}/:id`,
      `POST /api/${collections}`,
      `PUT /api/${collections}/:id`,
      `DELETE /api/${collections}/:id`
    ];
  }

  /**
   * 获取模块的主集合名
   */
  private static getMainCollection(moduleId: string): string | null {
    const MAIN_COLLECTION_MAP: Record<string, string> = {
      'tasks': 'tasks',
      'issues': 'issueRecords',
      'opportunities': 'opportunities',
      'projects': 'projects',
      'meetings': 'meetings',
      'goal': 'goals',
      'budget': 'budgetSubjects'
    };

    return MAIN_COLLECTION_MAP[moduleId] || null;
  }

  /**
   * 获取集合的详细信息
   */
  static async getCollectionInfo(collection: string): Promise<CollectionInfo> {
    console.log(`[MetadataCollector] 获取集合 ${collection} 的详细信息...`);

    try {
      // 获取记录数
      const { total } = await db.collection(collection).count();

      // 获取字段信息
      const fields = await this.scanFields(collection);

      return {
        name: collection,
        recordCount: total,
        fields: fields
      };
    } catch (error) {
      console.error(`[MetadataCollector] 获取集合信息失败:`, error);
      return {
        name: collection,
        recordCount: 0,
        fields: []
      };
    }
  }

  /**
   * 扫描模块的完整元数据
   */
  static async scanModuleMetadata(moduleId: string) {
    console.log(`[MetadataCollector] 开始扫描模块 ${moduleId} 的完整元数据...`);

    try {
      // 1. 扫描数据库集合
      const collections = await this.scanCollections(moduleId);

      // 2. 扫描每个集合的字段
      const fields: Record<string, FieldInfo[]> = {};
      for (const collection of collections) {
        fields[collection] = await this.scanFields(collection);
      }

      // 3. 扫描路由
      const routes = this.scanRoutes(moduleId);

      // 4. 扫描API
      const apis = this.scanApis(moduleId);

      const metadata = {
        collections,
        fields,
        routes,
        apis
      };

      console.log(`[MetadataCollector] 模块 ${moduleId} 元数据扫描完成:`, {
        collectionsCount: collections.length,
        fieldsCount: Object.keys(fields).length,
        routesCount: routes.length,
        apisCount: apis.length
      });

      return metadata;
    } catch (error) {
      console.error(`[MetadataCollector] 扫描元数据失败:`, error);
      return {
        collections: [],
        fields: {},
        routes: [],
        apis: []
      };
    }
  }
}
