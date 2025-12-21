# Lighthouse Integration 部署指南

## 📋 概述

本文档详细介绍如何使用 **Lighthouse Integration** 自动化部署际华协同办公平台到测试环境。

## 🎯 核心优势

### ✅ 完全自动化
- **一句话部署**："请帮我在lighthouse上部署这个项目"
- AI 自动完成所有部署步骤，无需手动操作

### ✅ 智能化管理
- 自动查询可用服务器实例
- 自动上传文件到指定目录
- 自动设置文件权限和所有者
- 自动验证部署结果

### ✅ 安全可靠
- 无需暴露SSH密码
- 自动设置正确的权限（nginx:nginx, 755）
- 智能错误检测和修复建议

### ✅ 易于使用
- 自然语言交互，无需记忆复杂命令
- 适合团队协作，降低学习成本
- 支持快速迭代和测试验证

---

## 🚀 快速开始

### 前置条件
1. ✅ 项目已构建完成（`dist/` 目录存在）
2. ✅ Lighthouse 服务器已配置并运行
3. ✅ AI 已启用 Lighthouse Integration

### 部署步骤

#### 1️⃣ 构建项目
```bash
# 构建测试环境版本
npx vite build --mode test
```

#### 2️⃣ 告诉 AI 部署
```
请帮我在lighthouse上部署这个项目
```

#### 3️⃣ 等待 AI 完成
AI 会自动完成以下步骤：
- ✅ 查询 Lighthouse 实例列表
- ✅ 获取目标服务器详情
- ✅ 上传文件到服务器
- ✅ 设置文件权限
- ✅ 验证部署结果

#### 4️⃣ 验证部署
访问测试环境：http://152.136.183.181:3000

---

## 📦 部署流程详解

### 第一步：查询实例

**AI 调用**：`analyze_lighthouse_instances`

**作用**：获取所有地域的 Lighthouse 实例统计

**返回示例**：
```json
{
  "ap-beijing": 1,
  "ap-shanghai": 0,
  "ap-guangzhou": 0,
  "总实例数": 1
}
```

**AI 行为**：
- 检测到北京地域有1个实例
- 自动选择该地域继续查询

---

### 第二步：获取实例详情

**AI 调用**：`describe_running_instances`

**参数**：
```json
{
  "Region": "ap-beijing",
  "Limit": 20,
  "Offset": 0
}
```

**返回示例**：
```json
{
  "TotalCount": 1,
  "InstanceSet": [
    {
      "InstanceId": "lhins-pnt984h2",
      "InstanceName": "OpenCloudOS8-Docker26-Tbot",
      "InstanceState": "RUNNING",
      "PublicAddresses": ["152.136.183.181"],
      "PrivateAddresses": ["10.0.0.1"],
      "Platform": "LINUX_UNIX"
    }
  ]
}
```

**AI 行为**：
- 确认实例状态为运行中（RUNNING）
- 获取实例ID和公网IP
- 准备部署到该实例

---

### 第三步：上传文件

**AI 调用**：`deploy_project_preparation`

**参数**：
```json
{
  "FolderPath": "e:/cowork/dist",
  "InstanceId": "lhins-pnt984h2",
  "Region": "ap-beijing",
  "ProjectName": "jihua-dev"
}
```

**作用**：
1. 将本地 `dist/` 目录打包
2. 上传到服务器 `/root/` 目录
3. 自动解压为 `dist_时间戳/` 格式

**返回示例**：
```json
{
  "InvocationId": "ivk-xxxx",
  "CommandId": "cmd-xxxx",
  "UploadPath": "/root/dist_20251217193132"
}
```

---

### 第四步：部署和配置

**AI 调用**：`execute_command`

**参数**：
```json
{
  "Region": "ap-beijing",
  "InstanceId": "lhins-pnt984h2",
  "Command": "mkdir -p /var/www/jihua-dev && cp -r /root/dist_20251217193132/* /var/www/jihua-dev/ && chown -R nginx:nginx /var/www/jihua-dev && chmod -R 755 /var/www/jihua-dev && echo '✅ 部署成功' && ls -lh /var/www/jihua-dev",
  "SystemType": "Linux"
}
```

**执行内容**：
1. **创建目标目录**：`mkdir -p /var/www/jihua-dev`
2. **复制文件**：`cp -r /root/dist_*/* /var/www/jihua-dev/`
3. **设置所有者**：`chown -R nginx:nginx /var/www/jihua-dev`
4. **设置权限**：`chmod -R 755 /var/www/jihua-dev`
5. **验证部署**：`ls -lh /var/www/jihua-dev`

**返回示例**：
```
✅ 部署成功
total 32K
-rw-r--r-- 1 nginx nginx  582 Dec 17 19:31 index.html
drwxr-xr-x 2 nginx nginx 4.0K Dec 17 19:31 assets
-rw-r--r-- 1 nginx nginx  31K Dec 17 17:58 logo.png
```

---

### 第五步：验证部署

**AI 调用**：`execute_command`

**参数**：
```json
{
  "Region": "ap-beijing",
  "InstanceId": "lhins-pnt984h2",
  "Command": "ls -lh /var/www/jihua-dev/assets/ | head -10",
  "SystemType": "Linux"
}
```

**验证内容**：
- ✅ 检查 `assets/` 目录文件
- ✅ 验证文件时间戳（确认是最新）
- ✅ 验证文件权限（nginx:nginx, 755）

---

## 🔧 常见问题

### Q1: 部署失败怎么办？

