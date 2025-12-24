# Users集合字段更新 - 支持微信OpenID绑定

## 需要添加的字段

在 `users` 集合中添加以下字段以支持微信OpenID绑定:

```javascript
{
  // === 原有字段 ===
  _id: String,
  username: String,
  password: String,
  email: String,
  name: String,
  role: String,
  roles: Array,
  department: String,
  avatar: String,
  isActive: Boolean,
  approvalStatus: String,
  needChangePassword: Boolean,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date,
  
  // === 新增微信相关字段 ===
  wxOpenId: String,      // 微信OpenID（用于小程序登录）
  wxUnionId: String,     // 微信UnionID（可选，多端统一）
  wxBindTime: Date,      // 微信绑定时间
  wxNickname: String,    // 微信昵称（可选）
  wxAvatar: String       // 微信头像（可选）
}
```

## 字段说明

### wxOpenId
- **类型**: String
- **必填**: 否
- **默认值**: ""
- **说明**: 微信小程序的OpenID，用于自动登录
- **唯一性**: 应该是唯一的（同一个微信只能绑定一个账号）

### wxUnionId
- **类型**: String
- **必填**: 否
- **默认值**: ""
- **说明**: 微信UnionID，用于多端统一身份（微信公众号+小程序）

### wxBindTime
- **类型**: Date
- **必填**: 否
- **说明**: 首次绑定微信的时间

### wxNickname
- **类型**: String
- **必填**: 否
- **说明**: 微信昵称（可用于显示）

### wxAvatar
- **类型**: String
- **必填**: 否
- **说明**: 微信头像URL（可用于显示）

## 数据库索引建议

为了提高查询性能，建议创建以下索引:

```javascript
// 创建wxOpenId索引（唯一索引）
db.collection('users').createIndex({
  keys: { wxOpenId: 1 },
  unique: true,
  sparse: true  // 允许空值，只对有值的文档保证唯一性
});

// 创建wxUnionId索引
db.collection('users').createIndex({
  keys: { wxUnionId: 1 },
  unique: false,
  sparse: true
});
```

## 迁移脚本

可以使用以下云函数批量更新现有用户记录:

```javascript
// updateUsersSchema云函数
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 查询所有没有wxOpenId字段的用户
    const users = await db.collection('users')
      .where({
        wxOpenId: db.command.exists(false)
      })
      .get();

    // 批量更新
    const promises = users.data.map(user => {
      return db.collection('users').doc(user._id).update({
        data: {
          wxOpenId: '',
          wxUnionId: '',
          wxBindTime: null,
          wxNickname: '',
          wxAvatar: ''
        }
      });
    });

    await Promise.all(promises);

    return {
      code: 200,
      message: `成功更新 ${users.data.length} 个用户记录`
    };
  } catch (error) {
    return {
      code: 500,
      message: '更新失败: ' + error.message
    };
  }
};
```

## 安全规则建议

在CloudBase控制台设置集合权限规则:

```javascript
{
  "read": true,  // 允许读取
  "write": "auth.openid == doc.wxOpenId"  // 只能修改自己绑定的记录
}
```
