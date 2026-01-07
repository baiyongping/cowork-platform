# wechat_sessions 集合创建指南

**日期**: 2026-01-02  
**环境**: 生产环境 (cowork-9gg9oocb516be5fb)

---

## 🔴 问题描述

生产环境缺少 `wechat_sessions` 集合，导致微信绑定功能报错：

```
[ResourceNotFound] Db or Table not exist. 
Please check your request, but if the problem cannot be solved, contact us.
```

## ✅ 解决方案

### 方法一：通过控制台手动创建（推荐）

#### 步骤 1: 访问控制台
打开CloudBase控制台数据库页面：

```
https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc
```

#### 步骤 2: 创建集合
1. 点击右上角 **"新建集合"** 按钮
2. 输入集合名称：`wechat_sessions`
3. 点击 **"确定"** 创建

#### 步骤 3: 配置权限（重要）
1. 在集合列表中找到 `wechat_sessions`
2. 点击 **"权限设置"**
3. 选择以下权限模式：

**推荐权限配置**:
```
所有用户可读，仅创建者可读写
```

或者使用自定义安全规则：
```json
{
  "read": true,
  "write": "auth.uid != null"
}
```

#### 步骤 4: 添加测试数据（可选）
为了确保集合正常工作，可以手动添加一条测试数据：

```json
{
  "sceneId": "test_init",
  "type": "init",
  "status": "init",
  "createdAt": "2026-01-02T23:30:00.000Z",
  "expiresAt": "2026-01-02T23:35:00.000Z"
}
```

---

### 方法二：通过云函数自动创建

如果控制台创建失败，可以创建一个临时云函数来初始化集合：

#### 创建云函数文件

