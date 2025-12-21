# 际华定制协同办公管理平台 - MongoDB 数据库设计

## 数据库概述

**数据库类型**: MongoDB (腾讯云文档数据库)  
**数据库名称**: `jihua_oa_platform`  
**设计原则**: 
- 遵循MongoDB文档型数据库特点
- 合理使用嵌套文档和引用
- 考虑查询性能和数据一致性
- 支持水平扩展

---

## 集合列表 (Collections)

1. **users** - 用户表
2. **departments** - 部门表
3. **roles** - 角色权限表
4. **tasks** - 任务表
5. **opportunities** - 商机表
6. **projects** - 项目表
7. **goals** - 目标表
8. **strategies** - 年度策略表
9. **measures** - 季度措施表
10. **system_configs** - 系统配置表
11. **operation_logs** - 操作日志表
12. **comments** - 评论表
13. **notifications** - 通知表

---

## 详细集合设计

### 1. users (用户表)

```javascript
{
  _id: ObjectId("..."),
  username: String,           // 用户名（唯一）
  password: String,           // 密码（加密存储）
  name: String,               // 姓名
  email: String,              // 邮箱
  phone: String,              // 手机号
  avatar: String,             // 头像URL
  departmentId: ObjectId,     // 所属部门ID（引用departments）
  roleIds: [ObjectId],        // 角色ID数组（引用roles）
  position: String,           // 职位
  status: String,             // 状态：在职、离职、休假
  isActive: Boolean,          // 是否激活
  lastLoginTime: Date,        // 最后登录时间
  createdBy: ObjectId,        // 创建人ID
  createdAt: Date,            // 创建时间
  updatedAt: Date             // 更新时间
}

// 索引
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ departmentId: 1 })
db.users.createIndex({ email: 1 })
db.users.createIndex({ status: 1, isActive: 1 })
```

### 2. departments (部门表)

```javascript
{
  _id: ObjectId("..."),
  name: String,               // 部门名称
  code: String,               // 部门编码（唯一）
  leaderId: ObjectId,         // 部门负责人ID（引用users）
  parentId: ObjectId,         // 父部门ID（支持多级部门）
  level: Number,              // 部门层级
  description: String,        // 部门描述
  memberCount: Number,        // 成员数量（冗余字段，提升查询性能）
  status: String,             // 状态：正常、停用
  createdAt: Date,
  updatedAt: Date
}

// 索引
db.departments.createIndex({ code: 1 }, { unique: true })
db.departments.createIndex({ leaderId: 1 })
db.departments.createIndex({ parentId: 1 })
```

### 3. roles (角色权限表)

```javascript
{
  _id: ObjectId("..."),
  name: String,               // 角色名称
  code: String,               // 角色编码（唯一）
  description: String,        // 角色描述
  permissions: [              // 权限列表（嵌套文档）
    {
      module: String,         // 模块：tasks, opportunities, projects, goals, settings
      actions: [String]       // 操作：view, create, edit, delete, export
    }
  ],
  level: Number,              // 角色级别：1-超级管理员, 2-高层领导, 3-部门经理, 4-普通员工
  isSystem: Boolean,          // 是否系统内置角色
  status: String,             // 状态：启用、停用
  userCount: Number,          // 使用该角色的用户数（冗余）
  createdAt: Date,
  updatedAt: Date
}

// 索引
db.roles.createIndex({ code: 1 }, { unique: true })
db.roles.createIndex({ level: 1 })
```

### 4. tasks (任务表)

```javascript
{
  _id: ObjectId("..."),
  name: String,               // 任务名称
  description: String,        // 任务描述
  level: String,              // 任务级别：公司级、团队级、个人级
  type: String,               // 任务类型：日常工作、商机跟进、项目任务
  status: String,             // 任务状态（动态，根据type）
  priority: String,           // 优先级：高、中、低
  progress: Number,           // 完成进度 0-100
  
  // 人员相关
  ownerId: ObjectId,          // 负责人ID（引用users）
  ownerName: String,          // 负责人姓名（冗余，提升查询）
  collaboratorIds: [ObjectId], // 协同人ID数组
  collaborators: [            // 协同人详情（嵌套）
    {
      userId: ObjectId,
      name: String,
      addedAt: Date
    }
  ],
  
  // 关联信息
  teamId: ObjectId,           // 所属团队/部门ID
  opportunityId: ObjectId,    // 关联商机ID（type为商机跟进时）
  opportunityActionType: String, // 商机跟进动作类型
  projectId: ObjectId,        // 关联项目ID（type为项目任务时）
  projectPhase: String,       // 项目任务环节
  
  // 时间相关
  startDate: Date,            // 开始日期
  endDate: Date,              // 截止日期
  completedDate: Date,        // 完成日期
  
  // 其他
  isPublic: Boolean,          // 是否公开
  tags: [String],             // 标签
  attachments: [              // 附件
    {
      name: String,
      url: String,
      size: Number,
      uploadedBy: ObjectId,
      uploadedAt: Date
    }
  ],
  
  // 统计字段
  commentCount: Number,       // 评论数（冗余）
  viewCount: Number,          // 查看次数
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date             // 软删除
}

// 索引
db.tasks.createIndex({ ownerId: 1, status: 1 })
db.tasks.createIndex({ level: 1, type: 1 })
db.tasks.createIndex({ opportunityId: 1 })
db.tasks.createIndex({ projectId: 1 })
db.tasks.createIndex({ endDate: 1, status: 1 })
db.tasks.createIndex({ createdAt: -1 })
db.tasks.createIndex({ collaboratorIds: 1 })
```

