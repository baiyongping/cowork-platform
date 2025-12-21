# 数据库配置与使用指南

## 目录结构

```
database/
├── mongodb-schema.md              # 数据库设计文档
├── init-mongodb.js                # 数据库初始化脚本
├── tencentcloud-config.example.json  # 腾讯云配置示例
├── query-examples.js              # 常用查询示例
└── README.md                      # 本文件
```

---

## 快速开始

### 1. 准备腾讯云MongoDB

#### 1.1 创建实例
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云数据库 MongoDB** 页面
3. 点击 **新建实例**
4. 选择配置：
   - **地域**: 根据业务需求选择（建议与应用服务器同地域）
   - **规格**: 推荐 2核4GB 起步
   - **存储**: 推荐 50GB 起步
   - **副本集**: 建议选择 1主2从
   - **版本**: MongoDB 4.4 或更高
5. 设置管理员账号和密码
6. 配置网络（VPC）
7. 完成购买

#### 1.2 配置安全组
1. 在实例详情中找到 **安全组**
2. 添加规则允许应用服务器访问
3. 端口: 27017
4. 来源: 应用服务器IP或VPC网段

#### 1.3 获取连接信息
在实例详情页面可以看到：
- 内网地址
- 外网地址（如需）
- 端口号
- 副本集名称

---

### 2. 初始化数据库

#### 方法一：使用 mongosh（推荐）

```bash
# 1. 安装 MongoDB Shell
# 下载地址: https://www.mongodb.com/try/download/shell

# 2. 连接到腾讯云MongoDB
mongosh "mongodb://username:password@your-instance.mongodb.tencentcdb.com:27017/admin?replicaSet=mgset-xxxxx&ssl=true"

# 3. 执行初始化脚本
load('init-mongodb.js')
```

#### 方法二：使用 MongoDB Compass（图形界面）

```bash
# 1. 下载并安装 MongoDB Compass
# 下载地址: https://www.mongodb.com/try/download/compass

# 2. 使用连接字符串连接
mongodb://username:password@your-instance.mongodb.tencentcdb.com:27017/?replicaSet=mgset-xxxxx&ssl=true

# 3. 打开 Shell 标签，复制 init-mongodb.js 内容执行
```

#### 方法三：使用代码执行

```javascript
// Node.js 示例
const { MongoClient } = require('mongodb');
const fs = require('fs');

async function initDatabase() {
  const uri = "mongodb://username:password@your-instance.mongodb.tencentcdb.com:27017/?replicaSet=mgset-xxxxx&ssl=true";
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('jihua_oa_platform');
    
    // 执行初始化脚本
    const script = fs.readFileSync('init-mongodb.js', 'utf8');
    // ... 执行脚本内容
    
    console.log('数据库初始化完成');
  } finally {
    await client.close();
  }
}

initDatabase();
```

---

### 3. 配置应用连接

#### 3.1 创建配置文件

```bash
# 复制示例配置
cp tencentcloud-config.example.json tencentcloud-config.json

# 编辑配置文件，填入真实信息
vim tencentcloud-config.json
```

#### 3.2 Node.js 连接示例

```javascript
// config/database.js
const { MongoClient } = require('mongodb');
const config = require('../database/tencentcloud-config.json');

let client = null;
let db = null;

async function connectDatabase() {
  if (db) return db;
  
  const uri = config.connection_string;
  client = new MongoClient(uri, {
    ...config.database.options,
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  await client.connect();
  db = client.db(config.database.database);
  
  console.log('✓ 数据库连接成功');
  return db;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✓ 数据库连接已关闭');
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  getDB: () => db
};
```

#### 3.3 使用示例

```javascript
// 使用数据库
const { connectDatabase } = require('./config/database');

async function main() {
  const db = await connectDatabase();
  
  // 查询用户
  const users = await db.collection('users').find({}).toArray();
  console.log('用户列表:', users);
  
  // 创建任务
  const task = await db.collection('tasks').insertOne({
    name: '测试任务',
    ownerId: ObjectId('...'),
    status: '进行中',
    createdAt: new Date()
  });
  console.log('任务已创建:', task.insertedId);
}

main();
```

---

## 常用操作

### 查询操作

```javascript
// 1. 查询用户的所有待办任务
const tasks = await db.collection('tasks').find({
  $or: [
    { ownerId: userId },
    { collaboratorIds: userId }
  ],
  status: { $in: ['未开始', '进行中'] },
  deletedAt: null
}).sort({ endDate: 1 }).toArray();

// 2. 查询部门商机统计
const opportunityStats = await db.collection('opportunities').aggregate([
  {
    $match: {
      salesManagerId: { $in: departmentUserIds },
      status: '进行中'
    }
  },
  {
    $group: {
      _id: '$stage',
      count: { $sum: 1 },
      totalAmount: { $sum: '$expectedRevenue' }
    }
  }
]).toArray();

// 3. 查询项目进度
const projects = await db.collection('projects').aggregate([
  { $match: { status: { $nin: ['已完成', '暂停'] } } },
  {
    $lookup: {
      from: 'tasks',
      localField: '_id',
      foreignField: 'projectId',
      as: 'tasks'
    }
  },
  {
    $addFields: {
      taskCount: { $size: '$tasks' },
      completedTaskCount: {
        $size: {
          $filter: {
            input: '$tasks',
            cond: { $eq: ['$$this.status', '已完成'] }
          }
        }
      }
    }
  }
]).toArray();
```

