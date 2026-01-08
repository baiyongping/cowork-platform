# 功能模块管理 - 数据库设计文档

## 📁 集合列表

### 1. modulesConfig（功能模块配置）

**用途**: 存储系统功能模块的配置信息

**数据结构**:
```typescript
{
  _id: string;                    // 模块ID（如 'tasks', 'goal'）
  name: string;                   // 模块内部名称
  displayName: string;            // 显示名称（可修改）
  description: string;            // 功能描述
  icon?: string;                  // 图标名称
  parentId?: string;              // 父模块ID
  order: number;                  // 排序序号
  isEnabled: boolean;             // 是否启用
  isCustom: boolean;              // 是否自定义模块
  defaultPermission: string;      // 默认权限
  
  metadata: {
    collections: string[];        // 关联集合
    fields: object;               // 关联字段
    routes: string[];             // 关联路由
    apis: string[];               // 关联API
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
}
```

**索引**:
- `idx_order`: `{ order: 1 }` - 排序索引
- `idx_parent`: `{ parentId: 1, order: 1 }` - 父模块复合索引
- `idx_enabled`: `{ isEnabled: 1, order: 1 }` - 启用状态索引
- `idx_custom`: `{ isCustom: 1, isEnabled: 1 }` - 自定义模块索引

**权限规则**:
- 读取: 所有登录用户
- 写入/创建/删除: 仅通过云函数（管理员权限）

---

### 2. moduleMetadata（模块元数据）

**用途**: 自动采集的模块资源信息（集合、字段、路由、API）

**数据结构**:
```typescript
{
  _id: string;
  moduleId: string;               // 关联模块ID
  type: 'collection' | 'field' | 'route' | 'api';
  name: string;                   // 资源名称
  description?: string;           // 资源描述
  usageCount: number;             // 使用次数
  lastUsedAt: Date;               // 最后使用时间
  isActive: boolean;              // 是否活跃
  
  extra: {
    // 根据type不同而不同的额外信息
    indexInfo?: object;           // 索引信息（collection）
    dataVolume?: number;          // 数据量（collection）
    fieldType?: string;           // 字段类型（field）
    method?: string;              // HTTP方法（api）
    // ...更多字段
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

**索引**:
- `idx_module_type`: `{ moduleId: 1, type: 1 }` - 模块类型复合索引
- `idx_active`: `{ isActive: 1, lastUsedAt: -1 }` - 活跃状态索引
- `idx_usage`: `{ moduleId: 1, usageCount: -1 }` - 使用频率索引

**权限规则**:
- 读取: 所有登录用户
- 写入/创建: 仅系统自动写入
- 删除: 仅通过云函数（管理员权限）

---

## 🚀 初始化步骤

### 步骤1: 创建集合

```bash
# 方式1: 在 CloudBase 控制台手动创建
https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc

# 方式2: 运行初始化脚本（会提示手动创建）
node database/init/init-modules-collection.js
```

**需要创建的集合**:
1. `modulesConfig`
2. `moduleMetadata`

### 步骤2: 创建索引

在 CloudBase 控制台为每个集合创建索引：

**modulesConfig 索引**:
```json
[
  { "name": "idx_order", "keys": { "order": 1 } },
  { "name": "idx_parent", "keys": { "parentId": 1, "order": 1 } },
  { "name": "idx_enabled", "keys": { "isEnabled": 1, "order": 1 } },
  { "name": "idx_custom", "keys": { "isCustom": 1, "isEnabled": 1 } }
]
```

**moduleMetadata 索引**:
```json
[
  { "name": "idx_module_type", "keys": { "moduleId": 1, "type": 1 } },
  { "name": "idx_active", "keys": { "isActive": 1, "lastUsedAt": -1 } },
  { "name": "idx_usage", "keys": { "moduleId": 1, "usageCount": -1 } }
]
```

### 步骤3: 设置权限规则

**modulesConfig 权限**:
```json
{
  "read": "auth != null",
  "write": "get('database.modulesConfig.${doc._id}').createdBy == auth.uid && auth.uid == 'admin'",
  "create": "auth.uid == 'admin'",
  "delete": "auth.uid == 'admin'"
}
```

**moduleMetadata 权限**:
```json
{
  "read": "auth != null",
  "write": false,
  "create": false,
  "delete": "auth.uid == 'admin'"
}
```

### 步骤4: 导入初始数据

```bash
# 导入现有模块配置到数据库
node database/init/import-modules-data.js
```

---

## 📊 数据流转

```
配置文件 (constants/modules.ts)
    ↓
数据库导入 (modulesConfig)
    ↓
前端加载 (ModuleLoader)
    ↓
合并配置 (配置文件 + 数据库)
    ↓
渲染菜单 / 权限检查 / 路由注册
```

---

## 🔧 维护操作

### 新增模块
```javascript
// 通过云函数或管理界面
await db.collection('modulesConfig').add({
  data: {
    _id: 'newModule',
    name: 'newModule',
    displayName: '新模块',
    // ...其他字段
  }
});
```

### 更新模块
```javascript
await db.collection('modulesConfig')
  .doc('moduleId')
  .update({
    data: {
      displayName: '新名称',
      order: 10
    }
  });
```

### 查询模块
```javascript
// 获取所有启用的模块
const { data } = await db.collection('modulesConfig')
  .where({ isEnabled: true })
  .orderBy('order', 'asc')
  .get();

// 获取某个模块的子模块
const { data } = await db.collection('modulesConfig')
  .where({ parentId: 'goal' })
  .orderBy('order', 'asc')
  .get();
```

---

## ⚠️ 注意事项

1. **模块ID不可修改**: `_id` 字段一旦创建不可修改，作为模块的唯一标识
2. **权限控制**: 所有写操作必须通过云函数进行，不允许前端直接写入
3. **元数据自动采集**: `moduleMetadata` 集合由系统自动维护，不建议手动修改
4. **排序序号**: `order` 字段决定模块在菜单中的显示顺序，建议预留间隔（如 10, 20, 30）
5. **数据同步**: 修改配置后需要清除前端缓存或刷新页面

---

## 📚 相关文档

- 集合配置: `database/collections/modulesConfig.js`
- 集合配置: `database/collections/moduleMetadata.js`
- 初始化脚本: `database/init/init-modules-collection.js`
- 数据导入脚本: `database/init/import-modules-data.js`

---

**版本**: v1.0  
**更新日期**: 2026-01-08
