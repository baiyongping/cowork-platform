# 微信扫码登录 - 测试与部署文档

## 一、部署前准备

### 1. 环境要求
- CloudBase环境: `cowork-9gg9oocb516be5fb`
- Node.js版本: 14+
- 前端依赖: `qrcode.react`

### 2. 安装前端依赖
```bash
npm install qrcode.react
```

### 3. 数据库集合创建

#### 创建wechat_sessions集合
```javascript
// 在CloudBase控制台执行
db.createCollection('wechat_sessions');

// 创建索引
db.collection('wechat_sessions').createIndex({
  sceneId: 1
});

db.collection('wechat_sessions').createIndex({
  expiresAt: 1
});
```

#### users集合字段检查
确保users集合包含以下字段:
- `wechatOpenId` (string) - 微信OpenID
- `wechatBoundAt` (date) - 绑定时间

如果没有,运行迁移脚本:
```bash
# 在云函数中执行
node database/migrations/add-wechat-login-fields.js
```

## 二、云函数部署

### 1. 部署wechat-bind云函数

```bash
# 使用CloudBase CLI
tcb fn deploy wechat-bind --dir ./cloudfunctions/wechat-bind
```

或使用getFunctionList和createFunction MCP工具:
```javascript
// 1. 查询现有云函数
getFunctionList({ action: 'list' })

// 2. 创建云函数
createFunction({
  func: {
    name: 'wechat-bind',
    handler: 'index.main',
    runtime: 'Nodejs14.18',
    description: '微信绑定云函数'
  },
  functionRootPath: 'd:/project/cowork12-21/cloudfunctions',
  force: true
})
```

### 2. 部署wechat-login云函数

```bash
# 使用CloudBase CLI
tcb fn deploy wechat-login --dir ./cloudfunctions/wechat-login
```

或使用MCP工具:
```javascript
createFunction({
  func: {
    name: 'wechat-login',
    handler: 'index.main',
    runtime: 'Nodejs14.18',
    description: '微信扫码登录云函数'
  },
  functionRootPath: 'd:/project/cowork12-21/cloudfunctions',
  force: true
})
```

### 3. 验证部署
```javascript
// 测试wechat-bind
wx.cloud.callFunction({
  name: 'wechat-bind',
  data: {
    action: 'generateScene',
    userId: 'test-user-id',
    token: 'test-token'
  },
  success: console.log,
  fail: console.error
});

// 测试wechat-login
wx.cloud.callFunction({
  name: 'wechat-login',
  data: {
    action: 'generateLoginScene'
  },
  success: console.log,
  fail: console.error
});
```

## 三、功能测试

### 测试场景1: 微信绑定流程

#### PC端 - 生成二维码
```typescript
// 1. 生成绑定Scene
const res = await window.cloudbase.callFunction({
  name: 'wechat-bind',
  data: {
    action: 'generateScene',
    userId: currentUser.userId,
    token: currentUser.token
  }
});

console.log('Scene ID:', res.result.data.sceneId);
// 输出示例: bind_1735545600000_abc123xyz
```

#### PC端 - 轮询状态
```typescript
// 2. 每2秒检查一次
const checkStatus = async (sceneId) => {
  const res = await window.cloudbase.callFunction({
    name: 'wechat-bind',
    data: {
      action: 'checkStatus',
      sceneId
    }
  });
  
  console.log('状态:', res.result.data.status);
  // pending -> completed
};
```

#### 小程序端 - 确认绑定
```typescript
// 3. 扫码后确认
wx.cloud.callFunction({
  name: 'wechat-bind',
  data: {
    action: 'confirmBind',
    sceneId: 'bind_1735545600000_abc123xyz'
  },
  success: (res) => {
    console.log('绑定结果:', res.result);
    // { code: 200, message: '绑定成功' }
  }
});
```

### 测试场景2: 微信登录流程

