# 际华协同办公平台 - UnionID注册方案实施文档

## 📋 方案概述

本方案实现了基于微信UnionID的用户唯一身份识别系统，确保用户在不同应用（小程序、公众号、App）中拥有统一的身份标识。

### 核心优势

- ✅ **跨平台统一身份**：UnionID在同一开放平台账号下所有应用中保持一致
- ✅ **符合微信最新规范**：使用头像昵称填写组件（基础库2.21.2+）
- ✅ **安全可靠**：所有敏感操作在云函数完成，AppSecret不暴露
- ✅ **用户体验好**：无需繁琐授权，一键获取信息
- ✅ **向下兼容**：如果未获取到UnionID，自动降级使用OpenID

---

## 🏗️ 系统架构

```
┌─────────────────┐
│   小程序前端    │
│  register.js    │
└────────┬────────┘
         │ wx.login()
         │ wx.cloud.callFunction()
         ▼
┌─────────────────────────────────────────┐
│           云函数层（后端）              │
├─────────────────────────────────────────┤
│ getUserIdentity     ← 获取UnionID       │
│ checkUserExists     ← 检查用户是否注册 │
│ registerEmployee    ← 注册新用户       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         CloudBase NoSQL 数据库          │
├─────────────────────────────────────────┤
│ users 集合                              │
│ - unionid (唯一索引) ⭐ 主键            │
│ - openid                                │
│ - nickName                              │
│ - avatarUrl                             │
│ - phoneNumber                           │
└─────────────────────────────────────────┘
```

---

## ✅ 当前实施状态

### 已完成项目

#### 1️⃣ 小程序前端页面 ✅

**文件**: `miniprogram/pages/register/`

- ✅ `register.wxml` - 注册页面UI（头像选择、昵称输入）
- ✅ `register.js` - 注册逻辑（wxLogin、UnionID获取）
- ✅ `register.wxss` - 页面样式

**核心功能**:
- 页面加载时自动调用`wxLogin()`获取UnionID
- 使用`open-type="chooseAvatar"`选择头像
- 使用`type="nickname"`输入昵称
- 检查用户是否已注册，已注册则直接跳转

#### 2️⃣ 云函数 ✅

**getUserIdentity** (`cloudfunctions/getUserIdentity/`)
- ✅ 使用`cloud.openapi.auth.code2Session`获取UnionID
- ✅ 安全处理sessionKey（不下发给前端）
- ✅ 返回`hasUnionId`标识，提示未绑定开放平台

**checkUserExists** (`cloudfunctions/checkUserExists/`)
- ✅ 优先使用UnionID查询用户
- ✅ 兼容OpenID查询（向下兼容）
- ✅ 返回用户存在状态和用户信息

**registerEmployee** (`cloudfunctions/registerEmployee/`)
- ✅ 支持UnionID注册
- ✅ 自动上传头像到云存储
- ✅ 支持手机号验证（可选）
- ✅ 创建待审核用户记录

#### 3️⃣ 数据库结构 ✅

**users 集合字段**:
```javascript
{
  _id: "自动生成",
  unionid: "唯一标识（主键）",  // ⭐ 新增字段
  openid: "小程序openid",        // 兼容字段
  nickName: "用户昵称",
  name: "真实姓名",
  avatarUrl: "头像云存储URL",
  phoneNumber: "手机号（可选）",
  role: "employee",
  department: "部门",
  position: "职务",
  status: "pending|active|rejected",
  approvalStatus: "pending|approved|rejected",
  registeredAt: "注册时间戳",
  createdAt: "创建时间戳",
  updatedAt: "更新时间戳"
}
```

**现有索引**:
- `_id_` (自动创建)
- `username_unique` (唯一)
- `phone_unique` (唯一)
- `_openid_1` (非唯一)

---

## 🚧 待完成项目

### 1️⃣ 创建UnionID唯一索引 ⚠️ 重要

**原因**: 确保UnionID的唯一性，防止重复注册

