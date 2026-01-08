# 模块排序数据结构设计

## 集合名称
`moduleOrder`

## 集合说明
用于存储功能模块的自定义排序信息，同时支持一级模块和二级功能的顺序调整。

## 数据结构

```typescript
interface ModuleOrder {
  _id: string;              // 自动生成的文档ID
  moduleCode: string;       // 模块代码 (如 'dashboard', 'tasks', 'goal.salesGoal')
  order: number;            // 排序值（越小越靠前）
  level: number;            // 层级 (1=一级模块, 2=二级功能)
  parentCode: string | null; // 父模块代码（一级模块为null，二级功能为父模块code）
  updatedAt: Date;          // 最后更新时间
}
```

## 字段详情

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| `moduleCode` | string | 是 | 模块唯一标识 | `'dashboard'`, `'goal.salesGoal'` |
| `order` | number | 是 | 排序值，从0开始 | `0`, `1`, `2`, ... |
| `level` | number | 是 | 模块层级 | `1` (一级), `2` (二级) |
| `parentCode` | string \| null | 是 | 父模块代码 | `null`, `'goal'`, `'budget'` |
| `updatedAt` | Date | 是 | 最后更新时间 | ISO日期 |

## 示例数据

```javascript
// 一级模块（工作台）
{
  _id: "module_order_001",
  moduleCode: "dashboard",
  order: 0,
  level: 1,
  parentCode: null,
  updatedAt: new Date("2025-01-08T10:00:00Z")
}

// 一级模块（目标管理）
{
  _id: "module_order_002",
  moduleCode: "goal",
  order: 5,
  level: 1,
  parentCode: null,
  updatedAt: new Date("2025-01-08T10:00:00Z")
}

// 二级功能（销售目标）
{
  _id: "module_order_003",
  moduleCode: "goal.salesGoal",
  order: 0,
  level: 2,
  parentCode: "goal",
  updatedAt: new Date("2025-01-08T10:00:00Z")
}

// 二级功能（商机目标）
{
  _id: "module_order_004",
  moduleCode: "goal.opportunityGoal",
  order: 1,
  level: 2,
  parentCode: "goal",
  updatedAt: new Date("2025-01-08T10:00:00Z")
}
```

## 初始化数据

```javascript
const initialModuleOrder = [
  // 一级模块
  { moduleCode: 'dashboard', order: 0, level: 1, parentCode: null },
  { moduleCode: 'tasks', order: 1, level: 1, parentCode: null },
  { moduleCode: 'issues', order: 2, level: 1, parentCode: null },
  { moduleCode: 'opportunities', order: 3, level: 1, parentCode: null },
  { moduleCode: 'projects', order: 4, level: 1, parentCode: null },
  { moduleCode: 'goal', order: 5, level: 1, parentCode: null },
  { moduleCode: 'budget', order: 6, level: 1, parentCode: null },
  { moduleCode: 'meetings', order: 7, level: 1, parentCode: null },
  { moduleCode: 'performance', order: 8, level: 1, parentCode: null },
  { moduleCode: 'business', order: 9, level: 1, parentCode: null },
  { moduleCode: 'moduleManagement', order: 10, level: 1, parentCode: null },
  { moduleCode: 'settings', order: 11, level: 1, parentCode: null },
  
  // 目标管理二级功能
  { moduleCode: 'goal.salesGoal', order: 0, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.opportunityGoal', order: 1, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.productOrder', order: 2, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.strategy', order: 3, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.outcome', order: 4, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.decomposition', order: 5, level: 2, parentCode: 'goal' },
  { moduleCode: 'goal.execution', order: 6, level: 2, parentCode: 'goal' },
  
  // 预算管理二级功能
  { moduleCode: 'budget.annual', order: 0, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.execution', order: 1, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.asset', order: 2, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.hr', order: 3, level: 2, parentCode: 'budget' },
  { moduleCode: 'budget.parameters', order: 4, level: 2, parentCode: 'budget' },
  
  // 系统设置二级功能
  { moduleCode: 'settings.userApproval', order: 0, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.employees', order: 1, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.departments', order: 2, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.roles', order: 3, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.typeSettings', order: 4, level: 2, parentCode: 'settings' },
  { moduleCode: 'settings.operationLogs', order: 5, level: 2, parentCode: 'settings' }
];
```

## 查询规则

### 1. 获取所有一级模块（按order排序）
```javascript
db.collection('moduleOrder')
  .where({ level: 1 })
  .orderBy('order', 'asc')
  .get()
```

### 2. 获取指定父模块的所有二级功能（按order排序）
```javascript
db.collection('moduleOrder')
  .where({ 
    level: 2,
    parentCode: 'goal'  // 例如：目标管理
  })
  .orderBy('order', 'asc')
  .get()
```

### 3. 获取指定模块的order值
```javascript
db.collection('moduleOrder')
  .where({ moduleCode: 'tasks' })
  .get()
```

## 更新规则

### 拖拽交换顺序
```javascript
// 1. 获取被拖拽模块和目标模块的order值
const draggedOrder = draggedModule.order;  // 例如: 2
const targetOrder = targetModule.order;    // 例如: 5

// 2. 交换order值
await db.collection('moduleOrder')
  .where({ moduleCode: draggedModule.code })
  .update({
    order: targetOrder,
    updatedAt: new Date()
  });

await db.collection('moduleOrder')
  .where({ moduleCode: targetModule.code })
  .update({
    order: draggedOrder,
    updatedAt: new Date()
  });
```

## 索引建议

```javascript
// 1. 模块代码索引（唯一）
db.collection('moduleOrder').createIndex({ moduleCode: 1 }, { unique: true });

// 2. 层级和排序组合索引
db.collection('moduleOrder').createIndex({ level: 1, order: 1 });

// 3. 父模块和排序组合索引
db.collection('moduleOrder').createIndex({ parentCode: 1, order: 1 });
```

## 权限规则

```json
{
  "read": "auth.uid != null",
  "write": "get('database.users.$(auth.uid).role') == 'admin'"
}
```

## 注意事项

1. **唯一性**：`moduleCode` 必须唯一
2. **连续性**：同一层级/父模块下的 `order` 值建议连续（0, 1, 2, 3...）
3. **更新时间**：每次修改 `order` 时都要更新 `updatedAt`
4. **初始化**：首次使用时需要运行初始化脚本创建所有记录
5. **权限控制**：只有管理员可以修改排序
