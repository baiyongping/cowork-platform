# OpenID绑定系统部署指南

## 📋 部署完成清单

### ✅ 已完成的部署内容

1. **前端页面**
   - ✅ `miniprogram/pages/bind/bind.wxml` - 绑定页面模板
   - ✅ `miniprogram/pages/bind/bind.js` - 绑定页面逻辑
   - ✅ `miniprogram/pages/bind/bind.wxss` - 绑定页面样式
   - ✅ `miniprogram/pages/bind/bind.json` - 绑定页面配置

2. **云函数**
   - ✅ `cloudfunctions/bindWxOpenId/index.js` - 绑定云函数主逻辑
   - ✅ `cloudfunctions/bindWxOpenId/package.json` - 依赖配置
   - ✅ `cloudfunctions/bindWxOpenId/config.json` - 云函数配置
   - ✅ 云函数已成功部署到云端

3. **应用配置**
   - ✅ `miniprogram/app.js` - 添加自动登录逻辑
   - ✅ `miniprogram/app.json` - 添加绑定页面路由

4. **数据库文档**
   - ✅ `database/update-users-for-wx-binding.md` - 数据库更新说明

---

## 🎯 OpenID绑定系统功能说明

### 核心功能

1. **账号绑定**
   - 用户使用企业账号（用户名+密码）绑定微信
   - 一个微信只能绑定一个企业账号
   - 一个企业账号只能绑定一个微信

2. **自动登录**
   - 绑定成功后，下次打开小程序自动登录
   - 无需再次输入用户名密码

3. **绑定状态检查**
   - 小程序启动时自动检查绑定状态
   - 未绑定自动跳转到绑定页面

4. **解绑功能**
   - 用户可以主动解绑微信（需在个人中心添加入口）

---

## 🔄 用户使用流程

### 首次使用流程

```
用户打开小程序
   ↓
检测到未绑定微信
   ↓
自动跳转到绑定页面
   ↓
输入用户名和密码
   ↓
绑定成功
   ↓
保存OpenID到用户记录
   ↓
进入主页（工作台）
```

### 已绑定用户流程

```
用户打开小程序
   ↓
自动检测OpenID
   ↓
已绑定 → 自动登录
   ↓
直接进入主页
```

---

## 📱 测试步骤

### 1. 在微信开发者工具中测试

#### 步骤1：启动项目
```bash
# 打开微信开发者工具
# 导入项目：e:/cowork
# AppID：wx79afc92f6fe01a31
```

#### 步骤2：测试绑定流程
1. 点击"编译"按钮
2. 如果用户未绑定，会自动跳转到 `pages/bind/bind` 页面
3. 输入测试用户名和密码（例如：`admin` / `123456`）
4. 点击"绑定账号"按钮
5. 绑定成功后自动跳转到首页

#### 步骤3：测试自动登录
1. 在微信开发者工具中点击"编译"按钮（重新启动）
2. 应该直接进入首页，不再显示绑定页面
3. 查看控制台日志，应该看到：
   ```
   ✅ 自动登录成功: { username: 'admin', name: '管理员', ... }
   ```

### 2. 真机测试（预览体验版）

#### 步骤1：上传体验版
1. 在微信开发者工具中点击"上传"
2. 输入版本号和备注
3. 点击"上传"

#### 步骤2：设置体验成员
1. 登录微信公众平台：https://mp.weixin.qq.com/
2. 进入"成员管理" > "体验成员"
3. 添加测试人员微信号

#### 步骤3：扫码测试
1. 在开发者工具点击"预览"
2. 使用手机微信扫描二维码
3. 测试绑定和自动登录功能

---

## 🛠️ 云函数API说明

### bindWxOpenId 云函数

#### 1. 绑定账号
```javascript
wx.cloud.callFunction({
  name: 'bindWxOpenId',
  data: {
    action: 'bind',
    username: '用户名',
    password: '密码'
  },
  success: res => {
    if (res.result.code === 200) {
      console.log('绑定成功:', res.result.data.user);
      console.log('Token:', res.result.data.token);
    }
  }
});
```

**返回结果**：
```json
{
  "code": 200,
  "message": "绑定成功",
  "data": {
    "user": {
      "_id": "user-001",
      "username": "admin",
      "name": "管理员",
      "email": "admin@jihua.com",
      "department": "管理部",
      "position": "系统管理员",
      "role": "admin"
    },
    "token": "dXNlci0wMDE6bzZfYm1qclBUbG02XzJzZ1Z0N2hNWk9QZkwyTToxNzM0NTA..."
  }
}
```

#### 2. 检查绑定状态
```javascript
wx.cloud.callFunction({
  name: 'bindWxOpenId',
  data: {
    action: 'checkBind'
  },
  success: res => {
    if (res.result.data.isBound) {
      console.log('已绑定用户:', res.result.data.user);
    }
  }
});
```