**执行步骤**:

**方法一：使用云函数**（推荐）

```bash
# 1. 创建临时云函数 createUnionIdIndex
cd e:\cowork\cloudfunctions
mkdir createUnionIdIndex
cd createUnionIdIndex

# 2. 复制脚本
# 将 scripts/create-unionid-index.js 内容复制到 index.js

# 3. 创建 package.json
npm init -y
npm install wx-server-sdk --save

# 4. 上传并部署
右键云函数 → 上传并部署：云端安装依赖

# 5. 执行云函数
在云函数控制台测试运行

# 6. 验证结果
检查日志输出：✅ unionid 唯一索引创建成功
```

**方法二：使用CloudBase控制台**

1. 登录CloudBase控制台：https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f
2. 导航到：数据库 → 文档型数据库 → users 集合
3. 点击"索引"标签
4. 点击"创建索引"
5. 填写配置：
   - 索引名称：`unionid_unique`
   - 索引字段：`unionid`
   - 排序：`1`（升序）
   - 唯一索引：`✅ 勾选`
   - 稀疏索引：`✅ 勾选`（允许没有unionid的旧数据）
6. 点击确定

**验证索引创建**:

```bash
# 使用 MCP 工具查询索引
mcp_call_tool({
  serverName: "CloudBase AI ToolKit",
  toolName: "readNoSqlDatabaseStructure",
  arguments: {
    "action": "listIndexes",
    "collectionName": "users"
  }
})

# 期望结果应包含：
# {
#   "Name": "unionid_unique",
#   "Keys": [{ "Name": "unionid", "Direction": "1" }],
#   "Unique": true
# }
```

---

### 2️⃣ 配置微信开放平台（关键步骤）

**重要性**: ⭐⭐⭐⭐⭐ 必须完成才能获取UnionID

**步骤详解**:

#### Step 1: 登录微信开放平台
- 访问：https://open.weixin.qq.com/
- 使用小程序管理员微信扫码登录

#### Step 2: 绑定小程序
1. 点击"管理中心" → "公众账号/小程序/网站应用"
2. 点击"绑定小程序"
3. 扫描小程序管理员二维码授权
4. 确认绑定

#### Step 3: 开启UnionID权限
1. 进入"开发设置"
2. 找到"UnionID机制"
3. 点击"开启"

#### Step 4: 记录AppID和AppSecret
```javascript
// 这些信息用于云函数配置（已在 getUserIdentity 中使用）
APPID: "你的小程序AppID"
APPSECRET: "你的小程序AppSecret"
```

**⚠️ 注意事项**:
- AppSecret 必须保密，只能在云函数/后端使用
- 开放平台账号需要企业认证（个人账号无法使用UnionID）
- 绑定后需要等待几分钟生效

---

### 3️⃣ 数据迁移（可选）

**适用场景**: 如果系统中已有使用OpenID的用户，需要补全UnionID

**迁移脚本**: 创建云函数 `migrateUsersToUnionId`

```javascript
// cloudfunctions/migrateUsersToUnionId/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 查询所有没有 unionid 的用户
    const { data: users } = await db.collection('users')
      .where({
        unionid: db.command.exists(false)
      })
      .get();

    console.log(`找到 ${users.length} 个需要迁移的用户`);

    const results = [];

    for (const user of users) {
      // 跳过没有 openid 的用户
      if (!user.openid) {
        console.warn(`用户 ${user._id} 没有 openid，跳过`);
        continue;
      }

      // 提示：需要用户重新登录小程序才能获取 unionid
      // 这里只能打上标记，等用户下次登录时更新
      await db.collection('users').doc(user._id).update({
        data: {
          needUpdateUnionId: true,
          updatedAt: new Date().getTime()
        }
      });

      results.push({
        userId: user._id,
        status: 'marked_for_update'
      });
    }

    return {
      success: true,
      message: `标记 ${results.length} 个用户等待UnionID更新`,
      results
    };

  } catch (error) {
    console.error('迁移失败:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
```

