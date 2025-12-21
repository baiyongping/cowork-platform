# 本地开发切换 cowork 数据库技术方案

## 📋 目标

**实现本地开发环境连接到 cowork 测试数据库（cowork-9gg9oocb516be5fb）**

---

## ✅ 已完成配置检查

### 1. 代码配置 ✅

**文件**: `lib/cloudbase.ts`

```typescript
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'cowork-9gg9oocb516be5fb';
```

✅ **验证通过** - 代码会自动读取环境变量，默认使用 cowork 环境

### 2. 环境变量配置 ✅

**文件**: `.env.development`

```env
VITE_CLOUDBASE_ENV_ID=cowork-9gg9oocb516be5fb
```

✅ **验证通过** - 本地开发会使用 cowork 环境

### 3. 安全域名配置 ✅

已添加到 `cowork-9gg9oocb516be5fb` 环境：
- ✅ `localhost:5173`
- ✅ `127.0.0.1:5173`
- ✅ `http://localhost:5173`

---

## 🎯 核心问题：数据库初始化

**问题**：cowork 数据库是空的，没有集合和数据

**解决方案**：3 种方法任选其一

---

## 🔧 方案 A：使用验证脚本（推荐）✅

### 步骤 1：运行验证脚本

**方法 1：使用批处理**
```bash
# 双击运行
验证并初始化数据库.bat
```

**方法 2：直接运行 Node.js**
```bash
node scripts/verify-and-init-db.js
```

### 步骤 2：查看输出

脚本会自动：
1. ✅ 检查数据库连接
2. ✅ 检查集合是否存在
3. ✅ 如果不存在，自动创建集合和初始数据
4. ✅ 显示详细的验证报告

**期望输出**：
```
========================================
  CloudBase 数据库验证和初始化
========================================

⏳ [1/4] 进行匿名认证...
✅ 认证成功 - UID: xxx

⏳ [2/4] 检查数据库集合...

   ❌ roles - 不存在
   ❌ departments - 不存在
   ❌ employees - 不存在
   ❌ system_configs - 不存在

⏳ [3/4] 初始化数据...

   创建 roles...
   ✅ roles - 2 条记录已创建
   创建 departments...
   ✅ departments - 2 条记录已创建
   创建 employees...
   ✅ employees - 1 条记录已创建
   创建 system_configs...
   ✅ system_configs - 5 条记录已创建

⏳ [4/4] 确保空集合存在...

   ✅ tasks - 已创建
   ✅ opportunities - 已创建
   ✅ projects - 已创建
   ✅ goals - 已创建

========================================
  🎉 初始化完成！
========================================

📊 数据库状态:

   roles: 2 条
   departments: 2 条
   employees: 1 条
   system_configs: 5 条
   tasks: 0 条
   opportunities: 0 条
   projects: 0 条
   goals: 0 条

📋 管理员账号:
   用户名: admin
   密码: admin123

🌐 CloudBase 控制台:
   https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc

🚀 下一步:
   npm run dev
```

---

## 🔧 方案 B：使用云函数初始化

### 步骤 1：确保登录 CloudBase

```bash
cloudbase login
```

### 步骤 2：部署云函数

```bash
cloudbase functions:deploy initDatabase --envId cowork-9gg9oocb516be5fb
```

### 步骤 3：调用云函数

```bash
cloudbase functions:invoke initDatabase --envId cowork-9gg9oocb516be5fb
```

---

## 🔧 方案 C：在控制台手动创建

### 步骤 1：打开控制台

https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc

### 步骤 2：创建集合和数据

#### 1️⃣ roles
点击"新建集合" → 集合名称 `roles` → 添加文档：

```json
{
  "_id": "role-admin",
  "name": "超级管理员",
  "code": "super_admin",
  "permissions": [
    { "module": "all", "actions": ["view", "create", "edit", "delete"] }
  ],
  "isSystem": true,
  "status": "启用"
}
```

#### 2️⃣ departments
创建集合 `departments` → 添加文档：

```json
{
  "_id": "dept-sales",
  "name": "销售部",
  "code": "SALES",
  "status": "正常"
}
```

#### 3️⃣ employees（最重要）
创建集合 `employees` → 添加文档：

```json
{
  "_id": "admin-001",
  "username": "admin",
  "password": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
  "name": "系统管理员",
  "email": "admin@jihua.com",
  "phone": "13800138000",
  "roleIds": ["role-admin"],
  "role": "admin",
  "position": "系统管理员",
  "status": "在职",
  "isActive": true
}
```

⚠️ **重要**：密码字段是 `admin123` 的 SHA-256 哈希值

#### 4️⃣ system_configs
创建集合 `system_configs` → 添加文档：

