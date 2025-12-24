# OpenID注册方案实施文档（个人开发者版）

## 📋 方案概述

由于个人开发者无法获得微信开放平台资质，本方案采用 **OpenID + 手机号** 的双重识别机制：

- **主键识别**：OpenID（小程序用户唯一标识）
- **辅助识别**：手机号（用于账号找回和跨设备登录）
- **优势**：无需开放平台，完全符合个人开发者权限

---

## 🗄️ 数据库设计

### users 集合结构（优化版）

```javascript
{
  _id: "自动生成的MongoDB ID",
  _openid: "微信OpenID（主键）",  // ⭐ 系统唯一识别码
  phoneNumber: "手机号（辅助识别）",  // 可选，但强烈推荐
  nickName: "用户昵称",
  avatarUrl: "头像URL",
  departments: ["部门数组"],
  roles: ["角色数组"],
  status: "active|pending|inactive",
  approvalStatus: "pending|approved|rejected",
  createdAt: "注册时间",
  updatedAt: "更新时间",
  lastLoginAt: "最后登录时间"
}
```

### 关键字段说明

| 字段 | 类型 | 说明 | 必填 | 索引 |
|------|------|------|------|------|
| `_openid` | String | 微信OpenID，系统主键 | ✅ 是 | ✅ 唯一索引 |
| `phoneNumber` | String | 手机号，辅助识别 | ⚠️ 推荐 | ✅ 唯一索引 |
| `nickName` | String | 用户昵称 | ✅ 是 | ❌ |
| `avatarUrl` | String | 头像云存储URL | ✅ 是 | ❌ |

### 索引配置

```javascript
// 1. OpenID 唯一索引（CloudBase自动创建）
{
  "_openid": 1
}

// 2. 手机号唯一索引（需手动创建，稀疏索引）
{
  "phoneNumber": 1
}
// 配置: unique: true, sparse: true (允许null值)

// 3. 状态查询索引（可选优化）
{
  "status": 1,
  "approvalStatus": 1
}
```

---

## 🔧 云函数修改方案

### 1. getUserIdentity 云函数（简化版）

**文件位置**: `cloudfunctions/getUserIdentity/index.js`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    // ⭐ 直接从上下文获取 OpenID
    const openid = wxContext.OPENID;
    
    if (!openid) {
      throw new Error('无法获取用户OpenID');
    }

    return {
      success: true,
      openid,
      message: 'OpenID获取成功'
    };

  } catch (error) {
    console.error('getUserIdentity error:', error);
    return {
      success: false,
      message: error.message
    };
  }
};
```

**修改要点**：
- ✅ 移除 `code2session` API调用（无需AppSecret）
- ✅ 直接使用 `cloud.getWXContext().OPENID`
- ✅ 简化错误处理逻辑

---

### 2. checkUserExists 云函数（保持不变）

**文件位置**: `cloudfunctions/checkUserExists/index.js`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // ⭐ 使用 OpenID 查询用户
    const result = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();

    return {
      exists: result.data.length > 0,
      user: result.data[0] || null
    };

  } catch (error) {
    console.error('checkUserExists error:', error);
    return {
      exists: false,
      error: error.message
    };
  }
};
```

---

### 3. registerEmployee 云函数（增强版）