### 更新操作

```javascript
// 1. 更新任务进度
await db.collection('tasks').updateOne(
  { _id: taskId },
  { 
    $set: { 
      progress: 80,
      status: '进行中',
      updatedAt: new Date()
    }
  }
);

// 2. 商机阶段推进
await db.collection('opportunities').updateOne(
  { _id: opportunityId },
  {
    $set: {
      previousStage: currentStage,
      stage: nextStage,
      lastFollowUpDate: new Date(),
      updatedAt: new Date()
    },
    $push: {
      followUpRecords: {
        _id: new ObjectId(),
        date: new Date(),
        actionType: '阶段推进',
        content: `从 ${currentStage} 推进到 ${nextStage}`,
        userId: userId,
        userName: userName
      }
    }
  }
);

// 3. 项目状态更新
await db.collection('projects').updateOne(
  { _id: projectId },
  {
    $set: {
      status: '制造期',
      progress: 45,
      updatedAt: new Date()
    }
  }
);
```

### 事务操作

```javascript
// 商机转化为项目（需要事务保证一致性）
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    // 1. 创建项目
    const project = await db.collection('projects').insertOne({
      name: opportunity.name,
      customer: opportunity.customer,
      sourceOpportunityId: opportunity._id,
      status: '未开始',
      managerId: opportunity.salesManagerId,
      createdAt: new Date()
    }, { session });
    
    // 2. 更新商机状态
    await db.collection('opportunities').updateOne(
      { _id: opportunity._id },
      {
        $set: {
          isConverted: true,
          convertedProjectId: project.insertedId,
          convertedDate: new Date(),
          status: '已成交'
        }
      },
      { session }
    );
    
    // 3. 记录操作日志
    await db.collection('operation_logs').insertOne({
      userId: userId,
      action: 'convert',
      module: 'opportunities',
      targetId: opportunity._id,
      description: '商机转化为项目',
      createdAt: new Date()
    }, { session });
  });
  
  console.log('商机转化成功');
} finally {
  await session.endSession();
}
```

---

## 性能优化

### 1. 使用索引

```javascript
// 查看查询计划
db.collection('tasks').find({ ownerId: userId }).explain('executionStats')

// 创建复合索引
db.collection('tasks').createIndex({ ownerId: 1, status: 1, endDate: 1 })
```

### 2. 分页查询

```javascript
// 使用 skip/limit（小数据量）
const tasks = await db.collection('tasks')
  .find({})
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();

// 使用游标分页（大数据量，推荐）
const tasks = await db.collection('tasks')
  .find({ _id: { $gt: lastId } })
  .limit(pageSize)
  .toArray();
```

### 3. 投影查询

```javascript
// 只查询需要的字段
const users = await db.collection('users')
  .find({}, { 
    projection: { 
      username: 1, 
      name: 1, 
      email: 1,
      password: 0  // 排除敏感字段
    } 
  })
  .toArray();
```

---

## 备份与恢复

### 腾讯云自动备份

1. 在控制台 -> 备份与恢复
2. 设置自动备份策略
3. 备份时间：建议凌晨2-4点
4. 保留天数：建议30天

### 手动备份

```bash
# 使用 mongodump
mongodump --uri="mongodb://username:password@your-instance.mongodb.tencentcdb.com:27017/?ssl=true" --out=/backup/$(date +%Y%m%d)

# 恢复数据
mongorestore --uri="mongodb://username:password@your-instance.mongodb.tencentcdb.com:27017/?ssl=true" /backup/20251207
```

---

## 监控与告警

### 腾讯云监控

在控制台可以查看：
- CPU使用率
- 内存使用率
- 磁盘使用率
- 连接数
- QPS
- 慢查询

### 设置告警

1. 进入监控告警页面
2. 创建告警策略
3. 设置阈值（如CPU>80%、连接数>1000）
4. 配置通知方式（短信、邮件、微信）

---

## 常见问题

### Q1: 连接超时

**原因**: 网络不通或安全组配置错误

**解决**:
1. 检查安全组规则
2. 确认应用服务器与数据库在同一VPC
3. 使用 telnet 测试连接: `telnet host 27017`

### Q2: 认证失败

**原因**: 用户名或密码错误

**解决**:
1. 在控制台重置密码
2. 确认 authSource 正确（通常是 admin）
3. 检查连接字符串格式

### Q3: 性能慢

**原因**: 缺少索引或查询不当

**解决**:
1. 使用 explain 分析查询
2. 创建合适的索引
3. 优化查询条件
4. 考虑使用聚合管道

### Q4: 磁盘空间不足

**解决**:
1. 在控制台扩容磁盘
2. 清理过期数据
3. 优化数据结构

---

## 安全建议

1. **密码安全**: 使用强密码，定期更换
2. **网络隔离**: 使用VPC内网访问
3. **权限控制**: 最小权限原则
4. **数据加密**: 启用SSL连接和数据加密
5. **审计日志**: 开启审计功能
6. **定期备份**: 保证数据可恢复性

---

## 技术支持

- 腾讯云MongoDB文档: https://cloud.tencent.com/document/product/240
- MongoDB官方文档: https://docs.mongodb.com/
- 技术支持工单: 腾讯云控制台

---

**更新时间**: 2025-12-07
