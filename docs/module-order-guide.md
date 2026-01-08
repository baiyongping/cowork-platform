# 模块排序功能使用指南

## 功能说明

模块排序功能允许管理员通过拖拽的方式自定义调整功能模块的显示顺序，排序结果会保存到数据库，并且影响：

1. **功能模块管理页面**：左侧模块列表按自定义顺序显示
2. **侧边栏（Sidebar）**：功能面板按自定义顺序显示

## 特性

✅ **拖拽排序**：支持鼠标拖拽交换模块顺序  
✅ **层级隔离**：一级模块和二级功能分别排序，不能跨层级拖拽  
✅ **父模块隔离**：不同父模块的二级功能不能跨父模块拖拽  
✅ **实时保存**：拖拽完成后立即保存到数据库  
✅ **全局生效**：排序后，所有用户看到的菜单顺序都会更新

## 使用步骤

### 1️⃣ 初始化排序数据（首次使用）

在首次使用排序功能前，需要运行初始化脚本创建排序数据：

```bash
# 切换到项目目录
cd d:\project\cowork12-21

# 运行初始化脚本
node database/init-module-order.js
```

**输出示例**：
```
🔍 检查 moduleOrder 集合是否已有数据...
✅ moduleOrder 集合为空，开始初始化...
✅ 初始化完成！共插入 31 条记录
   - 一级模块: 12 个
   - 二级功能: 19 个

📊 验证结果: moduleOrder 集合共有 31 条记录

🎉 脚本执行完成
```

### 2️⃣ 调整模块顺序

1. 登录系统（管理员账号）
2. 进入"功能模块"页面
3. 在左侧模块列表中：
   - **鼠标悬停**：看到拖拽手柄图标 `⋮⋮`
   - **按住拖拽**：拖动模块到目标位置
   - **松开鼠标**：自动交换顺序并保存

### 3️⃣ 验证效果

调整顺序后：

1. **功能模块页面**：左侧列表立即按新顺序显示
2. **侧边栏（Sidebar）**：刷新页面后，功能面板按新顺序显示

## 排序规则

### ✅ 允许的操作

| 操作 | 说明 | 示例 |
|-----|------|-----|
| 一级模块之间拖拽 | 调整一级模块顺序 | "任务管理" ↔ "商机管理" |
| 同一父模块下的二级功能拖拽 | 调整同一父模块内的二级功能顺序 | "销售目标" ↔ "商机目标"（都在目标管理下） |

### ❌ 禁止的操作

| 操作 | 说明 | 错误提示 |
|-----|------|---------|
| 跨层级拖拽 | 一级模块和二级功能不能互换 | "不能跨层级拖拽" |
| 跨父模块拖拽 | 不同父模块的二级功能不能互换 | "不能跨父模块拖拽" |

## 数据结构

### 集合名称
`moduleOrder`

### 字段说明

```typescript
{
  _id: string;              // 文档ID
  moduleCode: string;       // 模块代码（如 'dashboard', 'goal.salesGoal'）
  order: number;            // 排序值（越小越靠前）
  level: number;            // 层级（1=一级模块, 2=二级功能）
  parentCode: string | null; // 父模块代码（一级模块为null）
  updatedAt: Date;          // 最后更新时间
}
```

### 示例数据

```javascript
// 工作台（一级模块，排序0）
{
  moduleCode: "dashboard",
  order: 0,
  level: 1,
  parentCode: null
}

// 目标管理（一级模块，排序5）
{
  moduleCode: "goal",
  order: 5,
  level: 1,
  parentCode: null
}

// 销售目标（二级功能，在目标管理下，排序0）
{
  moduleCode: "goal.salesGoal",
  order: 0,
  level: 2,
  parentCode: "goal"
}
```

## 默认排序

### 一级模块（按order值）

```
0  - 工作台（dashboard）
1  - 任务管理（tasks）
2  - 问题管理（issues）
3  - 商机管理（opportunities）
4  - 项目管理（projects）
5  - 目标管理（goal）
6  - 预算管理（budget）
7  - 例会管理（meetings）
8  - 绩效管理（performance）
9  - 业务管理（business）
10 - 功能模块（moduleManagement）
11 - 系统设置（settings）
```

### 目标管理二级功能

```
0 - 销售目标（goal.salesGoal）
1 - 商机目标（goal.opportunityGoal）
2 - 产品订单预测（goal.productOrder）
3 - 年度策略（goal.strategy）
4 - 成果目标（goal.outcome）
5 - 目标分解（goal.decomposition）
6 - 执行力地图（goal.execution）
```

### 预算管理二级功能

```
0 - 年度预算（budget.annual）
1 - 预算执行（budget.execution）
2 - 资产预算（budget.asset）
3 - 薪酬预算（budget.hr）
4 - 预算参数（budget.parameters）
```

### 系统设置二级功能

```
0 - 用户审核（settings.userApproval）
1 - 员工管理（settings.employees）
2 - 部门管理（settings.departments）
3 - 角色权限（settings.roles）
4 - 类型设置（settings.typeSettings）
5 - 操作日志（settings.operationLogs）
```

## 技术实现

### 拖拽交换算法

```javascript
// 1. 获取被拖拽模块和目标模块的order值
const draggedOrder = draggedModule.order;  // 例如: 2
const targetOrder = targetModule.order;    // 例如: 5

// 2. 交换order值（在数据库中更新）
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

### 查询排序

**获取一级模块（按order排序）**：
```javascript
db.collection('moduleOrder')
  .where({ level: 1 })
  .orderBy('order', 'asc')
  .get()
```

**获取指定父模块的二级功能（按order排序）**：
```javascript
db.collection('moduleOrder')
  .where({ 
    level: 2,
    parentCode: 'goal'  // 例如：目标管理
  })
  .orderBy('order', 'asc')
  .get()
```

## 常见问题

### Q1: 拖拽无反应？
**A**: 确保：
1. 已登录管理员账号
2. 已运行初始化脚本（`node database/init-module-order.js`）
3. 浏览器支持拖拽（现代浏览器）

### Q2: 跨层级拖拽失败？
**A**: 这是设计行为，不允许跨层级拖拽。一级模块和二级功能需要分别排序。

### Q3: 跨父模块拖拽失败？
**A**: 这是设计行为，不同父模块的二级功能不能互换。例如："销售目标"（目标管理下）不能拖到预算管理下。

### Q4: 调整后侧边栏没变化？
**A**: 刷新浏览器页面（F5 或 Ctrl+R），侧边栏会重新读取排序信息。

### Q5: 如何重置为默认顺序？
**A**: 
1. 删除 moduleOrder 集合中的所有数据
2. 重新运行初始化脚本：`node database/init-module-order.js`

## 权限要求

- **查看排序**：所有登录用户
- **调整排序**：只有管理员可以拖拽调整
- **数据库写入**：只有管理员角色

## 文件位置

| 文件 | 说明 |
|-----|------|
| `database/module-order-schema.md` | 数据结构设计文档 |
| `database/init-module-order.js` | 初始化脚本 |
| `components/pages/ModuleManagement.tsx` | 功能模块管理页面（实现拖拽） |
| `components/Sidebar.tsx` | 侧边栏（读取排序显示） |
| `docs/module-order-guide.md` | 本使用指南 |

## 更新日志

- **v3.10.0** (2025-01-08)
  - ✅ 新增模块排序功能
  - ✅ 支持拖拽交换顺序
  - ✅ 数据库持久化存储
  - ✅ Sidebar按排序显示

---

**版本**: v3.10.0  
**更新日期**: 2025-01-08  
**维护者**: 际华协同办公平台开发团队