**文件位置**: `cloudfunctions/registerEmployee/index.js`

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { nickName, avatarUrl, phoneCode, departments, roles } = event;

  try {
    // 1. 验证必填参数
    if (!nickName || !avatarUrl) {
      throw new Error('昵称和头像不能为空');
    }

    // 2. 检查是否已注册（防止重复）
    const existingUser = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();

    if (existingUser.data.length > 0) {
      return {
        success: false,
        message: '该账号已注册，无需重复注册'
      };
    }

    // 3. 如果有 phoneCode，获取手机号
    let phoneNumber = null;
    if (phoneCode) {
      try {
        const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({
          code: phoneCode
        });
        phoneNumber = phoneRes.phoneInfo?.purePhoneNumber || phoneRes.phoneInfo?.phoneNumber;
        
        // 检查手机号是否已被使用
        if (phoneNumber) {
          const phoneCheck = await db.collection('users')
            .where({ phoneNumber })
            .limit(1)
            .get();
          
          if (phoneCheck.data.length > 0) {
            return {
              success: false,
              message: '该手机号已被其他账号绑定'
            };
          }
        }
      } catch (phoneError) {
        console.warn('获取手机号失败:', phoneError);
        // 手机号非必填，失败不影响注册
      }
    }

    // 4. 上传头像到云存储（如果是临时URL）
    let permanentAvatarUrl = avatarUrl;
    if (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://')) {
      try {
        const fileExt = avatarUrl.includes('.') ? avatarUrl.split('.').pop() : 'png';
        const cloudPath = `avatars/${openid}_${Date.now()}.${fileExt}`;
        
        // 下载临时文件
        const downloadRes = await cloud.downloadFile({
          fileID: avatarUrl
        });
        
        // 上传到云存储
        const uploadRes = await cloud.uploadFile({
          cloudPath,
          fileContent: downloadRes.fileContent
        });
        
        permanentAvatarUrl = uploadRes.fileID;
      } catch (uploadError) {
        console.warn('头像上传失败，使用原URL:', uploadError);
        // 上传失败不影响注册，保留临时URL
      }
    }

    // 5. 写入数据库
    const result = await db.collection('users').add({
      data: {
        _openid: openid,
        nickName,
        avatarUrl: permanentAvatarUrl,
        phoneNumber,
        departments: departments || [],
        roles: roles || ['employee'],
        status: 'pending',
        approvalStatus: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        lastLoginAt: db.serverDate()
      }
    });

    return {
      success: true,
      _id: result._id,
      message: phoneNumber 
        ? '注册成功，等待管理员审核' 
        : '注册成功（建议绑定手机号以便账号找回）'
    };

  } catch (error) {
    console.error('registerEmployee error:', error);
    return {
      success: false,
      message: error.message || '注册失败，请重试'
    };
  }
};
```

**增强功能**：
- ✅ 自动检测重复注册
- ✅ 手机号唯一性验证
- ✅ 临时头像自动上传云存储
- ✅ 友好的错误提示

---

## 📱 小程序前端修改

### 注册页面逻辑 (register.js)

**文件位置**: `miniprogram/pages/register/register.js`

```javascript
Page({
  data: {
    avatarUrl: '',
    nickName: '',
    phoneNumber: '',
    hasPhone: false,
    departments: ['市场部', '销售部', '技术部', '行政部'],
    departmentIndex: 0
  },

  onLoad() {
    // 页面加载时调用登录获取 OpenID
    this.wxLogin();
  },

  // ⭐ 简化的微信登录流程（无需code2session）
  async wxLogin() {
    wx.showLoading({ title: '登录中...', mask: true });
    
    try {
      // 1. 调用云函数获取 OpenID（云函数内部自动获取）
      const cloudRes = await wx.cloud.callFunction({
        name: 'getUserIdentity'
      });

      if (!cloudRes.result.success) {
        throw new Error(cloudRes.result.message || '获取用户信息失败');
      }

      const { openid } = cloudRes.result;
      
      // 2. 检查用户是否已注册
      const userRes = await wx.cloud.callFunction({
        name: 'checkUserExists'
      });

      if (userRes.result.exists) {
        // 已注册，直接跳转
        wx.showToast({ 
          title: '欢迎回来', 
          icon: 'success',
          success: () => {
            setTimeout(() => {
              wx.switchTab({ url: '/pages/opportunities/opportunities' });
            }, 1500);
          }
        });
      } else {
        // 未注册，保存 openid
        this.setData({ openid });
      }

    } catch (error) {
      console.error('登录失败:', error);
      wx.showModal({
        title: '登录失败',
        content: error.message || '请检查网络后重试',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 头像选择
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl });
  },

  // 昵称输入
  onNicknameChange(e) {
    this.setData({ nickName: e.detail.value.trim() });
  },

  // ⭐ 手机号获取（推荐但非必填）
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const phoneCode = e.detail.code;
      this.setData({ 
        phoneCode,
        hasPhone: true 
      });
      wx.showToast({ 
        title: '手机号验证成功', 
        icon: 'success' 
      });
    } else if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
      wx.showModal({
        title: '建议绑定手机号',
        content: '绑定手机号后可通过手机号找回账号，确定跳过吗？',
        confirmText: '绑定',
        cancelText: '跳过',
        success: (res) => {
          if (res.confirm) {
            // 用户点击"绑定"，重新触发授权
            // 需要用户再次点击授权按钮
          }
        }
      });
    }
  },

  // 部门选择
  onDepartmentChange(e) {
    this.setData({ departmentIndex: e.detail.value });
  },

  // ⭐ 注册提交
  async onRegister() {
    const { openid, avatarUrl, nickName, phoneCode, departments, departmentIndex } = this.data;

    // 验证必填项
    if (!openid) {
      wx.showToast({ title: '未获取到用户身份', icon: 'error' });
      return;
    }
    if (!nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (!avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'registerEmployee',
        data: {
          nickName,
          avatarUrl,
          phoneCode,  // 可能为空
          departments: [departments[departmentIndex]],
          roles: ['employee']
        }
      });

      if (result.result.success) {
        wx.showModal({
          title: '注册成功',
          content: result.result.message,
          showCancel: false,
          success: () => {
            wx.switchTab({ url: '/pages/opportunities/opportunities' });
          }
        });
      } else {
        throw new Error(result.result.message || '注册失败');
      }

    } catch (error) {
      console.error('注册失败:', error);
      wx.showModal({
        title: '注册失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  }
});
```

---

## 🚀 部署步骤

### 1. 创建手机号唯一索引

**方法一：CloudBase 控制台（推荐）**

```plaintext
1. 访问: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/db/doc
2. 选择 users 集合 → 索引 → 创建索引
3. 配置:
   - 索引名称: phone_unique
   - 索引字段: phoneNumber (升序)
   - ✅ 唯一索引
   - ✅ 稀疏索引（重要：允许null值）
```

**方法二：使用脚本**

```javascript
// scripts/create-phone-index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: 'jihua-oa-dev-3goht9irae4d949f' });
const db = cloud.database();

async function createIndex() {
  try {
    await db.collection('users').createIndex({
      keys: [{ name: 'phoneNumber', order: 1 }],
      options: {
        name: 'phone_unique',
        unique: true,
        sparse: true  // 关键：允许字段不存在
      }
    });
    console.log('✅ 手机号索引创建成功');
  } catch (error) {
    console.error('❌ 索引创建失败:', error);
  }
}

createIndex();
```

### 2. 更新云函数

```bash
# 部署所有云函数
cd e:\cowork\cloudfunctions

# 部署 getUserIdentity
cd getUserIdentity
npm install
cd ..

# 部署 registerEmployee
cd registerEmployee
npm install
cd ..

# 部署 checkUserExists
cd checkUserExists
npm install
cd ..

# 使用 CloudBase 工具部署
# 或在微信开发者工具中右键 → 上传并部署
```

### 3. 测试验证

**真机测试清单**：

- [ ] 新用户注册流程（不绑定手机号）
- [ ] 新用户注册流程（绑定手机号）
- [ ] 手机号重复绑定拦截
- [ ] 重复注册拦截
- [ ] 头像临时URL转永久URL
- [ ] 已注册用户自动跳转

---

## 🎯 方案优势

### ✅ 相比 UnionID 方案

| 特性 | OpenID方案 | UnionID方案 |
|------|-----------|------------|
| **个人开发者支持** | ✅ 完全支持 | ❌ 需要企业资质 |
| **配置复杂度** | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| **跨平台识别** | ❌ 仅限小程序 | ✅ 跨小程序/公众号 |
| **手机号辅助** | ✅ 支持 | ✅ 支持 |
| **用户找回账号** | ✅ 通过手机号 | ✅ 自动识别 |

### 🔐 安全性保障

1. **OpenID 唯一性**：微信保证每个小程序的OpenID唯一
2. **手机号验证**：可选的二次验证机制
3. **防重复注册**：云函数自动检测
4. **数据隔离**：CloudBase 安全规则自动隔离用户数据

### 📊 数据流程

```plaintext
小程序启动
    ↓
调用 wx.cloud.callFunction('getUserIdentity')
    ↓
云函数获取 wxContext.OPENID
    ↓
返回 OpenID 给前端
    ↓
检查用户是否已注册
    ↓
已注册 → 直接登录
未注册 → 填写资料注册
    ↓
可选：授权手机号
    ↓
提交注册信息
    ↓
云函数验证并写入数据库
    ↓
注册成功
```

---

## 🧪 测试用例

### 测试场景1: 新用户首次注册（无手机号）

**步骤**：
1. 打开小程序注册页面
2. 选择头像
3. 输入昵称
4. 跳过手机号授权
5. 点击"完成注册"

**预期结果**：
- ✅ 注册成功
- ✅ 提示"建议绑定手机号"
- ✅ 数据库创建用户记录（phoneNumber为空）

### 测试场景2: 新用户首次注册（绑定手机号）

**步骤**：
1. 打开小程序注册页面
2. 选择头像
3. 输入昵称
4. 点击"快速验证手机号"并授权
5. 点击"完成注册"

**预期结果**：
- ✅ 注册成功
- ✅ 数据库创建用户记录（含手机号）
- ✅ 可通过手机号查询用户

### 测试场景3: 重复注册拦截

**步骤**：
1. 已注册用户再次进入注册页面
2. 系统自动检测

**预期结果**：
- ✅ 自动跳转到主页
- ✅ 显示"欢迎回来"

### 测试场景4: 手机号重复绑定拦截

**步骤**：
1. 用户A绑定手机号 13800138000
2. 用户B尝试绑定相同手机号

**预期结果**：
- ✅ 显示错误："该手机号已被其他账号绑定"
- ✅ 注册失败

---

## ❓ 常见问题

### Q1: 用户换手机登录小程序会丢失账号吗？

**A**: 不会！OpenID与微信账号绑定，不随设备变化。

### Q2: 用户卸载小程序重新安装会变成新用户吗？

**A**: 不会！只要微信账号不变，OpenID永久不变。

### Q3: 如果用户没绑定手机号，如何找回账号？

**A**: 
- 方法1: 用户用同一个微信登录即可自动识别
- 方法2: 管理员后台通过昵称/部门手动查询
- 建议: 在用户首次登录时引导绑定手机号

### Q4: OpenID会泄露用户隐私吗？

**A**: 不会！OpenID是加密字符串，无法反推用户真实信息。

### Q5: 多个小程序可以共享用户数据吗？

**A**: 不能！每个小程序的OpenID不同。如需跨小程序，必须使用UnionID（需企业资质）。

---

## 📈 后续优化方向

### 阶段1: 当前方案（已实现）
- ✅ OpenID 主键识别
- ✅ 手机号辅助识别
- ✅ 基础注册流程

### 阶段2: 增强功能（可选）
- 🔄 手机号绑定/解绑功能
- 🔄 账号找回（通过手机号）
- 🔄 换绑手机号流程

### 阶段3: 高级功能（可选）
- 🔄 同一手机号多设备管理
- 🔄 登录日志记录
- 🔄 异常登录检测

---

## 📞 技术支持

遇到问题？请按以下步骤排查：

1. **检查云函数日志**
   - CloudBase 控制台 → 云函数 → 日志
   
2. **检查数据库索引**
   - CloudBase 控制台 → 数据库 → users → 索引
   
3. **检查用户数据**
   - 查询 users 集合，确认 _openid 和 phoneNumber 字段
   
4. **真机测试**
   - 开发工具可能无法模拟完整流程，请使用真机调试

---

## 🎉 总结

**OpenID + 手机号方案**是个人开发者的最佳选择：

- ✅ **无需企业资质** - 完全符合个人开发者权限
- ✅ **配置简单** - 无需开放平台配置
- ✅ **安全可靠** - 微信官方保障
- ✅ **用户体验好** - 一键注册，可选手机号
- ✅ **易于维护** - 代码简洁，逻辑清晰

按照本文档操作，您的小程序注册系统将完全满足业务需求！🚀
