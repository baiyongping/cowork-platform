# 数据库集合权限配置指南

## 📋 概述

本文档说明如何配置CloudBase NoSQL数据库集合的权限规则,确保数据安全和访问控制。

## 🎯 配置目标

1. **数据安全**: 确保用户只能访问有权限的数据
2. **权限分离**: 不同角色具有不同的访问权限
3. **灵活控制**: 支持按文档所有者、角色等维度控制
4. **易于维护**: 统一的权限配置管理

## 📂 相关文件

| 文件 | 说明 |
|------|------|
| `scripts/configure-collection-permissions.js` | 权限配置脚本 |
| `database/collection-permissions-template.json` | 权限配置模板 |
| `constants/modules.ts` | 模块和集合定义 |

## 🔐 权限规则说明

### 核心业务模块

#### 1. 商机管理 (opportunities)
- **读权限**: 仅创建人或管理员
- **写权限**: 仅创建人或管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  write: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  ```

#### 2. 任务管理 (tasks)
- **读权限**: 负责人、协同人或管理员
- **写权限**: 负责人或管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && (doc.owner == auth.uid || doc.collaborators.includes(auth.uid) || get('database.users.$(auth.uid)').role == 'admin')"
  write: "auth.uid != null && (doc.owner == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  ```

#### 3. 项目管理 (projects)
- **读权限**: 负责人或管理员
- **写权限**: 负责人或管理员
- **规则**: 同商机管理

#### 4. 问题管理 (issues)
- **读权限**: 创建人或管理员
- **写权限**: 创建人或管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  write: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  ```

### 目标管理模块

#### 5. 销售目标 (sales_goals)
- **读权限**: 部门负责人和管理员
- **写权限**: 仅管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']"
  write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  ```

#### 6. 产品订单预测 (product_order_forecast)
- **规则**: 同销售目标

#### 7. 年度策略 (annual_strategies)
- **读权限**: 仅管理员
- **写权限**: 仅管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  ```

#### 8. 成果目标 (outcome_goals)
- **读权限**: 所有认证用户
- **写权限**: 仅管理员
- **规则**:
  ```javascript
  read: "auth.uid != null"
  write: "auth.uid != null && get('database.users.$(auth.uid)').role == 'admin'"
  ```

#### 9. 目标分解表 (goal_decompositions)
- **规则**: 同成果目标

### 预算管理模块

#### 10. 预算科目 (budgetSubjects)
- **读权限**: 所有认证用户(只读)
- **写权限**: 仅管理员
- **规则**: 同成果目标

#### 11. 年度预算 (annual_budgets)
- **规则**: 同预算科目

#### 12. 预算执行 (budget_execution)
- **规则**: 同预算科目

#### 13. 资产预算 (asset_budgets)
- **读权限**: 部门负责人和管理员
- **写权限**: 部门负责人和管理员
- **规则**:
  ```javascript
  read: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']"
  write: "auth.uid != null && get('database.users.$(auth.uid)').role in ['admin', 'manager']"
  ```

#### 14. 薪酬预算 (hrExpenses)
- **读权限**: 仅管理员
- **写权限**: 仅管理员
- **规则**: 同年度策略

### 会议管理模块

#### 15. 例会 (meetings)
- **读权限**: 所有认证用户
- **写权限**: 创建人和管理员
- **规则**:
  ```javascript
  read: "auth.uid != null"
  write: "auth.uid != null && (doc.createdBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  ```

#### 16. 会议纪要 (meetingRecords)
- **读权限**: 所有认证用户
- **写权限**: 会议记录人和管理员
- **规则**:
  ```javascript
  read: "auth.uid != null"
  write: "auth.uid != null && (doc.recordBy == auth.uid || get('database.users.$(auth.uid)').role == 'admin')"
  ```

### 系统管理模块

#### 17. 用户 (users)
- **读权限**: 所有认证用户
- **写权限**: 仅管理员
- **规则**: 同成果目标

#### 18. 角色 (roles)
- **规则**: 同用户

#### 19. 功能模块配置 (moduleConfig)
- **规则**: 同用户

#### 20. 消息通知 (messages)
- **读权限**: 仅自己的消息
- **写权限**: 仅自己的消息
- **规则**:
  ```javascript
  read: "auth.uid != null && doc.userId == auth.uid"
  write: "auth.uid != null && doc.userId == auth.uid"
  ```

#### 21. 系统日志 (systemLogs)
- **读权限**: 仅管理员
- **写权限**: 仅管理员
- **规则**: 同年度策略

### 微信相关

#### 22. 微信会话 (wechat_sessions)
- **读权限**: 仅管理员
- **写权限**: 仅管理员
- **规则**: 同年度策略

## 🛠️ 配置步骤

### 方法1: 使用配置脚本(推荐)

1. **运行配置脚本**:
   ```bash
   node scripts/configure-collection-permissions.js
   ```

2. **查看生成的配置文件**:
   ```bash
   # 配置文件位置
   database/collection-permissions.json
   ```

3. **手动应用配置**:
   - 打开CloudBase控制台
   - 进入"数据库" > "权限设置"
   - 选择对应集合
   - 复制配置文件中的权限规则
   - 粘贴到控制台并保存

### 方法2: 使用CloudBase控制台

1. **登录控制台**:
   - 访问: https://console.cloud.tencent.com/tcb
   - 选择环境: `cowork-9gg9oocb516be5fb`

2. **配置权限**:
   - 导航至: 数据库 > 权限设置
   - 选择集合
   - 设置读/写权限规则
   - 保存配置

3. **验证权限**:
   - 使用不同角色的测试账号
   - 验证数据访问控制是否生效

## ✅ 配置检查清单

配置完成后,请检查:

- [ ] 所有集合都已配置权限规则
- [ ] 管理员可以访问所有数据
- [ ] 普通用户只能访问有权限的数据
- [ ] 敏感数据(薪酬、策略)仅管理员可见
- [ ] 用户只能编辑自己创建的内容
- [ ] 系统日志仅管理员可访问

## 🔍 常见问题

### Q1: 权限规则不生效?
**A**: 检查以下几点:
1. 确认规则语法正确
2. 确认`auth.uid`存在(用户已登录)
3. 确认`users`集合中有用户记录和角色信息
4. 清除浏览器缓存后重试

### Q2: 如何测试权限规则?
**A**: 
1. 创建不同角色的测试账号(admin、manager、user)
2. 分别登录测试访问各集合数据
3. 验证只能访问有权限的数据

### Q3: 如何调试权限问题?
**A**:
1. 查看浏览器控制台错误信息
2. 检查CloudBase控制台的日志
3. 使用CloudBase提供的权限模拟器测试

### Q4: 可以动态修改权限规则吗?
**A**: 
- 权限规则需要在控制台手动配置
- 不支持通过代码动态修改
- 建议使用角色和文档属性实现灵活控制

## 📖 参考资料

- [CloudBase数据库权限文档](https://docs.cloudbase.net/database/database-safe.html)
- [数据库安全规则语法](https://docs.cloudbase.net/database/database-safe.html#%E5%AE%89%E5%85%A8%E8%A7%84%E5%88%99)
- [权限规则最佳实践](https://cloud.tencent.com/document/product/876/41762)

## 🔄 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-01-09 | v1.0 | 初始版本 |

---

**维护者**: 际华协同办公平台开发团队  
**最后更新**: 2026-01-09
