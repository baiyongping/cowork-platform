# 📋 文件清理方案

**创建时间:** 2025-12-21  
**目的:** 清理项目中的临时文件、过期文档和重复脚本，保持项目目录整洁

---

## 🗂️ 清理方案概览

| 分类 | 文件数量 | 操作 | 状态 |
|------|---------|------|------|
| 垃圾文件(必删) | ~80 | 删除 | ⏳ 待执行 |
| 归档文档 | ~60 | 移动到 docs/ | ⏳ 待执行 |
| 保留文件 | ~40 | 保持原位 | ✅ 无需操作 |

---

## 🗑️ 第一步: 删除垃圾文件

### 1.1 构建日志文件
```
✗ build.log
✗ build-output.log
✗ build-test.log
```

### 1.2 临时测试 HTML 文件
```
✗ check-user-role.html
✗ fix-baiyp02-simple.html
✗ quick-fix-baiyp02.html
✗ reset-admin.html
✗ update-users-role.html
✗ 创建测试角色和用户.html
✗ 测试CORS.html
✗ 重置管理员密码.html
```

### 1.3 Nginx 配置文件(本地备份无需保留)
```
✗ nginx.conf
✗ nginx-https.conf
✗ nginx-parasaga.conf
```

### 1.4 临时文本文件
```
✗ UnionID部署报告.txt
✗ 服务器部署命令集.txt
✗ 测试服务器地址更新记录.md
✗ 短信验证码测试模式配置完成.md
✗ 环境配置调整完成.md
✗ 环境配置完成总结.md
```

---

## 📦 第二步: 归档文档

### 2.1 完成报告 → `docs/archived-reports/`
```
→ 版本2.0.0发布完成报告.md
→ 部门数据清理完成报告.md
→ 测试环境CORS修复完成报告.md
→ 测试环境TypeError修复报告.md
→ 登录认证失败问题修复报告.md
→ 废弃user角色修复报告_v2.2.0.md
→ 角色权限列表key警告修复报告.md
→ 阶段一需求变更同步更新报告.md
→ 类型设置重复数据修复报告_v2.2.5.md
→ 权限管理模块功能结构完善报告.md
→ 权限管理系统_阶段二_后端API适配完成报告.md
→ 权限管理系统_阶段三_前端权限控制完成报告.md
→ 权限管理系统实现完成确认.md
→ 权限管理系统实现总结.md
→ 权限管理系统修复报告_v2.2.0.md
→ 权限管理系统修复完成报告_v2.1.0.md
→ 权限管理系统需求更新完成报告.md
→ 权限管理系统优化完成报告.md
→ 权限管理系统字段名修复报告_v2.2.2.md
→ 权限管理Tab显示控制完成报告_v2.2.3.md
→ 任务公开权限功能完成报告.md
→ 任务管理模块v1.2.0版本归档完成报告.md
→ 任务回收站功能完成报告.md
→ 商机成交时间字段优化完成报告.md
→ 商机管理和系统设置优化报告.md
→ 商机阶段数据丢失问题排查报告.md
→ 商机阶段数据丢失问题修复报告.md
→ 商机模块问题修复报告.md
→ 商机模块优化测试报告.md
→ 商机目标季度卡片权限修复报告.md
→ 生产环境匿名登录403问题修复报告.md
→ 数据交接功能修复完成报告.md
→ 退出登录功能修复报告.md
→ 项目创建owner字段缺失问题修复报告.md
→ 项目模块优化_v1.3.0_完成报告.md
→ 项目清理完成报告.md
→ 项目详情修订完成确认.md
→ 新建商机责任人问题修复报告.md
→ 用户角色和职务显示修复完成报告_v2.2.1.md
→ 员工部门同步问题修复报告.md
→ 员工详情职务字段完成报告.md
→ 员工注册小程序功能开发完成.md
→ 员工注册页面扫码问题修复报告.md
→ b05权限问题分析报告.md
→ b05权限问题修复完成报告.md
→ baiyp02权限问题诊断报告.md
→ baiyp02权限修复完成报告.md
→ user角色废弃完成总结_v2.2.0.md
→ userPermissions未定义问题修复报告.md
→ v2.0.0更新完成总结.md
→ verify-opportunity-stages-fix.md
→ 权限系统分步开发完成报告.md
```

### 2.2 功能说明 → `docs/guides/features/`
```
→ 个人信息页面团队功能说明.md
→ 功能模块名称配置说明.md
→ 功能模块名称修改问题修复报告.md
→ 类型设置使用说明.md
→ 离职人员自动回收站功能说明.md
→ 权限管理快速参考.md
→ 权限管理系统说明.md
→ 权限系统快速上手指南.md
→ 商机模块测试操作指南.md
→ 系统参数功能测试指南.md
→ 系统参数功能实现总结.md
→ 系统参数功能说明.md
→ 系统参数快速参考.md
→ 系统设置保存功能使用指南.md
→ 系统设置类型管理优化完成报告.md
→ 项目状态与销售业绩功能说明.md
→ 小程序码配置完整指南.md
→ 小程序注册流程说明.md
→ 员工列表搜索筛选功能说明.md
→ 员工上级管理功能说明.md
→ 员工职务功能说明.md
```

### 2.3 开发指南 → `docs/guides/development/`
```
→ cowork开发规则.md
→ 快速开始指南.md
→ 快速启动指南.md
→ 清除浏览器缓存指南.md
→ 问题排查手册.md
→ 权限系统测试方案.md
→ 权限系统测试清单.md
→ 优化功能开发清单.md
```

