/**
 * moduleMetadata 集合配置
 * 模块元数据集合 - 自动采集的模块资源信息
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-08
 */

const collection = {
  name: 'moduleMetadata',
  description: '模块元数据集合（自动采集）',
  
  // 集合结构定义
  schema: {
    _id: 'string',                    // 自动生成
    moduleId: 'string',               // 关联模块ID
    type: 'string',                   // 资源类型: collection/field/route/api
    name: 'string',                   // 资源名称
    description: 'string?',           // 资源描述
    usageCount: 'number',             // 使用次数
    lastUsedAt: 'date',               // 最后使用时间
    isActive: 'boolean',              // 是否活跃
    
    // 额外信息（根据type不同而不同）
    extra: {
      // type=collection时
      indexInfo: 'object?',           // 索引信息
      dataVolume: 'number?',          // 数据量
      performance: 'object?',         // 性能指标
      
      // type=field时
      fieldType: 'string?',           // 字段类型
      isRequired: 'boolean?',         // 是否必填
      defaultValue: 'any?',           // 默认值
      
      // type=route时
      component: 'string?',           // 组件路径
      requireAuth: 'boolean?',        // 是否需要认证
      
      // type=api时
      method: 'string?',              // HTTP方法
      endpoint: 'string?',            // 端点路径
      responseTime: 'number?'         // 平均响应时间
    },
    
    createdAt: 'date',
    updatedAt: 'date'
  },
  
  // 索引配置
  indexes: [
    {
      name: 'idx_module_type',
      keys: { moduleId: 1, type: 1 },
      description: '模块和类型复合索引'
    },
    {
      name: 'idx_active',
      keys: { isActive: 1, lastUsedAt: -1 },
      description: '活跃状态和使用时间索引'
    },
    {
      name: 'idx_usage',
      keys: { moduleId: 1, usageCount: -1 },
      description: '使用频率索引'
    }
  ],
  
  // 权限配置
  permissions: {
    read: true,      // 所有登录用户可读
    write: false,    // 仅系统自动写入
    create: false,   // 仅系统自动创建
    delete: false    // 仅管理员可删除
  },
  
  // 示例数据
  examples: [
    {
      moduleId: 'tasks',
      type: 'collection',
      name: 'tasks',
      description: '任务主表',
      usageCount: 1250,
      lastUsedAt: new Date(),
      isActive: true,
      extra: {
        indexInfo: {
          indexes: [
            { name: '_id_', keys: { _id: 1 } },
            { name: 'owner_1', keys: { owner: 1 } },
            { name: 'status_1_level_1', keys: { status: 1, level: 1 } }
          ]
        },
        dataVolume: 1205,
        performance: {
          avgQueryTime: 45,
          avgInsertTime: 12
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      moduleId: 'tasks',
      type: 'field',
      name: 'name',
      description: '任务名称',
      usageCount: 1205,
      lastUsedAt: new Date(),
      isActive: true,
      extra: {
        fieldType: 'string',
        isRequired: true,
        defaultValue: null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      moduleId: 'tasks',
      type: 'route',
      name: '/task-management',
      description: '任务管理页面',
      usageCount: 856,
      lastUsedAt: new Date(),
      isActive: true,
      extra: {
        component: 'components/pages/TaskManagementPage.tsx',
        requireAuth: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      moduleId: 'tasks',
      type: 'api',
      name: 'GET /api/tasks',
      description: '获取任务列表',
      usageCount: 2345,
      lastUsedAt: new Date(),
      isActive: true,
      extra: {
        method: 'GET',
        endpoint: '/api/tasks',
        responseTime: 125
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

module.exports = collection;