**执行迁移**:
```bash
# 上传云函数
cd cloudfunctions/migrateUsersToUnionId
npm install wx-server-sdk --save
右键 → 上传并部署

# 执行迁移
在云函数控制台测试运行

# 更新 checkUserExists 和 wxLogin 逻辑
# 当用户重新登录时，自动更新 unionid
```

---

## 📝 代码关键点说明

### 1. 小程序登录流程（register.js）

```javascript
async wxLogin() {
  // 1️⃣ 获取临时凭证 code
  const loginRes = await wx.login();
  const code = loginRes.code;

  // 2️⃣ 调用云函数换取 openid 和 unionid
  const cloudRes = await wx.cloud.callFunction({
    name: 'getUserIdentity',
    data: { code }
  });

  const { openid, unionid, hasUnionId } = cloudRes.result.data;

  // 3️⃣ UnionID 检查
  if (!hasUnionId) {
    // 提示未绑定开放平台
  }

  // 4️⃣ 检查用户是否已注册
  const checkRes = await wx.cloud.callFunction({
    name: 'checkUserExists',
    data: { unionid, openid }
  });

  // 5️⃣ 根据状态跳转
  if (checkRes.result.data.exists) {
    // 已注册，跳转到主页或待审核页
  } else {
    // 未注册，显示注册表单
  }
}
```

### 2. 云函数获取UnionID（getUserIdentity/index.js）

```javascript
exports.main = async (event, context) => {
  const { code } = event;

  // ⭐ 核心：调用微信官方API
  const result = await cloud.openapi.auth.code2Session({
    jsCode: code
  });

  const { openid, unionid, sessionKey } = result;

  // ⚠️ sessionKey 不要下发给前端
  return {
    success: true,
    code: 200,
    data: {
      openid,
      unionid: unionid || null,
      hasUnionId: !!unionid
    }
  };
};
```

### 3. 用户注册（registerEmployee/index.js）

```javascript
exports.main = async (event, context) => {
  const { unionid, name, nickName, avatarUrl, phoneCode } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 1️⃣ 检查用户是否已存在
  const query = unionid ? { unionid } : { openid };
  const { data: existingUsers } = await db.collection('users')
    .where(query)
    .get();

  if (existingUsers.length > 0) {
    return { code: 400, message: '您已注册' };
  }

  // 2️⃣ 处理手机号（可选）
  let phoneNumber = null;
  if (phoneCode) {
    const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({
      code: phoneCode
    });
    phoneNumber = phoneRes.phoneInfo?.phoneNumber;
  }

  // 3️⃣ 上传头像到云存储
  let permanentAvatarUrl = avatarUrl;
  if (avatarUrl.startsWith('http://tmp/')) {
    const cloudPath = `avatars/${unionid || openid}_${Date.now()}.png`;
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: await downloadTempFile(avatarUrl)
    });
    permanentAvatarUrl = uploadRes.fileID;
  }

  // 4️⃣ 创建用户记录
  const userData = {
    openid,
    name,
    nickName,
    avatarUrl: permanentAvatarUrl,
    phoneNumber,
    role: 'employee',
    status: 'pending',
    registeredAt: Date.now()
  };

  // ⭐ 添加 UnionID（如果有）
  if (unionid) {
    userData.unionid = unionid;
  }

  await db.collection('users').add({ data: userData });

  return {
    code: 200,
    message: '注册申请已提交',
    data: { hasUnionId: !!unionid, hasPhoneNumber: !!phoneNumber }
  };
};
```

---

## 🔒 安全要点

### 1. AppSecret 保护

❌ **错误做法**:
```javascript
// 前端代码（永远不要这样做！）
const APPSECRET = 'xxx';
```

✅ **正确做法**:
```javascript
// 云函数中使用（getUserIdentity/index.js）
// 通过 cloud.openapi.auth.code2Session 自动处理
// 无需手动配置 AppSecret
```

