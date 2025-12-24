# Users 集合微信绑定字段更新说明

## 更新目的
为支持微信小程序OpenID绑定功能，需要在 `users` 集合中添加以下字段。

## 新增字段

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|-----|------|------|
| wxOpenId | String | 否 | 微信用户唯一标识 | `o6_bmjrPTlm6_2sgVt7hMZOPfL2M` |
| wxAppId | String | 否 | 微信小程序AppID | `wx79afc92f6fe01a31` |
| wxBoundAt | Date | 否 | 微信绑定时间 | `2025-12-18T15:30:00.000Z` |
| lastLoginAt | Date | 否 | 最后登录时间 | `2025-12-18T15:30:00.000Z` |

## 更新方式

### 方式1：通过CloudBase控制台（推荐）

1. 访问：https://console.cloud.tencent.com/tcb/db?envId=jihua-oa-dev-3goht9irae4d949f
2. 选择 `users` 集合
3. 点击"设置" > "字段管理"
4. 添加上述字段

### 方式2：通过代码批量更新

在云函数中执行以下代码：

```javascript
const cloud = require('wx-server-sdk');
cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f'
});

const db = cloud.database();

async function updateUsersCollection() {
  try {
    // 为所有现有用户添加默认值
    const result = await db.collection('users')
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
    
    console.log('更新成功:', result);
  } catch (error) {
    console.error('更新失败:', error);
  }
}
```

### 方式3：自然更新（最简单）

不需要手动更新。当用户首次通过小程序绑定账号时，这些字段会自动添加和填充。

## 字段约束

### wxOpenId
- **唯一性**：一个OpenID只能绑定一个账号
- **格式**：28位字符串
- **来源**：微信服务器自动生成，通过 `cloud.getWXContext().OPENID` 获取

### wxAppId
- **格式**：18位字符串，以`wx`开头
- **值**：固定为 `wx79afc92f6fe01a31`

### wxBoundAt
- **格式**：ISO 8601 日期时间格式
- **时区**：UTC+8 (北京时间)

### lastLoginAt
- **更新时机**：每次通过小程序自动登录时更新
- **用途**：统计用户活跃度

## 数据示例

### 未绑定用户
```json
{
  "_id": "user-001",
  "username": "zhangsan",
  "password": "******",
  "name": "张三",
  "email": "zhangsan@jihua.com",
  "wxOpenId": null,
  "wxAppId": null,
  "wxBoundAt": null,
  "lastLoginAt": null
}
```

### 已绑定用户
```json
{
  "_id": "user-001",
  "username": "zhangsan",
  "password": "******",
  "name": "张三",
  "email": "zhangsan@jihua.com",
  "wxOpenId": "o6_bmjrPTlm6_2sgVt7hMZOPfL2M",
  "wxAppId": "wx79afc92f6fe01a31",
  "wxBoundAt": "2025-12-18T07:30:00.000Z",
  "lastLoginAt": "2025-12-18T08:15:00.000Z"
}
```

## 安全建议

1. **OpenID唯一性**：确保一个OpenID只能绑定一个账号
2. **解绑机制**：提供用户解绑微信的功能
3. **日志记录**：记录绑定/解绑操作日志
4. **定期清理**：清理长期未登录的绑定记录

## 常见问题

### Q: 用户更换手机号/微信号怎么办？
A: 用户可以先解绑旧微信，然后用新微信重新绑定。

### Q: 一个账号可以绑定多个微信吗？
A: 不可以。一个账号只能绑定一个微信OpenID。

### Q: 如何查询已绑定用户？
A: 使用查询条件：`wxOpenId: db.command.neq(null)`

## 相关文档

- [微信小程序OpenID说明](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html)
- [CloudBase数据库文档](https://docs.cloudbase.net/database/introduce.html)