### 2.4 部署文档 → `docs/deployment/`
```
→ 版本管理和备份方案.md
→ 版本管理指南.md
→ 本地开发环境配置指南.md
→ 本地开发切换cowork数据库方案.md
→ 测试服务器配置.md
→ 测试环境CORS配置指南.md
→ 服务器连接测试报告.md
→ 生产环境CORS问题修复指南.md
→ 微信登录配置总结.md
→ 小程序码生成问题排查及解决方案.md
→ 域名解析测试报告.md
→ DEPLOY.md
→ DEPLOYMENT_GUIDE.md
→ UnionID方案快速参考.md
→ VERSION_ARCHIVE_GUIDE.md
```

### 2.5 版本发布 → `docs/releases/`
```
→ RELEASE_NOTES_v1.1.0.md
→ RELEASE_NOTES_v1.1.1.md
→ RELEASE_NOTES_v2.0.0.md
→ RELEASE_NOTES_v3.0.0.md
→ TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md
→ TASK_MODULE_v1.2.0_QUICK_ACCESS.md
→ TASK_MODULE_VERSION_v1.2.0.md
→ 智能工作台到期提醒系统开发总结_v3.0.0.md
```

### 2.6 脚本归档 → `scripts/archived/`
```
→ 本地构建上传脚本.bat
→ 部署到测试环境.bat
→ 部署Parasaga.ps1
→ 部署Parasaga到服务器.sh
→ 发布新版本.bat
→ 快速部署Parasaga.bat
→ 快速初始化.ps1
→ 快速配置测试环境.bat
→ 快速配置HTTPS.bat
→ 快速升级.bat
→ 快速修复baiyp02权限问题.md
→ 快速验证baiyp02权限.bat
→ 配置测试环境HTTPS.sh
→ 配置测试环境Nginx.sh
→ 上传到服务器.bat
→ 修复生产环境CORS.bat
→ 验证并初始化数据库.bat
→ 验证权限修复.bat
→ 一键配置HTTPS.bat
→ 移除user角色.bat
→ 直接上传.bat
→ PowerShell自动部署.ps1
→ SSL证书申请脚本.sh
→ init.bat
→ 环境管理.bat
→ 初始化权限系统.bat
→ 初始化数据库.bat
```

### 2.7 测试文件 → `scripts/tests/`
```
→ test-fixed-hash.cjs
→ test-hash.cjs
→ test-hash.js
→ test-login-server.sh
→ test-permissions.js
→ test-textencoder-hash.cjs
```

---

## ✅ 第三步: 保留的核心文件

### 3.1 配置文件(保持原位)
```
✓ .dockerignore
✓ .env.development
✓ .env.example
✓ .env.production
✓ .env.test
✓ .eslintrc.cjs
✓ .gitignore
✓ cloudbaserc.json
✓ config.json
✓ package.json
✓ package-lock.json
✓ tsconfig.json
✓ tsconfig.node.json
✓ tailwind.config.js
✓ postcss.config.js
✓ vite.config.ts
✓ Dockerfile
✓ project.config.json
✓ project.private.config.json
```

### 3.2 核心代码文件
```
✓ App.tsx
✓ main.tsx
✓ app.js
✓ index.html
✓ logo.png
```

### 3.3 核心文档
```
✓ README.md
✓ CODEBUDDY.md
✓ AGENTS.md
✓ CLAUDE.md
✓ Attributions.md
✓ VERSION.md
✓ 际华协同办公平台_PRD产品需求文档_v3.0.md
✓ miniprogram-jihua-README.md
```

### 3.4 核心目录
```
✓ components/
✓ lib/
✓ utils/
✓ contexts/
✓ types/
✓ styles/
✓ public/
✓ cloudfunctions/
✓ miniprogram/
✓ server/
✓ database/
✓ hooks/
✓ mocks/
✓ rules/
✓ Guidelines/
```

---

## 🎯 执行步骤

### 自动执行(推荐)
```powershell
# 1. 运行归档脚本
.\scripts\archive-old-files.ps1

# 2. 验证归档结果
Get-ChildItem docs\ -Recurse -Directory

# 3. 确认无误后删除垃圾文件
.\clean-project.bat
```

### 手动执行
1. **备份整个项目** (以防万一)
2. **创建归档目录结构**
3. **移动文档到对应目录**
4. **删除垃圾文件**
5. **提交到 Git**

---

## 📊 预期效果

**清理前:**
- 根目录文件: ~150 个
- 项目大小: ~XXX MB
- 文件混乱: 难以查找

**清理后:**
- 根目录文件: ~40 个
- 项目大小: ~XXX MB (基本不变)
- 文件组织: 清晰明了

---

## ⚠️ 注意事项

1. **执行前务必备份整个项目**
2. **确保不在使用任何被移动/删除的文件**
3. **建议在新分支上操作**
4. **逐步执行,每步验证结果**
5. **保留 30 天的备份**

---

## 🔄 后续维护

### 定期清理规则
- **每月清理:** 构建日志、临时文件
- **季度归档:** 完成报告、过期脚本
- **年度审查:** 整体文档结构优化

### 文件命名规范
- **报告:** `功能_版本_完成报告.md`
- **脚本:** `动作-目标.bat/ps1/sh`
- **文档:** `主题-详细说明.md`

---

**创建者:** AI Assistant  
**审核者:** (待填写)  
**执行日期:** (待填写)
