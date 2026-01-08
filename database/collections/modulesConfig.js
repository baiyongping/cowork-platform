/**
 * modulesConfig 集合配置
 * 功能模块配置集合 - 存储系统功能模块的配置信息
 * 
 * 版本: v1.0
 * 创建日期: 2026-01-08
 */

const collection = {
  name: 'modulesConfig',
  description: '功能模块配置集合',
  
  // 集合结构定义
  schema: {
    _id: 'string',                    // 模块唯一ID（与constants/modules.ts中的id对应）
    name: 'string',                   // 模块内部名称（不变）
    displayName: 'string',            // 显示名称（可修改）
    description: 'string',            // 功能描述
    icon: 'string?',                  // 图标（可选）
    parentId: 'string?',              // 父模块ID（二级功能）
    order: 'number',                  // 排序序号
    isEnabled: 'boolean',             // 是否启用
    isCustom: 'boolean',              // 是否自定义模块（非配置文件中的）
    defaultPermission: 'string',      // 默认权限级别（view_only/view_create/full_permission）
    
    // 元数据信息
    metadata: {
      collections: ['string'],        // 关联的数据库集合
      fields: 'object',               // 关联的字段信息 { collection: [{ name, type, description }] }
      routes: ['string'],             // 关联的前端路由
      apis: ['string']                // 关联的API接口
    },
    
    // 系统字段
    createdAt: 'date',
    updatedAt: 'date',
    createdBy: 'string',
    lastModifiedBy: 'string'
  },
  
  // 索引配置
  indexes: [
    {
      name: 'idx_order',
      keys: { order: 1 },
      description: '排序索引'
    },
    {
      name: 'idx_parent',
      keys: { parentId: 1, order: 1 },
      description: '父模块和排序复合索引'
    },
    {
      name: 'idx_enabled',
      keys: { isEnabled: 1, order: 1 },
      description: '启用状态和排序复合索引'
    },
    {
      name: 'idx_custom',
      keys: { isCustom: 1, isEnabled: 1 },
      description: '自定义模块查询索引'
    }
  ],
  
  // 权限配置
  permissions: {
    read: true,      // 所有登录用户可读
    write: false,    // 仅管理员可写（通过云函数控制）
    create: false,   // 仅管理员可创建
    delete: false    // 仅管理员可删除
  },
  
  // 示例数据
  examples: [
    {
      _id: 'tasks',
      name: 'tasks',
      displayName: '任务管理',
      description: '任务的创建、分配、跟踪和管理',
      icon: 'CheckSquare',
      parentId: null,
      order: 1,
      isEnabled: true,
      isCustom: false,
      defaultPermission: 'view_create',
      metadata: {
        collections: ['tasks', 'taskComments'],
        fields: {
          tasks: [
            { name: 'name', type: 'string', description: '任务名称' },
            { name: 'status', type: 'string', description: '任务状态' },
            { name: 'priority', type: 'string', description: '优先级' }
          ]
        },
        routes: ['/task-management'],
        apis: ['POST /api/tasks', 'GET /api/tasks', 'PUT /api/tasks/:id']
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      lastModifiedBy: 'system'
    },
    {
      _id: 'salesGoal',
      name: 'salesGoal',
      displayName: '销售目标',
      description: '销售目标管理(已合并商机目标)',
      icon: null,
      parentId: 'goal',
      order: 1,
      isEnabled: true,
      isCustom: false,
      defaultPermission: 'view_create',
      metadata: {
        collections: ['goals'],
        fields: {},
        routes: [],
        apis: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      lastModifiedBy: 'system'
    }
  ]
};

module.exports = collection;