```json
{
  "category": "system",
  "key": "system_name",
  "value": "际华定制协同办公管理平台",
  "dataType": "string",
  "isEditable": true
}
```

#### 5️⃣ 空集合
创建以下空集合（不需要添加数据）：
- `tasks`
- `opportunities`
- `projects`
- `goals`

---

## ✅ 验证步骤

### 1. 验证数据库连接

**打开 CloudBase 控制台**：
https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc

**检查集合列表**：
- ✅ roles
- ✅ departments
- ✅ employees
- ✅ system_configs
- ✅ tasks
- ✅ opportunities
- ✅ projects
- ✅ goals

### 2. 验证本地连接

**启动开发服务器**：
```bash
npm run dev
```

**打开浏览器**：
http://localhost:5173

**打开浏览器控制台**，应该看到：
```
🔧 CloudBase 环境: cowork-9gg9oocb516be5fb
🔧 当前模式: development
🔧 初始化 CloudBase 数据库连接...
✅ 匿名登录成功 - 用户UID: xxx
✓ CloudBase 自动认证完成
```

### 3. 验证登录功能

**在登录页面**：
- 用户名：`admin`
- 密码：`admin123`

**期望结果**：
- ✅ 登录成功
- ✅ 跳转到首页
- ✅ 可以看到系统名称："际华定制协同办公管理平台"

---

## 🐛 调试命令

如果遇到问题，可以在浏览器控制台执行以下命令：

### 检查环境配置
```javascript
console.log('环境 ID:', import.meta.env.VITE_CLOUDBASE_ENV_ID)
console.log('模式:', import.meta.env.MODE)
```

### 检查数据库连接
```javascript
// 方法1
await debug()

// 方法2
await debugCloudBase()

// 方法3（手动查询）
const result = await db.collection('employees').get()
console.log('员工数据:', result.data)
```

### 检查认证状态
```javascript
const loginState = await auth.getLoginState()
console.log('登录状态:', loginState)
```

---

## 📊 完整架构图

```
┌─────────────────────────────────────────┐
│         本地开发环境                     │
│      http://localhost:5173              │
│                                         │
│   .env.development                      │
│   └─ VITE_CLOUDBASE_ENV_ID=            │
│      cowork-9gg9oocb516be5fb           │
└───────────────┬─────────────────────────┘
                │
                │ 连接
                ↓
┌─────────────────────────────────────────┐
│      CloudBase 测试环境                  │
│      cowork-9gg9oocb516be5fb            │
│                                         │
│   集合:                                 │
│   ├─ roles          (2条)              │
│   ├─ departments    (2条)              │
│   ├─ employees      (1条 - admin)      │
│   ├─ system_configs (5条)              │
│   ├─ tasks          (空)               │
│   ├─ opportunities  (空)               │
│   ├─ projects       (空)               │
│   └─ goals          (空)               │
└─────────────────────────────────────────┘
```

---

## ⚠️ 常见问题

### Q1: 脚本执行没有输出
**原因**：可能正在后台运行或遇到了错误

**解决方法**：
```bash
# 使用详细输出模式
node scripts/verify-and-init-db.js 2>&1 | more
```

### Q2: 匿名登录失败
**原因**：CloudBase 环境未启用匿名登录

**解决方法**：
1. 打开控制台：https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/identity/login-manage
2. 找到"匿名登录"
3. 点击"启用"

### Q3: 数据库写入失败（权限错误）
**原因**：数据库安全规则限制

**解决方法**：
1. 打开控制台：https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc
2. 点击"安全规则"
3. 临时设置为：
```json
{
  "read": true,
  "write": true
}
```

### Q4: 登录后看不到数据
**原因**：前端代码可能还在使用旧环境

**解决方法**：
1. 完全关闭开发服务器（Ctrl+C）
2. 清除浏览器缓存（Ctrl+Shift+Delete）
3. 删除 `node_modules/.vite` 缓存
4. 重新启动：`npm run dev`

---

## ✅ 成功标志

完成初始化后，应该满足以下条件：

- ✅ CloudBase 控制台可以看到 8 个集合
- ✅ employees 集合有 1 条管理员记录
- ✅ 本地开发服务器启动时控制台显示连接到 cowork 环境
- ✅ 浏览器控制台显示 "CloudBase 自动认证完成"
- ✅ 可以使用 admin/admin123 登录
- ✅ 登录后可以正常使用系统

---

## 🚀 下一步

初始化完成后：

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器
http://localhost:5173

# 3. 使用管理员登录
用户名: admin
密码: admin123

# 4. 开始开发！
```

---

## 📞 需要帮助？

如果遇到任何问题，请提供：
1. 脚本执行的完整输出
2. 浏览器控制台的错误信息
3. CloudBase 控制台的截图

我会帮你排查问题！