#### PC端 - 生成登录二维码
```typescript
// 1. 生成登录Scene
const res = await window.cloudbase.callFunction({
  name: 'wechat-login',
  data: {
    action: 'generateLoginScene'
  }
});

console.log('Login Scene ID:', res.result.data.sceneId);
// 输出示例: login_1735545600000_xyz789abc
```

#### PC端 - 轮询登录状态
```typescript
// 2. 检查登录状态
const checkLoginStatus = async (sceneId) => {
  const res = await window.cloudbase.callFunction({
    name: 'wechat-login',
    data: {
      action: 'checkLoginStatus',
      sceneId
    }
  });
  
  if (res.result.data.status === 'completed') {
    console.log('Token:', res.result.data.token);
    console.log('User:', res.result.data.user);
  }
};
```

#### 小程序端 - 确认登录
```typescript
// 3. 扫码后确认登录
wx.cloud.callFunction({
  name: 'wechat-login',
  data: {
    action: 'confirmLogin',
    sceneId: 'login_1735545600000_xyz789abc'
  },
  success: (res) => {
    console.log('登录确认:', res.result);
    // { code: 200, message: '登录确认成功' }
  }
});
```

### 测试场景3: 使用模拟器测试

#### 1. 打开模拟器
```typescript
import WechatScanSimulator from '@/components/WechatScanSimulator';

// 在测试页面中
<WechatScanSimulator onClose={() => setShowSimulator(false)} />
```

#### 2. 测试步骤
1. 在PC端生成二维码，复制Scene ID
2. 打开模拟器，粘贴Scene ID
3. 选择操作类型（绑定/登录）
4. 点击"模拟扫码"
5. 点击"确认绑定/登录"
6. 查看结果

### 测试场景4: 异常情况测试

#### 二维码过期
```typescript
// 等待6分钟后检查
const res = await window.cloudbase.callFunction({
  name: 'wechat-bind',
  data: {
    action: 'checkStatus',
    sceneId: 'expired-scene-id'
  }
});

console.log(res.result);
// { code: 410, message: '二维码已过期' }
```

#### 重复绑定
```typescript
// 尝试绑定已绑定的OpenID到其他账号
wx.cloud.callFunction({
  name: 'wechat-bind',
  data: {
    action: 'confirmBind',
    sceneId: 'bind_xxx'
  },
  success: (res) => {
    console.log(res.result);
    // { code: 409, message: '该微信已绑定其他账号' }
  }
});
```

#### 未绑定微信登录
```typescript
// 使用未绑定的OpenID尝试登录
wx.cloud.callFunction({
  name: 'wechat-login',
  data: {
    action: 'confirmLogin',
    sceneId: 'login_xxx'
  },
  success: (res) => {
    console.log(res.result);
    // { code: 404, message: '该微信未绑定任何账号', data: { needBind: true } }
  }
});
```

## 四、集成到现有系统

### 1. 登录页面集成

修改`LoginPage.tsx`:
```typescript
import WechatQRLogin from '@/components/WechatQRLogin';

const [loginMethod, setLoginMethod] = useState<'password' | 'wechat'>('password');

// 在登录表单下方添加切换按钮
{loginMethod === 'password' ? (
  <>
    {/* 原有的密码登录表单 */}
    <button onClick={() => setLoginMethod('wechat')}>
      微信扫码登录
    </button>
  </>
) : (
  <WechatQRLogin 
    onLoginSuccess={handleLoginSuccess}
    onSwitchToPassword={() => setLoginMethod('password')}
  />
)}
```

### 2. 个人信息页面集成