### 2. Session Key 处理

```javascript
// ⚠️ sessionKey 只能在云函数内部使用
// 用于解密敏感数据（如手机号）
// 绝对不能下发给前端

const { sessionKey } = result;
// 立即使用后销毁，不要存储
```

### 3. UnionID 索引安全

```javascript
// 创建唯一索引防止重复注册
// sparse: true 允许旧数据（没有unionid字段）存在
db.collection('users').createIndex({
  keys: [{ name: 'unionid', direction: '1' }],
  indexName: 'unionid_unique',
  unique: true,
  sparse: true
});
```

---

## 🧪 测试验证

### 测试清单

#### 1. 开放平台配置测试

- [ ] 登录微信开放平台确认小程序已绑定
- [ ] 确认UnionID机制已开启
- [ ] 记录AppID和AppSecret

#### 2. 索引创建验证

```bash
# 执行索引创建脚本
node scripts/create-unionid-index.js

# 或在云函数控制台手动创建

# 验证索引
mcp_call_tool readNoSqlDatabaseStructure {
  action: "listIndexes",
  collectionName: "users"
}
```

预期结果：
```json
{
  "Name": "unionid_unique",
  "Keys": [{ "Name": "unionid", "Direction": "1" }],
  "Unique": true
}
```

#### 3. 小程序注册流程测试

**测试用例1: 新用户注册（有UnionID）**

1. 打开小程序注册页面
2. 观察控制台日志：
   ```
   ✅ 获取 code 成功
   ✅ getUserIdentity 返回: { openid, unionid, hasUnionId: true }
   ⚠️ 用户未注册，显示注册表单
   ```
3. 选择头像、输入昵称、姓名
4. 提交注册
5. 验证数据库：
   ```javascript
   db.collection('users').where({ unionid: 'xxx' }).get()
   // 应返回刚注册的用户
   ```

**测试用例2: 新用户注册（无UnionID - 未绑定开放平台）**

1. 打开小程序注册页面
2. 观察控制台日志：
   ```
   ✅ 获取 code 成功
   ⚠️ 未获取到 UnionID
   ✅ getUserIdentity 返回: { openid, unionid: null, hasUnionId: false }
   ```
3. 应弹窗提示："未获取到 UnionID，建议联系管理员..."
4. 继续注册流程
5. 验证数据库：
   ```javascript
   db.collection('users').where({ openid: 'xxx' }).get()
   // unionid 字段应为空或不存在
   ```

**测试用例3: 已注册用户再次登录**

1. 使用已注册用户打开注册页面
2. 观察控制台日志：
   ```
   ✅ getUserIdentity 返回
   ✅ checkUserExists 返回: { exists: true, user: {...} }
   📊 用户已注册，状态: active
   ```
3. 应自动跳转到主页（tasks/tasks）

**测试用例4: 待审核用户登录**

1. 使用状态为 pending 的用户登录
2. 应跳转到待审核页面：`/pages/pending/pending`

#### 4. 云函数单元测试

**getUserIdentity 测试**:
```javascript
// 在云函数控制台测试
{
  "code": "从小程序 wx.login() 获取的真实code"
}

// 预期返回
{
  "success": true,
  "code": 200,
  "data": {
    "openid": "oXXXX...",
    "unionid": "oYYYY..." or null,
    "hasUnionId": true or false
  }
}
```

**checkUserExists 测试**:
```javascript
// 测试数据
{
  "unionid": "已存在的unionid",
  "openid": "已存在的openid"
}

// 预期返回
{
  "success": true,
  "code": 200,
  "data": {
    "exists": true,
    "user": { /* 用户信息 */ }
  }
}
```

**registerEmployee 测试**:
```javascript
// 测试数据
{
  "unionid": "test_unionid_123",
  "name": "测试用户",
  "nickName": "TestNick",
  "avatarUrl": "http://tmp/...",
  "phoneCode": ""
}

// 预期返回
{
  "code": 200,
  "message": "注册申请已提交",
  "data": {
    "_id": "新用户ID",
    "hasUnionId": true,
    "hasPhoneNumber": false
  }
}
```