**文件路径**: `cloudfunctions/init-wechat-sessions/index.js`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 创建集合（插入第一条数据会自动创建）
    const result = await db.collection('wechat_sessions').add({
      data: {
        sceneId: 'init_session',
        type: 'init',
        status: 'init',
        createdAt: db.serverDate(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    
    console.log('wechat_sessions 集合创建成功:', result);
    
    return {
      success: true,
      message: 'wechat_sessions 集合创建成功',
      id: result._id
    };
  } catch (error) {
    console.error('创建集合失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

#### 部署并调用

```bash
# 1. 部署云函数（使用 CloudBase MCP 工具）
createFunction({
  func: {
    name: 'init-wechat-sessions',
    handler: 'index.main',
    runtime: 'Nodejs18.15'
  },
  functionRootPath: 'd:/project/cowork12-21/cloudfunctions'
})

# 2. 调用云函数
invokeFunction({
  name: 'init-wechat-sessions',
  data: {}
})

# 3. 删除临时云函数（可选）
```

---

## 📋 集合结构说明

### wechat_sessions 集合

**用途**: 存储微信绑定会话信息（PC端生成二维码、扫码绑定等）

**字段结构**:

| 字段 | 类型 | 必填 | 说明 | 示例 |
|-----|------|-----|------|------|
| `_id` | String | 是 | 文档ID（自动生成） | `"6782abcd..."` |
| `sceneId` | String | 是 | 场景值ID（唯一） | `"bind_1735807465_abc123"` |
| `type` | String | 是 | 会话类型 | `"bind"`, `"login"` |
| `userId` | String | 是 | 系统用户ID | `"user_001"` |
| `username` | String | 是 | 用户名 | `"zhangsan"` |
| `status` | String | 是 | 状态 | `"pending"`, `"scanned"`, `"completed"`, `"expired"` |
| `openid` | String | 否 | 微信OpenID | `"oXXXXXXXXXXXXX"` |
| `unionid` | String | 否 | 微信UnionID | `"uXXXXXXXXXXXXX"` |
| `createdAt` | Date | 是 | 创建时间 | `"2026-01-02T23:30:00.000Z"` |
| `expiresAt` | Date | 是 | 过期时间（默认5分钟） | `"2026-01-02T23:35:00.000Z"` |
| `scannedAt` | Date | 否 | 扫码时间 | `"2026-01-02T23:31:00.000Z"` |
| `confirmedAt` | Date | 否 | 确认时间 | `"2026-01-02T23:32:00.000Z"` |

### 状态流转说明

```
pending (待扫码)
   ↓ (用户扫码)
scanned (已扫码)
   ↓ (用户确认绑定)
completed (已完成)

或者

pending → expired (超时过期)
```

---

## 🧪 验证步骤

### 1. 检查集合是否创建成功

访问控制台数据库页面：
```
https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/wechat_sessions
```

如果能打开，说明集合创建成功。

### 2. 测试微信绑定功能

1. 访问生产环境：https://jihuadz.xin
2. 登录系统
3. 进入 **个人设置** → **绑定微信**
4. 点击 **"立即绑定"** 按钮
5. 检查是否能正常生成二维码

**预期结果**:
- ✅ 成功生成二维码
- ✅ 二维码可以正常扫描
- ✅ 扫码后能跳转到绑定确认页面

### 3. 检查数据库记录

在控制台查看 `wechat_sessions` 集合，应该能看到新创建的会话记录：

```json
{
  "_id": "xxx",
  "sceneId": "bind_1735807465_xxx",
  "type": "bind",
  "userId": "xxx",
  "username": "xxx",
  "status": "pending",
  "createdAt": "2026-01-02T23:30:00.000Z",
  "expiresAt": "2026-01-02T23:35:00.000Z"
}
```

---

## 🔐 权限配置建议

### 推荐权限规则

```json
{
  "read": true,
  "write": "auth.uid != null"
}
```

**说明**:
- **read: true** - 允许所有用户读取（扫码需要读取session信息）
- **write: auth.uid != null** - 只有已登录用户可以写入

### 安全注意事项

1. ✅ 不要设置为 `"read": false`，否则扫码时无法读取session信息
2. ✅ 可以设置 TTL（生存时间）自动清理过期数据
3. ✅ 建议定期清理 `status: 'expired'` 的过期记录

---

## 📊 索引配置（可选）

为了提升查询性能，建议创建以下索引：

### 1. sceneId 唯一索引
```json
{
  "sceneId": 1
}
```
- 类型：唯一索引
- 用途：快速查找特定场景的session

### 2. 状态+过期时间索引
```json
{
  "status": 1,
  "expiresAt": 1
}
```
- 类型：复合索引
- 用途：定期清理过期记录

### 3. 用户ID索引
```json
{
  "userId": 1
}
```
- 类型：普通索引
- 用途：查询用户的绑定记录

---

## 🎯 完成检查清单

创建集合后，请确认以下事项：

- [ ] `wechat_sessions` 集合已创建
- [ ] 集合权限配置正确（所有用户可读，仅创建者可写）
- [ ] 索引已创建（可选）
- [ ] 已测试微信绑定功能
- [ ] 二维码能正常生成
- [ ] 扫码后能正常跳转
- [ ] 绑定流程完整可用

---

## 🔗 相关资源

- **数据库控制台**: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc
- **集合详情**: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc/collection/wechat_sessions
- **云函数控制台**: https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/scf/detail?id=wechat-bind&NameSpace=cowork-9gg9oocb516be5fb

---

## 💡 故障排除

### 问题 1: 控制台无法创建集合
**解决**: 检查是否有数据库管理权限，或联系管理员

### 问题 2: 集合创建成功但仍然报错
**解决**: 
1. 清除浏览器缓存
2. 重新生成二维码
3. 检查云函数日志

### 问题 3: 权限配置错误
**解决**: 
1. 进入集合权限设置
2. 选择 "所有用户可读，仅创建者可读写"
3. 保存设置

---

**创建时间**: 2026-01-02 23:30  
**环境**: 生产环境 (cowork-9gg9oocb516be5fb)  
**状态**: 待执行
