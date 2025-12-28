# Admin 权限测试指南

## 🎯 测试目的

验证 admin 角色在问题管理模块中的查看权限是否正常。

## 📋 测试场景

### 场景1: 新登录的 admin 用户

#### 测试步骤
1. **清空浏览器缓存**
   - 按 `F12` 打开开发者工具
   - 进入 Application（或 Storage）标签
   - 清空 localStorage
   - 刷新页面

2. **重新登录**
   - 使用 admin 账号登录
   - 用户名: `admin`
   - 密码: `admin123`（或您设置的密码）

3. **进入问题管理模块**
   - 点击左侧菜单的「问题管理」
   - 观察是否显示所有问题

4. **检查控制台日志**
   - 按 `F12` 打开开发者工具
   - 查看 Console 标签
   - 应该看到类似日志：
     ```
     当前用户信息: { currentUserId: "...", currentUserRole: "admin" }
     🔍 [buildQueryConditions] 开始构建查询条件
       - currentUserId: ...
       - currentUserRole: admin
     ✅ [buildQueryConditions] 检测到admin角色,返回空查询条件（查看所有数据）
     查询条件: {}
     问题数量: X
     ```

#### 预期结果
- ✅ 可以看到所有问题（不论发起人是谁）
- ✅ 控制台显示「检测到admin角色,返回空查询条件」

---

### 场景2: 之前登录过的 admin 用户（localStorage 有旧数据）

#### 测试步骤
1. **不清空浏览器缓存**（模拟旧数据）
   - 直接刷新页面

2. **进入问题管理模块**
   - 点击左侧菜单的「问题管理」
   - 观察是否显示所有问题

3. **检查 localStorage 数据格式**
   - 按 `F12` 打开开发者工具
   - 在 Console 中输入：
     ```javascript
     JSON.parse(localStorage.getItem('current_user'))
     ```
   - 检查返回的对象是否包含 `roles` 数组

4. **如果 localStorage 中没有 `roles` 数组**
   - 检查是否有 `role` 字段
   - 检查 `username` 是否为 `admin`
   - 验证兜底逻辑是否生效

#### 预期结果
- ✅ 即使 localStorage 数据格式不统一，admin 仍然可以看到所有问题
- ✅ 控制台显示「检测到admin角色,返回空查询条件」

---

### 场景3: 普通用户（对照组）

#### 测试步骤
1. **使用普通用户账号登录**
   - 用户名: `user1`（或其他非 admin 用户）
   - 密码: 对应的密码

2. **进入问题管理模块**
   - 点击左侧菜单的「问题管理」
   - 观察是否只显示自己相关的问题

3. **检查控制台日志**
   - 查看 Console 标签
   - 应该看到类似日志：
     ```
     当前用户信息: { currentUserId: "...", currentUserRole: "user" }
     🔍 [buildQueryConditions] 开始构建查询条件
       - currentUserId: ...
       - currentUserRole: user
       - isDepartmentLeader: false
       - subordinates count: 0
       - departments: ["销售部"]
     🎯 [buildQueryConditions] 最终查询条件: {
       "$or": [
         { "owner": "user-001" },
         { "createdBy": "user-001" },
         { "collaborators": "user-001" },
         { "solvers": "user-001" }
       ]
     }
     问题数量: X
     ```

#### 预期结果
- ✅ 只能看到自己创建的、作为协作人的、作为解决人的问题
- ✅ 看不到其他人的问题
- ✅ 控制台显示详细的查询条件（包含 `$or` 条件）

---

## 🐛 问题排查

### 如果 admin 仍然看不到所有问题

#### 步骤1: 检查用户信息
在控制台中执行：
```javascript
const user = JSON.parse(localStorage.getItem('current_user'));
console.log('用户信息:', user);
console.log('- username:', user.username);
console.log('- role:', user.role);
console.log('- roles:', user.roles);
```

#### 步骤2: 检查角色识别逻辑
观察控制台日志，找到这一行：
```
当前用户信息: { currentUserId: "...", currentUserRole: "..." }
```
- 如果 `currentUserRole` 不是 `"admin"`，说明角色识别有问题

#### 步骤3: 检查查询条件
观察控制台日志，找到这一行：
```
查询条件: { ... }
```
- 如果查询条件不是空对象 `{}`，说明权限判断有问题

#### 步骤4: 手动修复 localStorage
如果确认用户是 admin，但 localStorage 数据格式有问题，可以手动修复：
```javascript
const user = JSON.parse(localStorage.getItem('current_user'));
user.role = 'admin';
user.roles = ['admin'];
localStorage.setItem('current_user', JSON.stringify(user));
window.location.reload(); // 刷新页面
```

---

## 📊 测试结果记录表

| 测试场景 | 测试人员 | 测试时间 | 是否通过 | 备注 |
|---------|---------|---------|---------|------|
| 场景1: 新登录 admin | | | | |
| 场景2: 旧数据 admin | | | | |
| 场景3: 普通用户（对照） | | | | |

---

## ✅ 验收标准

### Admin 用户
- [x] 可以看到所有问题（不论发起人是谁）
- [x] 控制台显示「检测到admin角色,返回空查询条件」
- [x] 查询条件为空对象 `{}`
- [x] 不受 localStorage 数据格式影响

### 普通用户
- [x] 只能看到自己相关的问题
- [x] 控制台显示详细的查询条件（包含 `$or` 条件）
- [x] 查询条件包含多个权限判断

---

## 🔧 相关文件

- `components/IssueManagementPage.tsx` - 角色识别逻辑
- `utils/permission.ts` - 权限查询条件构建
- `docs/问题管理权限控制优化说明.md` - 详细的修复说明

---

**测试指南版本**: v1.0.0  
**更新时间**: 2025-12-29