---

## 🚀 部署步骤

### 完整部署流程

#### Step 1: 配置微信开放平台（必须）

```bash
1. 访问 https://open.weixin.qq.com/
2. 绑定小程序到开放平台
3. 开启 UnionID 机制
4. 记录 AppID 和 AppSecret
```

#### Step 2: 创建UnionID索引（重要）

**方法一：使用云函数**
```bash
# 创建临时云函数
cd cloudfunctions
mkdir createUnionIdIndex
cp ../scripts/create-unionid-index.js createUnionIdIndex/index.js

# 安装依赖
cd createUnionIdIndex
npm init -y
npm install wx-server-sdk --save

# 上传部署
右键 → 上传并部署：云端安装依赖

# 执行
在云开发控制台测试运行
```

**方法二：控制台手动创建**
```bash
1. 登录 CloudBase 控制台
2. 数据库 → users 集合 → 索引 → 创建索引
3. 索引名称：unionid_unique
4. 索引字段：unionid (升序)
5. ✅ 唯一索引
6. ✅ 稀疏索引
7. 保存
```

#### Step 3: 部署云函数

```bash
# 进入云函数目录
cd cloudfunctions

# 部署 getUserIdentity
cd getUserIdentity
npm install
右键 → 上传并部署：云端安装依赖

# 部署 checkUserExists
cd ../checkUserExists
npm install
右键 → 上传并部署：云端安装依赖

# 部署 registerEmployee
cd ../registerEmployee
npm install
右键 → 上传并部署：云端安装依赖
```

#### Step 4: 测试小程序

```bash
# 1. 使用微信开发者工具打开小程序
# 2. 清除缓存（开发 → 清除缓存）
# 3. 真机调试（预览 → 真机调试）
# 4. 打开注册页面测试
# 5. 检查控制台日志
```

#### Step 5: 验证部署

```bash
# 1. 检查索引
mcp_call_tool readNoSqlDatabaseStructure { 
  action: "listIndexes", 
  collectionName: "users" 
}

# 2. 测试注册流程
打开小程序 → 注册页面 → 完成注册

# 3. 查询数据库
db.collection('users').where({ unionid: 'xxx' }).get()

# 4. 检查云函数日志
云开发控制台 → 云函数 → 查看日志
```

---

## 📊 数据流程图

### 新用户注册流程

```
┌──────────────┐
│ 用户打开小程序 │
└───────┬──────┘
        │
        ▼
┌──────────────────────┐
│ register.js onLoad() │
│ 自动调用 wxLogin()   │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│ wx.login()           │
│ 获取临时凭证 code    │
└───────┬──────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ wx.cloud.callFunction()         │
│ → getUserIdentity({ code })     │
└───────┬─────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ getUserIdentity 云函数          │
│ cloud.openapi.auth.code2Session │
│ 返回: { openid, unionid }       │
└───────┬─────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 检查 hasUnionId                 │
├─────────────────────────────────┤
│ ✅ true:  继续流程              │
│ ❌ false: 提示未绑定开放平台    │
└───────┬─────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ wx.cloud.callFunction()         │
│ → checkUserExists({ unionid })  │
└───────┬─────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ checkUserExists 云函数          │
│ 查询 users 集合                 │
├─────────────────────────────────┤
│ 已注册: 返回用户信息            │
│ 未注册: 返回 exists: false      │
└───────┬─────────────────────────┘
        │
        ├─── 已注册 ────────────┐
        │                       ▼
        │              ┌────────────────┐
        │              │ 根据状态跳转   │
        │              ├────────────────┤
        │              │ pending → 待审核│
        │              │ active → 主页  │
        │              │ rejected → 拒绝│
        │              └────────────────┘
        │
        └─── 未注册 ─────────┐
                             ▼
                    ┌─────────────────┐
                    │ 显示注册表单    │
                    │ - 选择头像      │
                    │ - 输入昵称      │
                    │ - 输入姓名      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ 用户提交注册        │
                    │ handleSubmit()      │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │ wx.cloud.callFunction()  │
                    │ → registerEmployee({     │
                    │     unionid,             │
                    │     name,                │
                    │     nickName,            │
                    │     avatarUrl            │
                    │   })                     │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌──────────────────────────┐
                    │ registerEmployee 云函数  │
                    ├──────────────────────────┤
                    │ 1. 再次检查是否已注册    │
                    │ 2. 上传头像到云存储      │
                    │ 3. 处理手机号（可选）    │
                    │ 4. 创建用户记录          │
                    │    - unionid ⭐          │
                    │    - openid              │
                    │    - status: pending     │
                    └────────┬─────────────────┘
                             │
                             ▼
                    ┌─────────────────────────┐
                    │ 数据库写入成功          │
                    │ users.add({ unionid })  │
                    └────────┬────────────────┘
                             │
                             ▼
                    ┌─────────────────────────┐
                    │ 跳转到待审核页面        │
                    │ /pages/pending/pending  │
                    └─────────────────────────┘
```

