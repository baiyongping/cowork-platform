# UnionID 注册测试用例

## 测试环境

- **小程序版本**：v3.0.0
- **基础库版本**：2.21.2+
- **测试设备**：
  - 开发工具（受限）
  - iOS 真机
  - Android 真机

---

## 测试用例 1：获取 UnionID

### 前置条件
- 小程序已绑定到微信开放平台
- 云函数 getUserIdentity 已部署

### 测试步骤
1. 打开小程序注册页面
2. 观察控制台日志

### 预期结果
```javascript
✅ 获取 code 成功: 071xxxxx
✅ getUserIdentity 返回: {
  code: 200,
  data: {
    openid: "oxxxxxx",
    unionid: "oGxxxxxx",  // ⭐ 关键：有 unionid
    hasUnionId: true
  }
}
```

### 失败情况
```javascript
// 情况1: 未绑定开放平台
{
  openid: "oxxxxxx",
  unionid: null,
  hasUnionId: false
}

// 情况2: 云函数错误
{
  code: 500,
  message: "获取用户身份失败"
}
```

---

## 测试用例 2：检查用户是否已注册

### 前置条件
- 云函数 checkUserExists 已部署
- 已获取 openid 和 unionid

### 测试步骤
1. 使用已注册用户的 unionid
2. 调用 checkUserExists 云函数

### 预期结果
```javascript
// 已注册
{
  code: 200,
  data: {
    exists: true,
    user: {
      _id: "xxx",
      openid: "oxxxxxx",
      unionid: "oGxxxxxx",
      name: "张三",
      status: "approved"
    }
  }
}

// 未注册
{
  code: 200,
  data: {
    exists: false,
    user: null
  }
}
```

---

## 测试用例 3：新用户注册（完整流程）

### 前置条件
- 使用从未注册过的微信号
- 所有云函数已部署

### 测试步骤
1. 打开注册页面
2. 点击头像按钮，选择头像
3. 输入昵称："测试昵称"
4. 输入姓名："测试用户"
5. 点击"提交注册"

### 预期结果
```javascript
// 1. 头像选择成功
✅ 头像选择成功: http://tmp/xxx.png

// 2. 昵称输入成功
✅ 昵称已输入: 测试昵称

// 3. 注册请求发送
📝 注册请求: {
  openid: "oxxxxxx",
  unionid: "oGxxxxxx",
  name: "测试用户",
  nickName: "测试昵称",
  hasAvatar: true,
  hasPhoneCode: false
}

// 4. 注册成功
{
  code: 200,
  message: "注册申请已提交，等待管理员审核",
  data: {
    _id: "xxx",
    hasUnionId: true,
    hasPhoneNumber: false
  }
}

// 5. 跳转到待审核页面
✅ 跳转到: /pages/pending/pending
```

### 验证数据库
打开云开发控制台，检查 users 集合：
```javascript
{
  _id: "xxx",
  openid: "oxxxxxx",
  unionid: "oGxxxxxx",  // ⭐ 关键
  name: "测试用户",
  nickName: "测试昵称",
  avatarUrl: "cloud://xxx/avatars/oGxxxxxx_xxx.png",
  role: "employee",
  status: "pending",
  createdAt: 1734567890000
}
```

---

## 测试用例 4：头像上传到云存储

### 前置条件
- 云存储已开通
- 云函数有上传权限

### 测试步骤
1. 选择头像（临时文件）
2. 提交注册
3. 观察控制台日志

### 预期结果
```javascript
// 1. 临时头像URL
avatarUrl: "http://tmp/xxx.png"

// 2. 上传成功
✅ 头像上传成功: cloud://jihua-xxx.xxx/avatars/oGxxxxxx_1734567890.png

// 3. 数据库记录
avatarUrl: "cloud://jihua-xxx.xxx/avatars/oGxxxxxx_1734567890.png"
```

### 失败降级
```javascript
⚠️ 头像上传失败,使用临时URL
avatarUrl: "http://tmp/xxx.png"  // 仍可注册
```

---

## 测试用例 5：手机号验证（可选功能）

### 前置条件
- 云函数有 getPhoneNumber 权限
- 页面添加手机号按钮