### 5. opportunities (商机表)

```javascript
{
  _id: ObjectId("..."),
  name: String,               // 商机名称
  code: String,               // 商机编号（自动生成）
  
  // 客户信息
  customer: {
    name: String,             // 客户名称
    contactPerson: String,    // 联系人
    contactPhone: String,     // 联系电话
    contactEmail: String,     // 联系邮箱
    address: String,          // 客户地址
    type: String              // 客户类型：央企、国企、民企
  },
  
  // 商机信息
  stage: String,              // 商机阶段：跟进线索、方案咨询、商务谈判、已成交
  previousStage: String,      // 上一阶段（用于阶段变更追踪）
  productType: String,        // 产品类型：西服套装、衬衫、工装等
  expectedQuantity: Number,   // 预期数量
  expectedRevenue: Number,    // 预期金额（万元）
  probability: Number,        // 成功概率 0-100
  
  // 负责人
  salesManagerId: ObjectId,   // 销售经理ID
  salesManagerName: String,   // 销售经理姓名（冗余）
  collaboratorIds: [ObjectId], // 协同人ID数组
  
  // 时间相关
  createDate: Date,           // 创建日期
  expectedCloseDate: Date,    // 预计成交日期
  actualCloseDate: Date,      // 实际成交日期
  lastFollowUpDate: Date,     // 最后跟进日期
  nextFollowUpDate: Date,     // 下次跟进日期
  
  // 跟进记录（嵌套文档数组）
  followUpRecords: [
    {
      _id: ObjectId("..."),
      date: Date,
      actionType: String,     // 动作类型
      content: String,        // 跟进内容
      userId: ObjectId,
      userName: String,
      attachments: [String],
      createdAt: Date
    }
  ],
  
  // 转化信息
  isConverted: Boolean,       // 是否已转化为项目
  convertedProjectId: ObjectId, // 转化后的项目ID
  convertedDate: Date,        // 转化日期
  
  // 失败信息
  isFailed: Boolean,          // 是否失败
  failReason: String,         // 失败原因
  failDate: Date,             // 失败日期
  
  // 统计
  taskCount: Number,          // 关联任务数
  followUpCount: Number,      // 跟进次数
  
  status: String,             // 状态：进行中、已成交、已失败、已暂停
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
}

// 索引
db.opportunities.createIndex({ code: 1 }, { unique: true })
db.opportunities.createIndex({ stage: 1, status: 1 })
db.opportunities.createIndex({ salesManagerId: 1 })
db.opportunities.createIndex({ "customer.name": 1 })
db.opportunities.createIndex({ expectedCloseDate: 1 })
db.opportunities.createIndex({ createdAt: -1 })
db.opportunities.createIndex({ isConverted: 1 })
```

### 6. projects (项目表)