### 已注册用户登录流程

```
┌──────────────┐
│ 用户打开小程序 │
└───────┬──────┘
        │
        ▼
┌──────────────────────┐
│ register.js onLoad() │
│ 自动调用 wxLogin()   │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│ 获取 openid + unionid│
└───────┬──────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ checkUserExists({ unionid })    │
│ 查询到用户记录                  │
└───────┬─────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 根据用户状态自动跳转            │
├─────────────────────────────────┤
│ status === 'pending'            │
│ → /pages/pending/pending        │
│   "注册申请审核中"              │
├─────────────────────────────────┤
│ status === 'rejected'           │
│ → /pages/pending/pending        │
│   "审核未通过: 原因"            │
├─────────────────────────────────┤
│ isActive === false              │
│ → 弹窗提示"账号已禁用"          │
├─────────────────────────────────┤
│ 其他（正常状态）                │
│ → /pages/tasks/tasks            │
│   "欢迎回来"                    │
└─────────────────────────────────┘
```

---

## 🐛 常见问题排查

### Q1: 小程序获取不到 UnionID

**症状**:
```javascript
console.log(cloudRes.result.data);
// { openid: 'xxx', unionid: null, hasUnionId: false }
```

**原因**:
1. 小程序未绑定到微信开放平台
2. 开放平台未开启 UnionID 机制
3. 开放平台配置未生效（需等待几分钟）

**解决方案**:
```bash
# 1. 检查开放平台绑定
访问 https://open.weixin.qq.com/
管理中心 → 查看已绑定的小程序

# 2. 检查 UnionID 开关
开发设置 → UnionID机制 → 确认已开启

# 3. 等待生效
配置后等待 5-10 分钟再测试

# 4. 临时方案
如果确实无法获取 UnionID，系统会自动降级使用 OpenID
用户体验不受影响，只是无法跨平台统一身份
```

---

### Q2: 云函数报错 "code2Session failed"

**症状**:
```javascript
❌ getUserIdentity 错误: code2Session failed
```

**原因**:
1. code 已过期（5分钟有效期）
2. AppID 配置错误
3. 网络问题

**解决方案**:
```bash
# 1. 检查 code 是否及时使用
确保获取 code 后立即调用云函数，不要延迟

# 2. 检查云函数配置
云开发控制台 → 云函数 → getUserIdentity → 环境变量
确认 APPID 配置正确

# 3. 查看详细日志
云开发控制台 → 云函数 → 日志
查看具体错误信息
```

---

### Q3: 注册后跳转到待审核页面，但数据库没有记录

**症状**:
```javascript
✅ 注册申请已提交
// 但数据库 users 集合为空
```