#### 3. 自动登录
```javascript
wx.cloud.callFunction({
  name: 'bindWxOpenId',
  data: {
    action: 'autoLogin'
  },
  success: res => {
    if (res.result.code === 200) {
      console.log('自动登录成功');
    } else if (res.result.data.needBind) {
      console.log('需要绑定账号');
    }
  }
});
```

#### 4. 解绑账号
```javascript
wx.cloud.callFunction({
  name: 'bindWxOpenId',
  data: {
    action: 'unbind'
  },
  success: res => {
    console.log('解绑成功');
  }
});
```

---

## 💾 数据库更新

### 方式1：自然更新（推荐）
无需手动操作，当用户首次绑定时，云函数会自动添加以下字段：
- `wxOpenId` - 微信OpenID
- `wxAppId` - 小程序AppID
- `wxBoundAt` - 绑定时间
- `lastLoginAt` - 最后登录时间

### 方式2：手动批量更新
如果需要为现有用户添加默认字段，可以在CloudBase控制台执行：

```javascript
db.collection('users')
  .where({
    wxOpenId: db.command.exists(false)
  })
  .update({
    data: {
      wxOpenId: null,
      wxAppId: null,
      wxBoundAt: null,
      lastLoginAt: null
    }
  });
```

---

## ⚙️ 配置清单

### 1. 云开发环境配置
- **环境ID**: `jihua-oa-dev-3goht9irae4d949f`
- **小程序AppID**: `wx79afc92f6fe01a31`
- **已在CloudBase控制台授权小程序访问**

### 2. 小程序配置
- **project.config.json**:
  ```json
  "cloudenv": "jihua-oa-dev-3goht9irae4d949f",
  "cloudfunctionRoot": "cloudfunctions/"
  ```

- **app.js**:
  ```javascript
  wx.cloud.init({
    env: 'jihua-oa-dev-3goht9irae4d949f',
    traceUser: true
  });
  ```

### 3. 云函数配置
- **运行环境**: Node.js 16.13
- **内存**: 256MB
- **超时**: 60秒
- **依赖**: wx-server-sdk ~2.6.3

---

## 🔒 安全建议

### 1. 密码加密
目前密码是明文存储（仅用于演示）。生产环境应使用：
```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);
```

### 2. Token安全
当前使用简单Base64编码。生产环境应使用JWT：
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId, openid }, SECRET_KEY, { expiresIn: '7d' });
```

### 3. 绑定限制
- ✅ 已实现：一个OpenID只能绑定一个账号
- ✅ 已实现：一个账号只能绑定一个OpenID
- 🔧 建议添加：绑定操作日志记录

### 4. 解绑验证
建议在解绑时增加二次确认：
```javascript
wx.showModal({
  title: '确认解绑',
  content: '解绑后需要重新输入用户名密码登录',
  success: res => {
    if (res.confirm) {
      // 执行解绑
    }
  }
});
```

---

## 📝 下一步开发建议

### 1. 添加解绑入口
在 `pages/profile/profile.wxml` 中添加：
```html
<view class="setting-item" bindtap="unbindWechat">
  <text class="item-label">解绑微信</text>
  <text class="item-arrow">></text>
</view>
```

### 2. 添加绑定通知
绑定成功后发送模板消息通知管理员：
```javascript
cloud.openapi.subscribeMessage.send({
  touser: adminOpenId,
  templateId: 'xxx',
  data: {
    thing1: { value: user.name },
    time2: { value: new Date().toLocaleString() }
  }
});
```

### 3. 添加多因素认证
可以增加短信验证码或邮箱验证作为第二认证因素。

### 4. 添加登录日志
记录用户登录历史：
```javascript
db.collection('login_logs').add({
  data: {
    userId: user._id,
    openid: OPENID,
    loginAt: db.serverDate(),
    loginType: 'wechat_auto'
  }
});
```

---

## 🐛 常见问题

### Q: 绑定时提示"用户不存在"
**A**: 检查users集合中是否有该用户名，且 `isActive: true`

### Q: 绑定时提示"该微信号已绑定其他账号"
**A**: 该OpenID已经绑定了其他账号，需要先解绑

### Q: 自动登录失败
**A**: 检查：
1. 云函数是否部署成功
2. 环境ID是否正确
3. 控制台是否有错误日志

### Q: 密码验证失败
**A**: 确认users集合中的密码字段值是否正确

---

## 📞 技术支持

如遇到问题，请检查：
1. 微信开发者工具控制台日志
2. CloudBase云函数日志
3. 数据库记录是否正确

---

## 📄 相关文档

- [CloudBase云开发文档](https://docs.cloudbase.net/)
- [微信小程序文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [数据库更新说明](../database/update-users-for-wx-binding.md)