```javascript
{
  _id: ObjectId("..."),
  name: String,               // 项目名称
  code: String,               // 项目编号（自动生成）
  
  // 客户信息
  customer: {
    name: String,
    contactPerson: String,
    contactPhone: String,
    address: String
  },
  
  // 项目信息
  status: String,             // 项目状态：未开始、准备期、制造期、交付期、已完成、暂停
  productType: String,        // 产品类型
  quantity: Number,           // 订单数量
  amount: Number,             // 订单金额（万元）
  
  // 负责人
  managerId: ObjectId,        // 项目经理ID
  managerName: String,        // 项目经理姓名（冗余）
  teamMembers: [              // 团队成员
    {
      userId: ObjectId,
      name: String,
      role: String,           // 角色：设计、生产、质检等
      joinDate: Date
    }
  ],
  
  // 时间信息
  startDate: Date,            // 项目开始日期
  deliveryDate: Date,         // 计划交付日期
  actualDeliveryDate: Date,   // 实际交付日期
  
  // 阶段任务（嵌套文档）
  phases: [
    {
      name: String,           // 阶段名称：准备期、制造期、交付期
      status: String,         // 阶段状态
      tasks: [                // 阶段内任务
        {
          taskId: ObjectId,
          name: String,
          phase: String,      // 具体环节
          progress: Number
        }
      ],
      startDate: Date,
      endDate: Date,
      actualEndDate: Date
    }
  ],
  
  // 进度
  progress: Number,           // 总体进度 0-100
  
  // 来源
  sourceOpportunityId: ObjectId, // 来源商机ID
  sourceOpportunityName: String,
  
  // 合同信息
  contract: {
    number: String,           // 合同编号
    signDate: Date,           // 签订日期
    amount: Number,           // 合同金额
    attachmentUrl: String     // 合同附件
  },
  
  // 统计
  taskCount: Number,          // 任务数量
  completedTaskCount: Number, // 已完成任务数
  
  // 备注
  description: String,
  remark: String,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
}

// 索引
db.projects.createIndex({ code: 1 }, { unique: true })
db.projects.createIndex({ status: 1 })
db.projects.createIndex({ managerId: 1 })
db.projects.createIndex({ deliveryDate: 1 })
db.projects.createIndex({ sourceOpportunityId: 1 })
db.projects.createIndex({ createdAt: -1 })
```

### 7. goals (目标表)

```javascript
{
  _id: ObjectId("..."),
  year: Number,               // 目标年份
  quarter: String,            // 季度：Q1, Q2, Q3, Q4, annual
  type: String,               // 目标类型：sales（销售）, opportunity（商机）
  
  // 销售目标
  salesGoal: {
    orderTarget: Number,      // 订单承揽目标（万元）
    orderActual: Number,      // 实际订单承揽
    revenueTarget: Number,    // 收入目标（万元）
    revenueActual: Number,    // 实际收入
    completionRate: Number    // 完成率（%）
  },
  
  // 商机目标
  opportunityGoal: {
    countTarget: Number,      // 商机数量目标
    countActual: Number,      // 实际商机数量
    amountTarget: Number,     // 商机金额目标（万元）
    amountActual: Number,     // 实际商机金额
    conversionRate: Number    // 转化率（%）
  },
  
  // 部门目标分解
  departmentGoals: [
    {
      departmentId: ObjectId,
      departmentName: String,
      target: Number,
      actual: Number,
      weight: Number          // 权重
    }
  ],
  
  // 个人目标分解
  personalGoals: [
    {
      userId: ObjectId,
      userName: String,
      target: Number,
      actual: Number
    }
  ],
  
  status: String,             // 状态：进行中、已完成
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// 索引
db.goals.createIndex({ year: 1, quarter: 1, type: 1 }, { unique: true })
db.goals.createIndex({ year: -1 })
```

### 8. strategies (年度策略表)

```javascript
{
  _id: ObjectId("..."),
  year: Number,               // 年份
  content: String,            // 策略内容
  description: String,        // 详细描述
  ownerId: ObjectId,          // 负责人ID
  ownerName: String,          // 负责人姓名
  weight: Number,             // 权重（%）
  status: String,             // 状态：未开始、进行中、已完成
  progress: Number,           // 完成进度 0-100
  
  // 关联的季度措施数量
  measureCount: Number,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// 索引
db.strategies.createIndex({ year: 1 })
db.strategies.createIndex({ ownerId: 1 })
```

### 9. measures (季度措施表)

```javascript
{
  _id: ObjectId("..."),
  year: Number,               // 年份
  quarter: String,            // 季度：Q1, Q2, Q3, Q4
  strategyId: ObjectId,       // 关联的年度策略ID
  strategyContent: String,    // 策略内容（冗余）
  content: String,            // 措施内容
  description: String,        // 详细描述
  ownerId: ObjectId,          // 负责人ID
  ownerName: String,          // 负责人姓名
  status: String,             // 状态：未开始、进行中、已完成
  progress: Number,           // 完成进度 0-100
  startDate: Date,
  endDate: Date,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// 索引
db.measures.createIndex({ year: 1, quarter: 1 })
db.measures.createIndex({ strategyId: 1 })
db.measures.createIndex({ ownerId: 1 })
```

### 10. system_configs (系统配置表)