创建或修改个人信息页面:
```typescript
import WechatBinding from '@/components/WechatBinding';

const PersonalInfo = () => {
  const [showBinding, setShowBinding] = useState(false);
  const user = useAuthStore(state => state.user);

  return (
    <div>
      {/* 微信绑定状态 */}
      <div className="flex items-center justify-between">
        <span>微信账号</span>
        {user.wechatOpenId ? (
          <span>已绑定</span>
        ) : (
          <button onClick={() => setShowBinding(true)}>
            立即绑定
          </button>
        )}
      </div>

      {/* 绑定弹窗 */}
      {showBinding && (
        <WechatBinding
          userId={user.userId}
          token={user.token}
          onBindSuccess={() => {
            setShowBinding(false);
            // 刷新用户信息
          }}
        />
      )}
    </div>
  );
};
```

## 五、监控与维护

### 1. 日志查看
```bash
# 查看wechat-bind日志
tcb fn log wechat-bind

# 查看wechat-login日志
tcb fn log wechat-login
```

### 2. 性能监控
- 查看云函数调用次数
- 监控平均响应时间
- 检查错误率

### 3. 定期清理
创建定时清理云函数:
```javascript
// cloudfunctions/clean-expired-sessions/index.js
exports.main = async (event, context) => {
  const db = cloud.database();
  const now = new Date();
  
  const result = await db.collection('wechat_sessions')
    .where({
      expiresAt: db.command.lt(now)
    })
    .remove();
  
  return { removed: result.stats.removed };
};
```

配置定时触发器(每小时执行):
```json
{
  "triggers": [
    {
      "name": "clean-expired-sessions-trigger",
      "type": "timer",
      "config": "0 * * * * * *"
    }
  ]
}
```

## 六、问题排查

### 常见问题

#### 1. 二维码生成失败
**原因**: 云函数未部署或参数错误
**解决**: 
- 检查云函数是否部署
- 验证传入的userId和token

#### 2. 轮询无响应
**原因**: Scene ID错误或网络问题
**解决**:
- 检查Scene ID格式
- 查看云函数日志
- 验证网络连接

#### 3. 绑定失败
**原因**: OpenID已绑定或Session过期
**解决**:
- 检查OpenID是否重复
- 刷新二维码重试

#### 4. 登录失败
**原因**: 微信未绑定或账号状态异常
**解决**:
- 检查是否已绑定微信
- 验证账号状态(isActive, approvalStatus)

### 调试技巧

#### 1. 开启详细日志
```javascript
// 在云函数中添加
console.log('[DEBUG]', {
  action: event.action,
  sceneId: event.sceneId,
  timestamp: new Date().toISOString()
});
```

#### 2. 使用模拟器
- 在测试环境使用WechatScanSimulator
- 无需真实小程序即可测试

#### 3. 数据库检查
```javascript
// 查看Session记录
db.collection('wechat_sessions')
  .where({ sceneId: 'xxx' })
  .get()
  .then(console.log);
```

## 七、上线检查清单

### 部署前
- [ ] 云函数已部署
- [ ] 数据库集合已创建
- [ ] 索引已创建
- [ ] 前端依赖已安装
- [ ] 功能测试通过

### 功能测试
- [ ] 生成二维码
- [ ] 绑定微信
- [ ] 微信登录
- [ ] 解绑微信
- [ ] 二维码过期处理
- [ ] 重复绑定防护
- [ ] 异常情况处理

### 性能测试
- [ ] 并发用户测试
- [ ] 轮询性能测试
- [ ] 数据库查询优化

### 安全测试
- [ ] Token验证
- [ ] OpenID唯一性
- [ ] 过期时间控制
- [ ] 权限验证

### 监控配置
- [ ] 云函数监控
- [ ] 错误告警
- [ ] 定时清理任务

## 八、后续优化建议

1. **WebSocket实时推送**: 替代轮询,提升用户体验
2. **Redis缓存**: 缓存Session,减少数据库压力
3. **多语言支持**: 支持英文、繁体中文等
4. **小程序码**: 替代文本Scene ID
5. **统计分析**: 记录使用数据,优化流程

---

**完成时间**: 2025-12-31
**版本**: v1.0
**负责人**: AI开发助手
