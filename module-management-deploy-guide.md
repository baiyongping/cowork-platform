# module-management 云函数部署指南

## 🚨 紧急部署步骤

云函数代码已准备就绪，现在需要部署到 CloudBase 环境。

---

## 方法 1: CloudBase 控制台部署（最简单）

### 步骤 1: 准备代码文件

云函数代码位于: `d:\project\cowork12-21\cloudfunctions\module-management\`

包含以下文件:
- ✅ `index.js` - 主代码文件（500+行）
- ✅ `package.json` - 依赖配置
- ✅ `config.json` - 云函数配置

### 步骤 2: 访问 CloudBase 控制台

1. 打开浏览器访问:
```
https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/scf
```

2. 点击 **"新建云函数"** 按钮

### 步骤 3: 配置云函数

填写以下信息:

| 字段 | 值 |
|------|------|
| **函数名称** | `module-management` |
| **运行环境** | `Nodejs 16.13` |
| **函数内存** | `256MB`（默认即可）|
| **超时时间** | `15秒`（默认即可）|

### 步骤 4: 上传代码

**选项 A: 在线编辑器（推荐）**

1. 选择 "在线编辑"
2. 将 `index.js` 的内容复制粘贴到编辑器
3. 点击 "保存并安装依赖"

**选项 B: 上传 ZIP 包**

1. 将 `cloudfunctions/module-management/` 文件夹压缩为 ZIP
2. 选择 "本地上传代码包"
3. 上传 ZIP 文件

### 步骤 5: 配置依赖

在 `package.json` 标签页中，填入:

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

点击 **"保存并安装依赖"**

### 步骤 6: 部署完成

等待部署成功（约1-2分钟），然后:

1. ✅ 在云函数列表中看到 `module-management`
2. ✅ 状态显示为 "部署成功"

---

## 方法 2: CloudBase CLI 部署（推荐给开发者）

### 前提条件

确保已安装 CloudBase CLI:

```bash
npm install -g @cloudbase/cli
```

### 步骤 1: 登录 CloudBase

```bash
tcb login
```

按提示完成微信扫码登录。

### 步骤 2: 切换到云函数目录

```bash
cd d:\project\cowork12-21\cloudfunctions\module-management
```

### 步骤 3: 部署云函数

```bash
tcb fn deploy module-management --envId cowork-9gg9oocb516be5fb
```

### 步骤 4: 查看部署结果

```bash
tcb fn list --envId cowork-9gg9oocb516be5fb
```

应该能看到 `module-management` 云函数已部署。

---

## 方法 3: 使用部署工具页面

### 访问部署工具

打开浏览器访问:
```
http://localhost:5173/deploy-module-function.html
```

### 按照页面提示操作

1. ✅ 检查登录状态
2. ✅ 读取云函数代码（手动确认）
3. ✅ 根据提示手动部署
4. ✅ 测试云函数是否可用

---

## 验证部署成功

### 方法 1: 在控制台测试

1. 访问云函数详情页
2. 点击 "测试" 标签
3. 输入测试数据:

```json
{
  "action": "list",
  "data": {}
}
```

4. 点击 "执行"，应该返回成功结果

### 方法 2: 在应用中测试

1. 刷新应用页面: http://localhost:5173
2. 登录管理员账号
3. 点击侧边栏 "功能模块" 菜单
4. 如果能看到模块列表，说明部署成功！

---

## 常见问题

### Q1: 上传代码时提示"文件过大"

**解决方案**: 使用在线编辑器，只复制 `index.js` 的内容，不要上传整个文件夹。

### Q2: 部署后调用失败，提示权限不足

**解决方案**: 
1. 确保使用管理员账号登录
2. 检查 `users` 集合中该用户的 `role` 字段是否为 `admin`

### Q3: 部署成功但功能不正常

**解决方案**: 
1. 检查云函数日志（控制台 → 云函数详情 → 日志）
2. 确认 `modules` 集合已创建
3. 确认已导入模块配置数据

---

## 下一步操作

部署成功后，按以下顺序操作:

1. ✅ **导入模块配置数据**
   - 访问: http://localhost:5173/database/init/import-modules-data-web.html
   - 点击 "导入模块配置"
   - 等待导入完成（41条记录）

2. ✅ **测试功能模块管理页面**
   - 访问: http://localhost:5173
   - 登录管理员账号
   - 点击 "功能模块" 菜单
   - 查看模块列表

3. ✅ **同步元数据**
   - 在模块列表中点击 "同步" 按钮
   - 查看元数据详情

---

## 技术支持

如果部署过程中遇到问题:

1. 📖 查看 CloudBase 官方文档: https://docs.cloudbase.net/
2. 🔍 检查控制台错误日志
3. 💬 查看云函数执行日志

---

## 文件清单

确保以下文件存在:

```
d:\project\cowork12-21\
├── cloudfunctions/
│   └── module-management/
│       ├── index.js           ✅ (500+行)
│       ├── package.json       ✅
│       └── config.json        ✅
├── deploy-module-function.html  ✅ (部署工具页面)
└── module-management-deploy-guide.md  ✅ (本文档)
```

---

**祝部署顺利！** 🎉

如有问题，请参考上述指南或查看云函数日志排查。
