# UnionID 注册方案 - 快速参考指南

## 🎯 核心概念

### UnionID vs OpenID

| 特性 | UnionID | OpenID |
|------|---------|--------|
| **唯一性范围** | 同一开放平台下所有应用 | 单个小程序内 |
| **适用场景** | 跨应用用户识别 | 单应用用户识别 |
| **获取条件** | 需绑定开放平台 | 无需额外配置 |
| **推荐用途** | 系统主键 | 备用标识 |

---

## 📋 快速实施（5步完成）

### 第1步：开放平台配置（5分钟）

```
1. 访问 https://open.weixin.qq.com/
2. 登录 → 管理中心
3. 绑定小程序
4. 等待生效（10-30分钟）
```

### 第2步：部署云函数（3分钟）

```bash
# 运行快速部署脚本
快速部署UnionID方案.bat

# 或手动部署
cd cloudfunctions/getUserIdentity && npm install
cd cloudfunctions/checkUserExists && npm install
cd cloudfunctions/registerEmployee && npm install
```

**在微信开发者工具中**：
1. 右键 `getUserIdentity` → 上传并部署
2. 右键 `checkUserExists` → 上传并部署
3. 右键 `registerEmployee` → 上传并部署

### 第3步：创建数据库索引（1分钟）

**云开发控制台**：
```
数据库 → users → 索引 → 添加索引

字段: unionid
类型: 升序 (1)
选项: ✅ unique (唯一) ✅ sparse (稀疏)
```

### 第4步：编译小程序（1分钟）

```
微信开发者工具 → 清除缓存 → 编译
```

### 第5步：真机测试（5分钟）

```
1. 预览 → 扫码
2. 打开注册页面
3. 选择头像 → 输入昵称 → 提交
4. 检查数据库是否有 unionid
```

---

## 🔧 关键代码片段

### 小程序端：获取 UnionID

```javascript
// pages/register/register.js

// 1. 获取 code
const loginRes = await wx.login();
const code = loginRes.code;

// 2. 调用云函数获取 unionid
const result = await wx.cloud.callFunction({
  name: 'getUserIdentity',
  data: { code }
});

const { openid, unionid } = result.result.data;
console.log('UnionID:', unionid);  // ⭐ 系统唯一标识
```

### 云函数：获取 UnionID

```javascript
// cloudfunctions/getUserIdentity/index.js

const result = await cloud.openapi.auth.code2Session({
  jsCode: code
});

return {
  openid: result.openid,
  unionid: result.unionid  // ⭐ 关键字段
};
```

### 数据库：查询用户

```javascript
// 优先使用 unionid
const user = await db.collection('users')
  .where({ 
    unionid: 'oGxxxxxx'  // ⭐ 唯一标识
  })
  .get();
```

---

## 🚨 常见问题速查

### Q1: unionid 为 null？

**检查清单**：
- [ ] 小程序是否绑定到开放平台？
- [ ] 绑定是否已生效（等待10-30分钟）？
- [ ] 是否在真机测试（开发工具可能不返回）？

**临时方案**：
系统会自动降级使用 OpenID，不影响注册。

---

### Q2: 云函数调用失败？

**检查清单**：
- [ ] 云函数是否已上传？
- [ ] config.json 是否配置 openapi 权限？
- [ ] 云开发环境是否正确？

**验证方法**：
```javascript
// 查看云函数日志
云开发 → 云函数 → getUserIdentity → 日志
```

---

### Q3: 头像上传失败？

**不影响注册**：系统会自动降级使用临时 URL。

**排查方法**：
```javascript
// 查看控制台
⚠️ 头像上传失败,使用临时URL
```

---

### Q4: 重复注册？

**正常行为**：这是索引生效的表现。

```javascript
{
  code: 400,
  message: "您已注册,请直接登录"
}
```

---

## 📊 数据结构

### users 集合字段

```javascript
{
  _id: "自动生成",
  openid: "oxxxxxx",           // 必须
  unionid: "oGxxxxxx",          // ⭐ 推荐（系统主键）
  name: "张三",                 // 必须
  nickName: "微信昵称",          // 必须
  avatarUrl: "cloud://...",     // 必须
  phoneNumber: "138****1234",   // 可选
  role: "employee",
  department: "市场部",
  status: "pending",            // pending/approved/rejected
  createdAt: 1734567890000
}
```

### 索引配置

```javascript
{
  name: "unionid_unique",
  keys: { unionid: 1 },
  options: {
    unique: true,   // 唯一
    sparse: true    // 允许 null（兼容旧数据）
  }
}
```

---

## 🔐 安全要点

### ✅ 正确做法

```javascript
// 1. 在云函数中获取 UnionID
const result = await cloud.openapi.auth.code2Session({ jsCode: code });

// 2. 不下发 session_key
return { 
  openid, 
  unionid,
  // ❌ 不要返回 sessionKey
};

// 3. 使用 UnionID 查询
db.collection('users').where({ unionid });
```

### ❌ 错误做法

```javascript
// ❌ 不要在前端写 AppSecret
const APPSECRET = 'xxx';

// ❌ 不要下发 session_key
return { sessionKey };

// ❌ 不要只用 OpenID（跨应用场景）
db.collection('users').where({ openid });  // 仅限单应用
```

---

## 📈 性能优化

### 云函数并发

```javascript
// ✅ 并行调用
const [identityRes, checkRes] = await Promise.all([
  wx.cloud.callFunction({ name: 'getUserIdentity', data: { code } }),
  wx.cloud.callFunction({ name: 'checkUserExists', data: { unionid } })
]);
```

### 数据库索引

```javascript
// ✅ 使用索引字段查询
db.collection('users').where({ unionid: 'xxx' });  // 快

// ❌ 未索引字段
db.collection('users').where({ nickName: 'xxx' });  // 慢
```

---

## 📞 技术支持

### 文档资源

- **实施文档**：`docs/UnionID注册方案实施文档.md`
- **测试用例**：`测试用例/UnionID注册测试用例.md`
- **部署脚本**：`快速部署UnionID方案.bat`

### 微信官方文档

- [小程序登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)
- [UnionID机制](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html)
- [获取用户信息](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/userProfile.html)

### 调试工具

```javascript
// 1. 云函数日志
云开发 → 云函数 → 日志

// 2. 数据库查询
云开发 → 数据库 → users

// 3. 小程序控制台
微信开发者工具 → 调试器 → Console
```

---

## ✅ 验收标准

### 基础功能（必须）

- [x] 能获取 OpenID
- [x] 能获取 UnionID（如果绑定）
- [x] 能选择头像并上传
- [x] 能输入昵称和姓名
- [x] 能提交注册
- [x] 能拦截重复注册

### 高级功能（可选）

- [ ] 手机号验证
- [ ] 头像裁剪
- [ ] 实名认证
- [ ] 邀请码注册

### 数据质量（推荐）

- [x] unionid 字段存在
- [x] 头像已上传云存储
- [x] 索引已创建
- [x] 数据完整性

---

**最后更新**：2025-12-19  
**版本**：v1.0  
**适用场景**：小程序用户注册系统