**原因**:
1. 云函数权限不足
2. 数据库集合不存在
3. 字段验证失败

**解决方案**:
```bash
# 1. 检查云函数日志
云开发控制台 → 云函数 → registerEmployee → 日志
查看错误信息

# 2. 检查数据库集合
云开发控制台 → 数据库 → 文档型数据库
确认 users 集合存在

# 3. 手动测试云函数
在云函数控制台测试运行
查看返回结果和日志
```

---

### Q4: 重复注册提示"您已注册"，但无法登录

**症状**:
```javascript
❌ 您已注册，请直接登录
// 但用户状态异常，无法进入主页
```

**原因**:
1. 用户状态为 `pending`（待审核）
2. 用户状态为 `rejected`（已拒绝）
3. `isActive` 为 `false`（已禁用）

**解决方案**:
```bash
# 1. 查询用户状态
db.collection('users').where({ unionid: 'xxx' }).get()

# 2. 根据状态处理
status === 'pending'  → 等待管理员审核
status === 'rejected' → 联系管理员查看拒绝原因
isActive === false    → 联系管理员解除禁用

# 3. 管理员审核通过
在管理后台修改用户状态：
status: 'active'
approvalStatus: 'approved'
isActive: true
```

---

### Q5: 头像上传失败，使用临时URL

**症状**:
```javascript
⚠️ 头像上传失败，使用临时URL
avatarUrl: "http://tmp/wx123456789.png"
```

**原因**:
1. 云存储权限不足
2. 文件下载失败
3. 网络问题

**解决方案**:
```bash
# 1. 检查云存储权限
云开发控制台 → 存储 → 权限设置
确保云函数有写入权限

# 2. 检查临时文件路径
确保 avatarUrl 格式正确：http://tmp/...

# 3. 手动上传测试
在云函数中添加日志，查看上传详细错误

# 4. 临时方案
临时URL可以使用，但有效期只有7天
建议修复后要求用户重新上传头像
```

---

### Q6: 索引创建失败 "index already exists"

**症状**:
```javascript
❌ 索引创建失败: index already exists
```

**原因**:
索引已经存在（可能之前创建过）

**解决方案**:
```bash
# 这不是错误！
# 如果索引已存在，说明配置正确
# 可以忽略此错误

# 验证索引
mcp_call_tool readNoSqlDatabaseStructure {
  action: "listIndexes",
  collectionName: "users"
}

# 应该能看到 unionid_unique 索引
```

---

## 📚 参考文档

### 官方文档
- [微信小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)
- [UnionID机制](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html)
- [获取手机号](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html)
- [用户头像昵称](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/userProfile.html)
- [CloudBase云开发](https://cloud.tencent.com/document/product/876)

### 项目文档
- 小程序注册页面：`miniprogram/pages/register/`
- 云函数目录：`cloudfunctions/`
- 索引创建脚本：`scripts/create-unionid-index.js`

---

## 🎯 下一步计划

### 短期优化（1-2周）
- [ ] 完成UnionID索引创建
- [ ] 配置微信开放平台
- [ ] 真机测试注册流程
- [ ] 数据迁移（如有需要）

### 中期优化（1个月）
- [ ] 添加手机号验证功能
- [ ] 完善用户资料编辑
- [ ] 实现用户头像CDN加速
- [ ] 添加注册统计分析

### 长期规划（3个月）
- [ ] 支持其他登录方式（公众号、App）
- [ ] 实现UnionID跨平台用户同步
- [ ] 完善用户权限管理
- [ ] 添加用户行为分析

---

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **错误截图**：小程序控制台截图
2. **云函数日志**：云开发控制台日志
3. **用户数据**：用户_id和unionid
4. **复现步骤**：详细描述问题复现步骤

联系方式：
- 开发团队：际华协同办公平台技术组
- 文档版本：v1.0
- 最后更新：2025-12-19

---

**🎉 恭喜！UnionID注册方案已准备就绪，请按照本文档完成部署和测试！**
