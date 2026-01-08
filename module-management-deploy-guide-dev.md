# module-management 云函数部署指南（开发环境）

## 🎯 环境信息

- **环境名称**: 际华协同办公（开发环境）
- **环境 ID**: `jihua-oa-dev-3goht9irae4d949f`
- **控制台地址**: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf

## 📋 部署步骤（5分钟完成）

### 步骤 1: 访问控制台

CloudBase 控制台应该已经在浏览器中打开，如果没有，请访问:
```
https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf
```

确认：
- ✅ 顶部显示环境名称：**jihua-oa-dev**
- ✅ 页面标题：**云函数**

### 步骤 2: 创建云函数

1. 点击右上角 **"新建"** 按钮

2. 填写基本信息:
   - **函数名称**: `module-management`（必须完全一致）
   - **运行环境**: 选择 `Nodejs 16.13`
   - **内存配置**: `256MB`（默认）
   - **超时时间**: `15秒`（默认）
   - **环境变量**: 无需配置

3. 代码上传方式选择: **"在线编辑"**

### 步骤 3: 上传代码

#### 方法 A: 复制粘贴（推荐 ⭐）

1. 打开本地文件: `d:\project\cowork12-21\cloudfunctions\module-management\index.js`

2. 复制全部代码（Ctrl+A, Ctrl+C）

3. 在控制台的在线编辑器中:
   - 删除所有示例代码
   - 粘贴刚才复制的代码（Ctrl+V）

4. 点击 **"保存"** 按钮

#### 方法 B: 本地上传 ZIP（备选）

1. 压缩文件夹:
   ```
   d:\project\cowork12-21\cloudfunctions\module-management\
   ```

2. 确保 ZIP 包含:
   - `index.js`
   - `package.json`
   - `config.json`

3. 在控制台选择 "本地上传ZIP代码包"

4. 选择刚才创建的 ZIP 文件

### 步骤 4: 配置依赖

1. 切换到 **"package.json"** 标签

2. 确保内容为:

```json
{
  "name": "module-management",
  "version": "1.0.0",
  "description": "功能模块管理云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

3. 点击 **"保存并安装依赖"**

4. 等待依赖安装完成（约30秒-1分钟）

### 步骤 5: 部署云函数

1. 点击右上角 **"部署"** 按钮

2. 等待部署完成（约1-2分钟）

3. 看到提示: ✅ "部署成功"

## ✅ 验证部署

### 方法 1: 控制台测试

1. 在云函数详情页，切换到 **"测试"** 标签

2. 输入测试数据:

```json
{
  "action": "list",
  "data": {}
}
```

3. 点击 **"测试运行"** 按钮

4. 预期结果:
```json
{
  "success": true,
  "data": {
    "modules": [],
    "total": 0
  }
}
```

如果返回上述结果，说明部署成功！（空数组是正常的，因为还没导入数据）

### 方法 2: 应用测试

1. 刷新应用: http://localhost:5173

2. 登录管理员账号

3. 点击侧边栏 **"功能模块"** 菜单

4. 如果能看到页面（即使是空列表），说明云函数调用成功！

## 📊 导入模块数据

部署成功后，立即导入模块配置数据:

1. 访问: http://localhost:5173/database/init/import-modules-data-web.html

2. 点击 **"导入模块配置"** 按钮

3. 等待导入完成（41条记录）

4. 点击 **"验证导入结果"** 按钮

5. 刷新功能模块页面，应该能看到41条数据

## 🛠️ 常见问题

### Q1: 部署失败，提示权限错误？

**A**: 确认以下事项:
- ✅ 你有该环境的管理员权限
- ✅ 环境 ID 正确: `jihua-oa-dev-3goht9irae4d949f`

### Q2: 测试运行返回 "函数不存在"？

**A**: 可能原因:
- ⏳ 部署还未完成（等待1-2分钟）
- ❌ 函数名称错误（必须是 `module-management`）
- ❌ 环境切换错误（确认是开发环境）

### Q3: 前端调用云函数失败？

**A**: 检查步骤:

1. 确认环境配置（`.env` 文件）:
```
VITE_CLOUDBASE_ENV_ID=jihua-oa-dev-3goht9irae4d949f
```

2. 确认云函数名称（`lib/module-service.ts`）:
```typescript
await callFunction({
  name: 'module-management', // 必须一致
  data: { action, data }
});
```

3. 重启开发服务器:
```bash
npm run dev
```

### Q4: 代码更新后如何重新部署？

**A**: 简单步骤:

1. 访问控制台: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf

2. 点击 `module-management` 云函数

3. 切换到 **"函数代码"** 标签

4. 复制粘贴新代码

5. 点击 **"保存并部署"**

## 📝 部署清单

完成后勾选:

- [ ] 云函数已创建（名称: `module-management`）
- [ ] 代码已上传（约500行）
- [ ] 依赖已安装（`wx-server-sdk`）
- [ ] 部署成功（绿色提示）
- [ ] 测试通过（返回正确结果）
- [ ] 数据已导入（41条模块记录）
- [ ] 前端调用成功（页面正常显示）

## 🎉 完成！

部署成功后，你可以:

1. ✅ 在功能模块页面查看41个模块
2. ✅ 点击模块查看详细信息
3. ✅ 点击 "同步" 按钮同步元数据
4. ✅ 点击 "元数据" 按钮查看详情

---

**需要帮助？** 随时询问！
