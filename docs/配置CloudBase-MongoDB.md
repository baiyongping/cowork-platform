# 配置CloudBase MongoDB连接

## 获取CloudBase MongoDB连接信息

### 方式一：通过CloudBase控制台（推荐）

1. 登录腾讯云CloudBase控制台
2. 进入您的环境：`jihua-oa-dev-3goht9irae4d949f`
3. 点击左侧菜单 **"数据库"** -> **"设置"**
4. 查看连接字符串（MongoDB URI）

### 方式二：使用CloudBase SDK（已在前端使用）

前端已经配置好CloudBase SDK，可以直接使用：

```typescript
// lib/cloudbase.ts
import cloudbase from '@cloudbase/js-sdk';

const app = cloudbase.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = app.database();
```

## 后端配置CloudBase MongoDB

### 选项1：使用CloudBase Node.js SDK（推荐）

后端也使用CloudBase SDK，无需直接连接MongoDB：

```javascript
// server/src/config/cloudbase.js
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'jihua-oa-dev-3goht9irae4d949f',
  secretId: process.env.CLOUDBASE_SECRET_ID,    // 需要在.env配置
  secretKey: process.env.CLOUDBASE_SECRET_KEY   // 需要在.env配置
});

const db = app.database();

module.exports = { app, db };
```

### 选项2：使用MongoDB原生驱动

如果需要使用Mongoose，需要获取MongoDB连接字符串：

```bash
# .env配置
MONGODB_URI=mongodb://用户名:密码@主机:端口/数据库?authSource=admin&replicaSet=xxx
```

**注意**：CloudBase MongoDB是MongoDB副本集，连接字符串格式较复杂。

## 推荐方案：统一使用CloudBase SDK

### 优势

1. ✅ **无需管理连接字符串** - SDK自动处理
2. ✅ **统一的API** - 前后端使用相同的数据操作方式
3. ✅ **内置权限控制** - CloudBase自动处理用户权限
4. ✅ **简化部署** - 无需配置数据库连接
5. ✅ **自动扩容** - CloudBase自动管理数据库资源

### 实施步骤

#### 1. 安装CloudBase Node.js SDK

```bash
cd server
npm install @cloudbase/node-sdk
```

#### 2. 创建CloudBase配置

```javascript
// server/src/config/cloudbase.js
const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: process.env.CLOUDBASE_ENV_ID || 'jihua-oa-dev-3goht9irae4d949f'
});

const db = app.database();
const auth = app.auth();

module.exports = { app, db, auth };
```

#### 3. 更新User Model

将Mongoose模型改为使用CloudBase数据库：

```javascript
// server/src/models/User.js
const { db } = require('../config/cloudbase');
const bcrypt = require('bcryptjs');

class User {
  constructor() {
    this.collection = db.collection('users');
  }

  async findByUsername(username) {
    const res = await this.collection.where({ username }).get();
    return res.data[0] || null;
  }

  async create(userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const res = await this.collection.add({
      ...userData,
      password: hashedPassword,
      status: '在职',
      isActive: true,
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return res.id;
  }

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = new User();
```

#### 4. 更新Controller

```javascript
// server/src/controllers/authController.js
const User = require('../models/User');

exports.login = async (req, res) => {
  const { username, password } = req.body;

  // 查找用户
  const user = await User.findByUsername(username);
  
  if (!user) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  // 验证密码
  const isPasswordValid = await User.comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  // 检查状态
  if (!user.isActive) {
    return res.status(401).json({ message: '账号已被禁用' });
  }

  if (user.approvalStatus !== 'approved') {
    return res.status(401).json({ message: '账号正在审核中' });
  }

  // 生成token...
  res.json({ success: true, user, token });
};
```

## 环境变量配置

### 前端 (.env)
```bash
VITE_CLOUDBASE_ENV_ID=jihua-oa-dev-3goht9irae4d949f
```

### 后端 (server/.env)
```bash
NODE_ENV=development
PORT=3000

# CloudBase配置
CLOUDBASE_ENV_ID=jihua-oa-dev-3goht9irae4d949f

# 如果需要服务端权限（可选）
# CLOUDBASE_SECRET_ID=your_secret_id
# CLOUDBASE_SECRET_KEY=your_secret_key

# JWT配置
JWT_SECRET=jihua-oa-platform-secret-key-2025-dev
JWT_EXPIRES_IN=7d

# CORS配置
CORS_ORIGIN=http://localhost:5173
```

## 数据库统一性

使用此方案后：

1. ✅ **前端** -> CloudBase Web SDK -> CloudBase MongoDB
2. ✅ **后端** -> CloudBase Node.js SDK -> CloudBase MongoDB
3. ✅ **数据库** -> 同一个CloudBase MongoDB实例
4. ✅ **数据一致** -> 前后端操作同一份数据

## 迁移现有Mongoose代码

如果已有大量Mongoose代码，也可以：

1. 保留Mongoose用于复杂查询
2. 使用CloudBase MongoDB连接字符串连接
3. 逐步迁移到CloudBase SDK

但推荐直接使用CloudBase SDK以获得最佳体验。

## 下一步

执行以下命令自动配置：

```bash
cd server
npm install @cloudbase/node-sdk
```

然后运行配置脚本更新代码结构。
