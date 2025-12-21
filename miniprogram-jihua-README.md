# 际华协同办公小程序

## 📱 项目简介

际华协同办公小程序是为际华企业员工打造的移动办公助手,提供任务管理、商机跟进、项目协作等核心功能,让员工随时随地高效办公。

## 🎨 设计理念

- **Editorial/Magazine风格**: 采用杂志编辑风格,专业且优雅
- **品牌橙色**: 主色调 #FF6B35,传递企业活力
- **非对称布局**: 打破传统居中设计,提升视觉层次

## 🏗️ 项目架构

```
miniprogram-jihua/
├── miniprogram/              # 小程序前端
│   ├── pages/
│   │   ├── index/           # 工作台首页
│   │   ├── tasks/           # 任务列表
│   │   ├── opportunities/   # 商机列表
│   │   ├── projects/        # 项目列表
│   │   └── profile/         # 个人中心
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── cloudfunctions/          # 云函数
│   ├── getOpenId/          # 获取OpenID
│   ├── getWorkbenchData/   # 获取工作台数据
│   ├── getTasks/           # 获取任务列表
│   ├── getOpportunities/   # 获取商机列表
│   ├── getProjects/        # 获取项目列表
│   └── getUserInfo/        # 获取用户信息
└── project.config.json
```

## ☁️ CloudBase资源

### 环境配置
- **环境ID**: jihua-oa-dev-3goht9irae4d949f
- **环境名称**: jihua-oa-dev

### 使用的数据库集合
- `users` - 用户信息(需包含 wxOpenId 字段)
- `tasks` - 任务数据
- `opportunities` - 商机数据
- `projects` - 项目数据

### 云函数列表
1. `getOpenId` - 获取用户OpenID
2. `getWorkbenchData` - 工作台数据聚合
3. `getTasks` - 查询用户任务
4. `getOpportunities` - 查询用户商机
5. `getProjects` - 查询用户项目
6. `getUserInfo` - 查询用户详细信息

## 🚀 部署步骤

### 1. 配置小程序AppID
已配置: `wx79afc92f6fe01a31`

### 2. 上传云函数
在微信开发者工具中,右键每个云函数目录 → 上传并部署:云端安装依赖

需要上传的云函数:
- `getOpenId`
- `getWorkbenchData`
- `getTasks`
- `getOpportunities`
- `getProjects`
- `getUserInfo`

### 3. 配置数据库
确保 `users` 集合中的用户记录包含 `wxOpenId` 字段:

```javascript
{
  _id: "user-001",
  name: "张三",
  phone: "13800138000",
  wxOpenId: "oXXXX-xxxxxxxxxxxxxxxxxxxxxxx", // 微信OpenID
  role: "员工",
  department: "销售部",
  // ... 其他字段
}
```

### 4. 用户绑定流程
**方式一:扫码绑定(推荐)**
- Web端生成绑定二维码(包含用户ID)
- 小程序扫码获取用户ID
- 自动绑定OpenID到用户记录

**方式二:手机号验证码绑定**
- 小程序输入手机号
- 发送验证码验证
- 匹配users表中的手机号
- 绑定OpenID

## 🔑 认证机制

### 小程序认证特点
- **无需显式登录**: 微信小程序自动获取OpenID
- **云函数自动识别**: 每次调用云函数自动获取 wxContext.OPENID
- **用户绑定**: OpenID关联到现有users表

### 数据查询流程
```javascript
1. 云函数获取 wxContext.OPENID
2. 查询 users 集合: { wxOpenId: OPENID }
3. 获取用户_id
4. 使用用户_id查询业务数据(tasks/opportunities/projects)
5. 返回数据到小程序
```

## 📊 功能模块

### 1. 工作台首页 (pages/index)
- **统计数据**: 今日任务、待跟进商机、进行中项目
- **最近任务**: 显示最近3条任务
- **最近商机**: 显示最近3条商机
- **快速导航**: 跳转到任务/商机/项目列表

### 2. 任务列表 (pages/tasks)
- 查看我的任务(负责人或协同人)
- 显示任务状态、截止日期、完成进度
- 支持下拉刷新

### 3. 商机列表 (pages/opportunities)
- 查看我的商机
- 显示客户名称、预估金额、当前阶段
- 支持下拉刷新

### 4. 项目列表 (pages/projects)
- 查看我的项目
- 显示项目进度、状态、负责人

### 5. 个人中心 (pages/profile)
- 用户信息展示
- 快捷功能入口
- 设置和关于

## 🎯 下一步开发计划

### 阶段二功能(基础操作)
- [ ] 任务状态更新
- [ ] 任务评论功能
- [ ] 商机跟进记录
- [ ] 项目进度更新

### 阶段三功能(完整版)
- [ ] 创建任务/商机/项目
- [ ] 文件上传
- [ ] 消息推送
- [ ] 数据统计图表

## 🔗 相关链接

- **小程序AppID**: wx79afc92f6fe01a31
- **小程序名称**: jihuadz cowork
- **CloudBase控制台**: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f
- **云函数管理**: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/scf
- **数据库管理**: https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/db/doc

## 📝 开发说明

### 本地开发
1. 下载并安装微信开发者工具
2. 打开项目根目录
3. 选择小程序项目类型
4. 输入AppID: wx79afc92f6fe01a31
5. 点击编译预览

### 真机调试
- 点击工具栏"预览"按钮
- 使用手机微信扫描二维码
- 在真机上测试功能

### 云函数调试
- 右键云函数 → 本地调试
- 或在云控制台查看日志

## ⚠️ 注意事项

1. **用户绑定必需**: 使用前必须将用户OpenID绑定到users表
2. **数据权限**: 云函数已实现基础权限控制(只查询自己的数据)
3. **错误处理**: 所有云函数都包含try-catch错误处理
4. **测试环境**: 当前使用开发环境,生产发布需切换env配置

## 🎉 首次部署完成!

小程序基础框架已搭建完成,包括:
✅ 5个页面(工作台、任务、商机、项目、个人中心)
✅ 6个云函数(数据查询)
✅ 精美UI设计(Editorial/Magazine风格)
✅ CloudBase集成
✅ TabBar导航

**下一步**: 上传云函数并配置用户OpenID绑定!