```javascript
{
  _id: ObjectId("..."),
  category: String,           // 配置分类
  key: String,                // 配置键（唯一）
  value: Mixed,               // 配置值（可以是任意类型）
  dataType: String,           // 数据类型：string, number, array, object
  description: String,        // 配置说明
  isEditable: Boolean,        // 是否可编辑
  sort: Number,               // 排序
  createdAt: Date,
  updatedAt: Date
}

// 预置配置数据
// 任务类型
{
  category: "task",
  key: "task_types",
  value: ["日常工作", "商机跟进", "项目任务"],
  dataType: "array"
}

// 任务状态
{
  category: "task",
  key: "task_statuses",
  value: ["未开始", "进行中", "已完成", "延期", "取消", "暂停"],
  dataType: "array"
}

// 商机阶段
{
  category: "opportunity",
  key: "opportunity_stages",
  value: ["跟进线索", "方案咨询", "商务谈判"],
  dataType: "array"
}

// 商机跟进动作类型
{
  category: "opportunity",
  key: "action_types",
  value: ["拜访客户", "联络客户感情", "了解年度采购计划", ...],
  dataType: "array"
}

// 项目状态
{
  category: "project",
  key: "project_statuses",
  value: ["未开始", "准备期", "制造期", "交付期", "已完成", "暂停"],
  dataType: "array"
}

// 项目环节
{
  category: "project",
  key: "project_phases",
  value: {
    preparation: ["物料采购", "样衣生产", "量体数据采集"],
    production: ["缝制生产", "质量检验", "产品入库"],
    delivery: ["物流配送", "产品交付", "售后服务"]
  },
  dataType: "object"
}

// 索引
db.system_configs.createIndex({ key: 1 }, { unique: true })
db.system_configs.createIndex({ category: 1 })
```

### 11. operation_logs (操作日志表)

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId,           // 操作人ID
  userName: String,           // 操作人姓名
  action: String,             // 操作类型：create, update, delete, login, logout
  module: String,             // 模块：tasks, opportunities, projects, goals, settings
  targetId: ObjectId,         // 目标对象ID
  targetType: String,         // 目标类型
  targetName: String,         // 目标名称
  description: String,        // 操作描述
  ipAddress: String,          // IP地址
  userAgent: String,          // 浏览器信息
  changes: Object,            // 变更内容（before/after）
  createdAt: Date             // 操作时间
}

// 索引
db.operation_logs.createIndex({ userId: 1, createdAt: -1 })
db.operation_logs.createIndex({ module: 1, action: 1 })
db.operation_logs.createIndex({ createdAt: -1 })
db.operation_logs.createIndex({ targetId: 1 })

// TTL索引 - 自动删除90天前的日志
db.operation_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 })
```

### 12. comments (评论表)

```javascript
{
  _id: ObjectId("..."),
  targetId: ObjectId,         // 目标对象ID（任务、商机、项目等）
  targetType: String,         // 目标类型：task, opportunity, project
  userId: ObjectId,           // 评论人ID
  userName: String,           // 评论人姓名
  userAvatar: String,         // 评论人头像
  content: String,            // 评论内容
  attachments: [              // 附件
    {
      name: String,
      url: String,
      type: String
    }
  ],
  replyTo: ObjectId,          // 回复的评论ID（支持楼中楼）
  replyToUser: String,        // 回复的用户
  likeCount: Number,          // 点赞数
  likedBy: [ObjectId],        // 点赞用户ID数组
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
}

// 索引
db.comments.createIndex({ targetId: 1, targetType: 1, createdAt: -1 })
db.comments.createIndex({ userId: 1 })
db.comments.createIndex({ createdAt: -1 })
```

### 13. notifications (通知表)

```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId,           // 接收通知的用户ID
  type: String,               // 通知类型：task_assigned, task_updated, comment, deadline_approaching
  title: String,              // 通知标题
  content: String,            // 通知内容
  targetId: ObjectId,         // 关联对象ID
  targetType: String,         // 关联对象类型
  isRead: Boolean,            // 是否已读
  readAt: Date,               // 阅读时间
  senderId: ObjectId,         // 发送者ID
  senderName: String,         // 发送者姓名
  createdAt: Date
}

// 索引
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 })
db.notifications.createIndex({ createdAt: -1 })

// TTL索引 - 自动删除30天前的已读通知
db.notifications.createIndex(
  { createdAt: 1, isRead: 1 },
  { 
    expireAfterSeconds: 2592000,
    partialFilterExpression: { isRead: true }
  }
)
```

---

## 数据关系图

```
users (用户)
  ├── departments (部门)
  ├── roles (角色)
  ├── tasks (任务 - 作为负责人/协同人)
  ├── opportunities (商机 - 作为销售经理)
  ├── projects (项目 - 作为项目经理)
  └── comments (评论)

