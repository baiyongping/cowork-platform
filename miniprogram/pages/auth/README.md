# 微信扫码登录测试方案

## 📱 测试流程

### 1️⃣ 扫码启动
- 用微信扫描小程序码
- 路径: `pages/auth/welcome/welcome`
- 自动打开授权欢迎页

### 2️⃣ 授权登录
- 点击"授权登录"按钮
- 调用 `wx.getUserProfile()` 获取用户信息
- 自动调用云函数 `wxLogin` 获取 OpenID

### 3️⃣ 信息展示
- 显示用户头像 (圆形头像)
- 显示昵称
- 显示性别 (男/女/未知)
- 显示地区 (国家-省份-城市)
- 显示 OpenID (完整显示)

### 4️⃣ 确认保存
- 点击"确认登录"按钮
- 调用云函数保存用户信息到 `users` 集合
- 自动跳转到成功页

### 5️⃣ 登录成功
- 显示"登录成功"动画
- 3秒倒计时
- 自动跳转到首页

---

## 🗂️ 文件结构

```
pages/auth/
├── welcome/           # 欢迎授权页
│   ├── welcome.wxml
│   ├── welcome.wxss
│   ├── welcome.js
│   └── welcome.json
├── profile/           # 信息展示页
│   ├── profile.wxml
│   ├── profile.wxss
│   ├── profile.js
│   └── profile.json
└── success/           # 成功页
    ├── success.wxml
    ├── success.wxss
    ├── success.js
    └── success.json
```

---

## ☁️ 云函数

### wxLogin
- **路径**: `cloudfunctions/wxLogin/`
- **功能1**: 获取 OpenID (默认)
- **功能2**: 保存用户信息 (action='saveUser')

**返回格式**:
```javascript
{
  success: true,
  openid: "wx_xxxxxx",
  message: "操作成功"
}
```

---

## 💾 数据库

### users 集合
```javascript
{
  _id: "auto",
  _openid: "wx_openid",      // OpenID
  nickName: "微信昵称",
  avatarUrl: "头像URL",
  gender: 1,                 // 0未知 1男 2女
  country: "中国",
  province: "广东",
  city: "深圳",
  createdAt: Date,           // 创建时间
  lastLoginAt: Date          // 最后登录时间
}
```

---

## 🎨 UI设计

### 配色方案
- **主色**: `#667eea` (紫蓝色)
- **渐变**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **文字**: 白色/深灰色

### 交互效果
- ✅ 按钮阴影和圆角
- ✅ 头像边框和阴影
- ✅ 成功页动画 (scaleIn + fadeInUp)
- ✅ 3秒倒计时自动跳转

---

## 📝 小程序码配置

### 生成参数
- **路径**: `pages/auth/welcome/welcome`
- **宽度**: 430px (推荐)
- **参数**: 无需额外参数

### 生成方式
1. 微信公众平台 → 开发 → 开发管理 → 开发设置 → 小程序码
2. 或使用云开发控制台生成

---

## ✅ 测试清单

- [ ] 扫码打开欢迎页
- [ ] 点击授权获取用户信息
- [ ] 信息展示页显示正确
- [ ] OpenID 显示完整
- [ ] 点击确认保存成功
- [ ] 数据库 `users` 集合有记录
- [ ] 成功页倒计时正常
- [ ] 自动跳转到首页

---

## 🚀 部署步骤

1. **部署云函数**:
   ```bash
   cd cloudfunctions/wxLogin
   npm install
   # 上传并部署
   ```

2. **创建数据库集合**:
   - 集合名: `users`
   - 权限: 仅创建者可读写

3. **生成小程序码**:
   - 路径: `pages/auth/welcome/welcome`

4. **测试验证**:
   - 扫码测试完整流程
   - 检查数据库记录

---

## 🎯 核心优势

1. **简单直观**: 3个页面,流程清晰
2. **用户友好**: 每步都有明确反馈
3. **信息完整**: 获取所有基础信息 + OpenID
4. **数据持久**: 自动保存到云数据库
5. **视觉精美**: 渐变色 + 动画效果