**AI 会自动处理常见错误**：

1. **权限错误**（www-data不存在）
   - AI 自动切换为 `nginx:nginx`
   - 重新执行部署命令

2. **文件上传失败**
   - AI 自动重试上传
   - 提示检查网络连接

3. **目录不存在**
   - AI 自动创建目录
   - 设置正确权限

### Q2: 如何查看部署日志？

AI 会在部署过程中输出详细日志：
```
✅ 找到1个实例
✅ 实例信息：lhins-pnt984h2 (152.136.183.181)
✅ 文件已上传：/root/dist_20251217193132
✅ 部署成功：/var/www/jihua-dev/
✅ 权限已设置：nginx:nginx 755
```

### Q3: 如何回滚部署？

**方法1：使用 Git 版本回滚**
```bash
# 1. 切换到上一个版本
git checkout v2.x.x

# 2. 重新构建
npx vite build --mode test

# 3. 告诉 AI 部署
"请帮我在lighthouse上部署这个项目"
```

**方法2：手动回滚**
```bash
# SSH 登录服务器
ssh root@152.136.183.181

# 从备份恢复（如果有备份）
cp -r /var/www/jihua-dev.backup/* /var/www/jihua-dev/
```

### Q4: 部署到生产环境？

**⚠️ 不推荐使用 Lighthouse Integration 部署生产环境**

**原因**：
- 生产环境需要明确确认（输入YES）
- 需要更严格的审核流程
- 建议使用传统方式手动部署

**生产环境部署建议**：
```bash
# 使用传统方式（推荐）
部署到生产环境.bat
# 输入 YES 确认
```

---

## 📊 部署对比

| 特性 | Lighthouse Integration | 传统 SCP/SSH | 部署脚本 |
|------|----------------------|-------------|---------|
| **自动化** | ✅ 完全自动化 | ❌ 手动执行 | ✅ 半自动化 |
| **权限设置** | ✅ 自动设置 | ⚠️ 需手动设置 | ✅ 自动设置 |
| **错误处理** | ✅ 智能检测 | ❌ 需手动排查 | ⚠️ 部分检测 |
| **学习成本** | ✅ 低 | ⚠️ 中 | ⚠️ 中 |
| **交互方式** | ✅ 自然语言 | ❌ 命令行 | ❌ 批处理 |
| **验证部署** | ✅ 自动验证 | ❌ 需手动验证 | ⚠️ 部分验证 |
| **适用场景** | 测试环境 | 所有环境 | 所有环境 |
| **安全性** | ✅ 无需密码 | ⚠️ 需SSH密钥 | ⚠️ 需SSH密钥 |

---

## 💡 最佳实践

### 1. 日常开发部署
```bash
# 推荐使用 Lighthouse Integration
npx vite build --mode test
# 告诉 AI："请帮我在lighthouse上部署这个项目"
```

### 2. 快速迭代测试
```bash
# 修改代码 → 构建 → 部署 → 测试
npx vite build --mode test
# AI 自动部署，约1-2分钟完成
```

### 3. 团队协作部署
```bash
# 新成员无需学习复杂命令
# 只需告诉 AI："请帮我部署"
# AI 自动处理所有细节
```

### 4. 生产环境部署
```bash
# 使用传统方式，需要明确确认
部署到生产环境.bat
# 输入 YES 确认
```

---

## 🔐 安全建议

1. **测试环境**
   - ✅ 使用 Lighthouse Integration 自动化部署
   - ✅ 无需暴露SSH密码
   - ✅ AI 自动设置正确权限

2. **生产环境**
   - ⚠️ 使用传统方式手动部署
   - ⚠️ 需要明确确认操作
   - ⚠️ 严格控制访问权限

3. **访问控制**
   - ✅ 限制 Lighthouse Integration 只部署测试环境
   - ✅ 生产环境使用独立的部署流程
   - ✅ 定期审计部署日志

---

## 📝 部署检查清单

### 部署前
- [ ] 代码已提交到 Git
- [ ] 本地构建成功（`npx vite build --mode test`）
- [ ] 环境变量配置正确（`.env.test`）
- [ ] CloudBase 环境ID正确（`jihua-oa-dev-3goht9irae4d949f`）

### 部署中
- [ ] AI 成功查询到 Lighthouse 实例
- [ ] 文件上传成功（显示上传路径）
- [ ] 部署命令执行成功
- [ ] 文件权限设置正确（nginx:nginx, 755）

### 部署后
- [ ] 访问测试环境：http://152.136.183.181:3000
- [ ] 强制刷新浏览器（Ctrl + F5）
- [ ] 检查功能是否正常
- [ ] 查看浏览器控制台无错误
- [ ] 验证 CloudBase 连接正常

---

## 🎯 总结

**Lighthouse Integration 的价值**：

1. **效率提升**
   - 传统方式：5-10分钟（手动执行多个命令）
   - Lighthouse：1-2分钟（一句话完成）
   - 效率提升：**3-5倍**

2. **降低门槛**
   - 新成员无需学习SSH、SCP命令
   - 自然语言交互，易于理解
   - 减少人为错误

3. **智能化**
   - 自动检测和修复常见错误
   - 智能选择合适的实例
   - 自动验证部署结果

4. **适用场景**
   - ✅ 日常开发和测试部署
   - ✅ 快速迭代验证
   - ✅ 团队协作部署
   - ❌ 生产环境部署（建议使用传统方式）

---

**创建时间**：2025-12-17  
**最后更新**：2025-12-17  
**版本**：v1.0.0