tasks (任务)
  ├── opportunities (关联商机)
  ├── projects (关联项目)
  ├── comments (评论)
  └── users (负责人、协同人)

opportunities (商机)
  ├── tasks (跟进任务)
  ├── projects (转化的项目)
  ├── comments (评论)
  └── users (销售经理)

projects (项目)
  ├── opportunities (来源商机)
  ├── tasks (项目任务)
  ├── comments (评论)
  └── users (项目经理、团队成员)

goals (目标)
  ├── departments (部门目标)
  └── users (个人目标)

strategies (年度策略)
  ├── measures (季度措施)
  └── users (负责人)
```

---

## 数据初始化脚本

```javascript
// 初始化超级管理员
db.users.insertOne({
  username: "admin",
  password: "$2b$10$...", // bcrypt加密后的密码
  name: "系统管理员",
  email: "admin@jihua.com",
  phone: "13800138000",
  roleIds: [adminRoleId],
  status: "在职",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

// 初始化系统角色
db.roles.insertMany([
  {
    name: "超级管理员",
    code: "super_admin",
    level: 1,
    permissions: [{ module: "*", actions: ["*"] }],
    isSystem: true,
    status: "启用",
    createdAt: new Date()
  },
  {
    name: "高层领导",
    code: "senior_leader",
    level: 2,
    permissions: [
      { module: "tasks", actions: ["view", "create", "edit"] },
      { module: "opportunities", actions: ["view", "create", "edit"] },
      { module: "projects", actions: ["view", "create", "edit"] },
      { module: "goals", actions: ["view", "create", "edit"] },
      { module: "dashboard", actions: ["view"] }
    ],
    isSystem: true,
    status: "启用",
    createdAt: new Date()
  }
])

// 初始化系统配置
db.system_configs.insertMany([
  {
    category: "task",
    key: "task_types",
    value: ["日常工作", "商机跟进", "项目任务"],
    dataType: "array",
    description: "任务类型配置",
    isEditable: true,
    sort: 1,
    createdAt: new Date()
  },
  // ... 其他配置
])
```

---

## 查询优化建议

### 1. 常用查询优化

```javascript
// 查询用户的所有待办任务（使用索引）
db.tasks.find({
  $or: [
    { ownerId: userId },
    { collaboratorIds: userId }
  ],
  status: { $in: ["未开始", "进行中"] },
  deletedAt: null
}).sort({ endDate: 1 })

// 查询部门的商机统计（使用聚合）
db.opportunities.aggregate([
  {
    $match: {
      salesManagerId: { $in: departmentUserIds },
      status: "进行中"
    }
  },
  {
    $group: {
      _id: "$stage",
      count: { $sum: 1 },
      totalAmount: { $sum: "$expectedRevenue" }
    }
  }
])

// 查询项目进度（使用聚合）
db.projects.aggregate([
  { $match: { status: { $nin: ["已完成", "暂停"] } } },
  {
    $lookup: {
      from: "tasks",
      localField: "_id",
      foreignField: "projectId",
      as: "tasks"
    }
  },
  {
    $addFields: {
      taskCount: { $size: "$tasks" },
      completedTaskCount: {
        $size: {
          $filter: {
            input: "$tasks",
            cond: { $eq: ["$$this.status", "已完成"] }
          }
        }
      }
    }
  }
])
```

### 2. 数据冗余策略

为提升查询性能，以下字段采用冗余设计：
- 用户姓名（在任务、商机、项目中冗余）
- 统计数量（评论数、任务数等）
- 部门成员数
- 角色用户数

### 3. 分片建议

当数据量增大时，建议对以下集合进行分片：
- `tasks` - 按 `createdAt` 或 `ownerId` 分片
- `opportunities` - 按 `createdAt` 或 `salesManagerId` 分片
- `projects` - 按 `createdAt` 分片
- `operation_logs` - 按 `createdAt` 分片

---

## 备份策略

1. **全量备份**: 每天凌晨2点执行
2. **增量备份**: 每4小时执行一次
3. **保留策略**: 保留最近30天的备份
4. **异地备份**: 同步到异地数据中心

---

## 安全建议

1. **访问控制**: 使用MongoDB的角色权限系统
2. **数据加密**: 启用传输加密（TLS）和静态加密
3. **审计日志**: 启用数据库审计功能
4. **敏感数据**: 用户密码使用bcrypt加密，手机号考虑脱敏

---

## 性能监控

关键指标：
- 查询响应时间
- 索引使用率
- 慢查询日志
- 连接池状态
- 磁盘IO

---

**文档版本**: v1.0  
**最后更新**: 2025-12-07  
**设计者**: AI Assistant