### 测试步骤
1. 点击"获取手机号"按钮
2. 微信弹窗授权
3. 点击"允许"
4. 提交注册

### 预期结果
```javascript
// 1. 获取手机号code
📞 获取手机号 code 成功: 071xxxxx

// 2. 注册请求
{
  unionid: "oGxxxxxx",
  phoneCode: "071xxxxx"
}

// 3. 云函数解密手机号
📞 获取手机号成功: 138****1234

// 4. 数据库记录
{
  phoneNumber: "13812341234",
  hasPhoneNumber: true
}
```

---

## 测试用例 6：重复注册拦截

### 前置条件
- 用户已注册

### 测试步骤
1. 使用已注册的微信号
2. 打开注册页面

### 预期结果
```javascript
// 1. 检查用户状态
✅ checkUserExists 返回: {
  exists: true,
  user: { status: "approved" }
}

// 2. 自动跳转
✅ 跳转到: /pages/tasks/tasks

// 如果尝试手动注册:
❌ 用户已存在
{
  code: 400,
  message: "您已注册,请直接登录"
}
```

---

## 测试用例 7：UnionID 索引唯一性

### 前置条件
- 数据库已创建 unionid_unique 索引

### 测试步骤
1. 在数据库中手动插入相同 unionid 的记录
2. 观察错误

### 预期结果
```
E11000 duplicate key error collection: users index: unionid_unique
```

---

## 测试用例 8：兼容性测试（无 UnionID）

### 前置条件
- 小程序未绑定开放平台（模拟场景）

### 测试步骤
1. 注册新用户
2. 观察是否能正常注册

### 预期结果
```javascript
// 1. 获取身份信息
{
  openid: "oxxxxxx",
  unionid: null,  // ⚠️ 无 UnionID
  hasUnionId: false
}

// 2. 弹窗提示
⚠️ 未获取到 UnionID
系统将使用 OpenID 作为标识

// 3. 仍可正常注册
{
  openid: "oxxxxxx",
  unionid: null,  // 兼容模式
  name: "测试用户"
}
```

---

## 测试用例 9：不同审核状态的跳转

### 9.1 待审核状态
```javascript
user.status = "pending"
→ 跳转: /pages/pending/pending?title=注册审核中
```

### 9.2 审核拒绝
```javascript
user.status = "rejected"
user.rejectReason = "信息不完整"
→ 跳转: /pages/pending/pending?title=审核未通过&subtitle=信息不完整
```

### 9.3 账号禁用
```javascript
user.isActive = false
→ 弹窗: 账号已禁用，请联系管理员
```

### 9.4 审核通过
```javascript
user.status = "approved"
→ 跳转: /pages/tasks/tasks
```

---

## 测试用例 10：真机测试（重要）

### iOS 设备测试
- [ ] 获取 UnionID 成功
- [ ] 头像选择正常
- [ ] 昵称输入正常
- [ ] 注册流程完整
- [ ] 页面跳转正常

### Android 设备测试
- [ ] 获取 UnionID 成功
- [ ] 头像选择正常
- [ ] 昵称输入正常
- [ ] 注册流程完整
- [ ] 页面跳转正常

---

## 性能测试

### 云函数响应时间
- getUserIdentity: < 500ms
- checkUserExists: < 300ms
- registerEmployee: < 1000ms

### 网络异常测试
- [ ] 弱网环境（3G）
- [ ] 断网重连
- [ ] 超时重试

---

## 验收标准

### 功能完整性
- [x] 能获取 OpenID
- [x] 能获取 UnionID（如果绑定）
- [x] 能选择头像
- [x] 能输入昵称
- [x] 能提交注册
- [x] 能拦截重复注册
- [x] 能处理不同审核状态

### 数据完整性
- [x] openid 必须存在
- [x] unionid 优先存在（如绑定）
- [x] 头像已上传到云存储
- [x] 用户信息完整

### 用户体验
- [x] 操作流程顺畅
- [x] 错误提示友好
- [x] 页面跳转自然
- [x] 加载状态清晰

---

**测试负责人**：_________  
**测试时间**：_________  
**测试结果**：✅ 通过 / ❌ 未通过  
**备注**：_________
