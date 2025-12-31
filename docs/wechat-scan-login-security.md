# 微信扫码登录 - 安全优化文档

## 已实现的安全措施

### 1. 过期处理

#### Scene有效期控制
- **有效期**: 5分钟
- **检查时机**: 
  - 生成时设置`expiresAt`字段
  - 每次查询状态时检查是否过期
  - 过期后返回410状态码

```javascript
// 示例代码
const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟

// 检查过期
if (new Date() > new Date(session.expiresAt)) {
  return {
    code: 410,
    message: '二维码已过期',
    data: { status: 'expired' }
  };
}
```

#### 自动清理机制
- **完成后删除**: 登录成功后立即删除Session记录
- **建议**: 配置定时任务清理过期Session

```javascript
// 登录成功后删除
await db.collection('wechat_sessions').doc(session._id).remove();
```

### 2. 防重复绑定

#### OpenID唯一性检查
```javascript
// 检查该OpenID是否已绑定其他账号
const existingUser = await db.collection('users')
  .where({ 
    wechatOpenId: openid,
    _id: _.neq(session.userId) // 排除当前要绑定的用户
  })
  .get();

if (existingUser.data.length > 0) {
  return {
    code: 409,
    message: '该微信已绑定其他账号'
  };
}
```

### 3. 状态流转控制

#### Scene状态机
```
pending (待扫码)
    ↓
scanned (已扫码，仅绑定使用)
    ↓
completed (已完成)
```

#### 防止重复操作
- 状态检查: 只有`pending`状态才能进行操作
- 完成后删除: 防止Session被重复使用

### 4. 权限验证

#### 绑定操作
```javascript
// 验证Token和用户身份
const userResult = await db.collection('users').doc(userId).get();
if (!userResult.data || userResult.data.length === 0) {
  return {
    code: 404,
    message: '用户不存在'
  };
}
```

#### 登录操作
```javascript
// 检查用户状态
if (!user.isActive) {
  return {
    code: 403,
    message: '账号已被禁用'
  };
}

if (user.approvalStatus !== 'approved') {
  return {
    code: 403,
    message: '账号审核未通过'
  };
}
```

### 5. 错误处理

#### 完整的错误分类
```javascript
// 400: 参数错误
if (!sceneId) {
  return { code: 400, message: '缺少sceneId' };
}

// 404: 资源不存在
if (sessionResult.data.length === 0) {
  return { code: 404, message: '会话不存在' };
}

// 409: 冲突（重复绑定）
if (existingUser.data.length > 0) {
  return { code: 409, message: '该微信已绑定其他账号' };
}

// 410: 已过期
if (new Date() > new Date(session.expiresAt)) {
  return { code: 410, message: '二维码已过期' };
}

// 500: 服务器错误
catch (error) {
  return { code: 500, message: '操作失败: ' + error.message };
}
```

### 6. 前端安全措施

#### 轮询频率控制
```javascript
// 每2秒轮询一次，避免过于频繁
const pollInterval = setInterval(async () => {
  // 检查状态
}, 2000);
```

#### 自动停止轮询
- 成功后停止
- 过期后停止
- 错误后停止
- 组件卸载时清理

```javascript
return () => clearInterval(pollInterval);
```

#### 用户友好的状态提示
- 待扫码: 显示二维码+说明
- 已扫码: 加载动画
- 成功: 成功图标+自动跳转
- 过期: 刷新按钮
- 错误: 重试按钮

## 推荐的额外安全措施

### 1. 数据库索引优化
```javascript
// 为wechat_sessions创建索引
db.collection('wechat_sessions').createIndex({
  sceneId: 1,        // 快速查询
  expiresAt: 1       // 清理过期数据
});

db.collection('wechat_sessions').createIndex({
  status: 1,
  type: 1
});
```

### 2. 定时清理过期Session
```javascript
// 云函数定时触发器（每小时执行）
exports.main = async (event, context) => {
  const db = cloud.database();
  const now = new Date();
  
  // 删除过期的Session
  const result = await db.collection('wechat_sessions')
    .where({
      expiresAt: db.command.lt(now)
    })
    .remove();
  
  console.log(`清理了${result.stats.removed}条过期Session`);
  return { removed: result.stats.removed };
};
```

### 3. 日志记录
```javascript
// 记录重要操作
console.log('[微信绑定]', {
  userId: session.userId,
  openid: openid,
  timestamp: new Date().toISOString(),
  action: 'bind'
});

console.log('[微信登录]', {
  userId: user._id,
  username: user.username,
  timestamp: new Date().toISOString(),
  action: 'login'
});
```

### 4. IP地址记录（可选）
```javascript
// 在Session中记录IP
await db.collection('wechat_sessions').add({
  data: {
    // ... 其他字段
    clientIp: context.clientIP,
    userAgent: context.userAgent
  }
});
```

### 5. 多设备登录限制（可选）
```javascript
// 登录时踢掉旧Session
await db.collection('login_sessions')
  .where({
    userId: user._id,
    isActive: true
  })
  .update({
    data: {
      isActive: false,
      endedAt: new Date()
    }
  });
```

## 安全检查清单

### 云函数安全
- [x] Scene过期时间控制
- [x] 状态流转验证
- [x] 防重复绑定
- [x] 用户权限验证
- [x] 完整的错误处理
- [x] 完成后删除Session
- [ ] 定时清理过期Session（推荐）
- [ ] 操作日志记录（推荐）

### 前端安全
- [x] 轮询频率控制
- [x] 自动停止轮询
- [x] 错误状态处理
- [x] 友好的用户提示
- [x] Token验证

### 数据库安全
- [x] OpenID字段索引
- [ ] Session索引优化（推荐）
- [ ] 定期清理策略（推荐）

## 测试场景

### 正常流程
1. ✅ 用户生成二维码
2. ✅ 小程序扫码
3. ✅ 确认绑定/登录
4. ✅ 成功返回

### 异常流程
1. ✅ 二维码过期
2. ✅ 重复绑定
3. ✅ 无效Scene ID
4. ✅ 账号被禁用
5. ✅ 未绑定微信登录
6. ✅ 网络错误

## 性能优化

### 1. 减少数据库查询
```javascript
// 一次查询获取所有需要的数据
const session = await db.collection('wechat_sessions')
  .where({ sceneId })
  .field({
    status: true,
    userId: true,
    openid: true,
    expiresAt: true
  })
  .get();
```

### 2. 缓存策略（可选）
- 使用Redis缓存Session
- 减少数据库压力

### 3. 轮询优化
- 前端: 2秒轮询间隔
- 过期后自动停止
- WebSocket实时推送（可选）

## 总结

当前实现已包含核心安全措施:
- ✅ 过期处理
- ✅ 防重复绑定
- ✅ 状态流转控制
- ✅ 权限验证
- ✅ 完整错误处理

推荐增加的措施:
- 定时清理过期Session
- 操作日志记录
- 数据库索引优化
