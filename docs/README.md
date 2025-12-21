# 际华定制协同办公管理平台 - 文档导航

欢迎来到际华定制协同办公管理平台项目！本文档将帮助您快速了解项目并开始开发。

---

## 📚 文档目录

### 1. [产品需求文档（PRD）](./PRD-际华定制协同办公管理平台.md)
**适用人群**：产品经理、项目经理、测试工程师、UI/UX设计师

**包含内容**：
- 产品概述与定位
- 用户角色与权限
- 核心功能模块详细说明
- 业务规则与流程
- 数据模型设计
- 非功能需求
- 项目实施计划

**建议阅读顺序**：
1. 先阅读"一、产品概述"了解背景
2. 再阅读"三、核心功能模块"了解具体功能
3. 最后阅读"四、数据模型设计"了解数据结构

---

### 2. [开发交付文档](./开发交付文档.md)
**适用人群**：前端开发、后端开发、运维工程师

**包含内容**：
- 技术架构与技术栈
- 代码结构与组件说明
- 已完成功能清单
- 数据模型SQL定义
- API接口规范（完整接口文档）
- 开发规范（Git、TypeScript、React）
- 部署指南（前端、后端、数据库）
- 测试指南
- 常见问题FAQ

**建议阅读顺序**：
1. 先阅读"二、技术架构"了解整体架构
2. 再阅读"三、代码结构"熟悉项目结构
3. 然后阅读"六、API接口规范"对接接口
4. 最后阅读"九、部署指南"进行部署

---

## 🚀 快速开始

### 项目概览

**项目名称**：际华定制协同办公管理平台  
**项目定位**：专为职业装定制企业设计的团队协同办公系统  
**核心模块**：任务管理、商机管理、项目管理、目标管理、系统设置

### 技术栈

**前端**
- React 18 + TypeScript
- Tailwind CSS 4.0
- Lucide React（图标）

**推荐后端**
- Node.js (NestJS) 或 Python (Django) 或 Java (Spring Boot)
- PostgreSQL 14+
- Redis 6+

### 环境要求

```bash
# Node.js版本
node -v  # >= 18.0.0

# npm版本
npm -v   # >= 9.0.0
```

### 安装与运行

```bash
# 1. 克隆项目
git clone <repository-url>

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器访问
# http://localhost:5173
```

---

## 📂 项目结构

```
/
├── App.tsx                          # 主入口
├── components/
│   ├── pages/                      # 页面组件
│   │   ├── TaskManagement.tsx     # 任务管理 ✅
│   │   ├── OpportunityManagement.tsx  # 商机管理 🔄
│   │   ├── ProjectManagement.tsx      # 项目管理 🔄
│   │   ├── GoalManagement.tsx         # 目标管理 🔄
│   │   └── SystemSettings.tsx         # 系统设置 ✅
│   └── common/                     # 通用组件（待扩展）
├── styles/
│   └── globals.css                 # 全局样式
├── docs/                           # 📚 文档目录
│   ├── README.md                   # 本文档
│   ├── PRD-际华定制协同办公管理平台.md
│   └── 开发交付文档.md
└── package.json
```

**图例**：
- ✅ 已完成
- 🔄 开发中
- ⏳ 未开始

---

## 🎯 核心功能状态

### 任务管理模块 ✅ 完成度：100%

| 功能 | 状态 |
|-----|------|
| 任务创建/编辑/删除 | ✅ |
| 任务详情查看 | ✅ |
| 任务状态管理（动态变化） | ✅ |
| 任务进度管理（双控件） | ✅ |
| 商机跟进动作类型 | ✅ |
| 项目任务环节 | ✅ |
| 任务协同人管理 | ✅ |
| 任务评论功能 | ✅ |
| 任务筛选和搜索 | ✅ |

### 系统设置模块 ✅ 完成度：100%

| 功能 | 状态 |
|-----|------|
| 用户管理 | ✅ |
| 角色权限管理 | ✅ |
| 任务类型设置 | ✅ |
| 任务状态设置 | ✅ |
| 项目状态设置 | ✅ |
| 商机阶段设置 | ✅ |
| 项目阶段设置 | ✅ |
| 操作日志（含导出） | ✅ |

### 商机管理模块 🔄 完成度：30%

| 功能 | 状态 |
|-----|------|
| 商机创建 | 🔄 |
| 商机四阶段管理 | 🔄 |
| 商机转化为项目 | ⏳ |
| 商机数据看板 | ⏳ |

### 项目管理模块 🔄 完成度：30%

| 功能 | 状态 |
|-----|------|
| 项目创建 | 🔄 |
| 项目三阶段管理 | 🔄 |
| 项目任务关联 | ⏳ |
| 项目数据看板 | ⏳ |

### 目标管理模块 🔄 完成度：30%

| 功能 | 状态 |
|-----|------|
| 目标创建 | 🔄 |
| 目标分解 | ⏳ |
| 目标进度跟踪 | ⏳ |
| 目标数据看板 | ⏳ |

---

## 🔑 核心特性亮点

### 1. 任务状态动态变化 ⭐⭐⭐⭐⭐

任务状态根据任务类型智能切换：
- **日常工作/商机跟进**：未开始、进行中、已完成、延期、取消、暂停
- **项目任务**：未开始、准备期、制造期、交付期、已完成、暂停

### 2. 任务进度双控件 ⭐⭐⭐⭐⭐

创新的进度输入方式：
- 滑块控件：拖动调整，实时视觉反馈
- 数字输入：精确输入，自动范围限制
- 双向同步：两种控件实时联动

### 3. 编辑时数据完整保留 ⭐⭐⭐⭐⭐

编辑任务时：
- 所有字段数据完整保留
- 包括进度、协同人、状态等12个字段
- 用户体验流畅，无数据丢失

### 4. 灵活的权限控制 ⭐⭐⭐⭐

- 编辑按钮仅对任务负责人或管理员显示
- 任务可见性根据级别和公开性控制
- 协同人可查看和评论，但不能编辑

---

## 📖 开发指南

### 开发规范

**命名规范**
```typescript
// 组件：PascalCase
TaskManagement.tsx

// 函数：camelCase
handleEditTask()

// 常量：UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 1024;
```

**TypeScript规范**
```typescript
// ✅ 推荐：显式类型定义
interface TaskProps {
  task: Task;
  onEdit: (task: Task) => void;
}

// ❌ 避免：使用any
const data: any = {};
```

**React规范**
```typescript
// ✅ 推荐：函数式更新
setCount(prev => prev + 1);

// ❌ 避免：直接使用当前值
setCount(count + 1);
```

**Tailwind CSS规范**
```tsx
// ✅ 推荐：不使用字体相关类（由globals.css管理）
<h1>标题</h1>

// ❌ 避免：使用字体大小/粗细/行高类
<h1 className="text-2xl font-bold">标题</h1>
```

### Git工作流

```
main          # 主分支
├── develop   # 开发分支
│   ├── feature/task-management
│   ├── feature/opportunity-management
│   └── ...
└── hotfix/   # 紧急修复
```

**提交信息规范**
```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具

示例：
feat: 添加任务进度双控件
fix: 修复任务状态切换bug
```

---

## 🔌 API接口对接

### Base URL

```
开发环境：http://localhost:3000/api
生产环境：https://api.jihua-oa.com/api
```

### 认证方式

```
Authorization: Bearer {access_token}
```

### 核心接口列表

**任务管理**
- `GET /tasks` - 获取任务列表
- `GET /tasks/:id` - 获取任务详情
- `POST /tasks` - 创建任务
- `PUT /tasks/:id` - 更新任务
- `DELETE /tasks/:id` - 删除任务
- `POST /tasks/:id/comments` - 添加评论

**商机管理**
- `GET /opportunities` - 获取商机列表
- `POST /opportunities` - 创建商机
- `PATCH /opportunities/:id/stage` - 更新阶段
- `POST /opportunities/:id/convert` - 转化为项目

**项目管理**
- `GET /projects` - 获取项目列表
- `POST /projects` - 创建项目
- `PATCH /projects/:id/phase` - 更新阶段

**目标管理**
- `GET /goals` - 获取目标列表
- `POST /goals` - 创建目标
- `PATCH /goals/:id/progress` - 更新进度

**系统设置**
- `GET /system/configs` - 获取系统配置
- `PUT /system/configs` - 更新配置
- `GET /system/logs` - 获取操作日志

**详细接口文档**：请参阅[开发交付文档](./开发交付文档.md)第六章

---

## 🚀 部署指南

### 前端部署

```bash
# 1. 构建
npm run build

# 2. 部署到Nginx
# 将dist目录上传到服务器
# 配置Nginx（参见开发交付文档）

# 3. 配置环境变量
VITE_API_BASE_URL=https://api.jihua-oa.com/api
```

### 后端部署

```bash
# 1. 安装依赖
npm install --production

# 2. 构建
npm run build

# 3. 使用PM2启动
pm2 start ecosystem.config.js

# 4. 数据库迁移
npm run migration:run
```

**详细部署文档**：请参阅[开发交付文档](./开发交付文档.md)第九章

---

## 🧪 测试指南

### 单元测试

```bash
# 运行所有测试
npm test

# 查看覆盖率
npm run test:coverage

# 监听模式
npm run test:watch
```

### E2E测试

```bash
# 使用Playwright
npm run test:e2e

# 使用Cypress
npm run cypress:open
```

**测试覆盖率目标**
- 单元测试：> 80%
- 集成测试：> 60%
- E2E测试：核心流程100%

---

## 🐛 常见问题

### Q1: 任务状态切换不生效？
**A**: 检查formData.type是否正确设置，确保状态选项根据类型动态变化。

### Q2: 编辑任务时数据丢失？
**A**: 确保handleEditTask函数填充了所有formData字段，包括progress。

### Q3: npm install失败？
**A**: 
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Q4: 生产环境白屏？
**A**: 检查API_BASE_URL配置、Nginx配置、控制台错误信息。

**更多问题**：请参阅[开发交付文档](./开发交付文档.md)第十一章

---

## 📞 联系方式

**技术支持**
- 邮箱：dev@jihua-oa.com
- 文档：https://docs.jihua-oa.com

**问题反馈**
- GitHub Issues: https://github.com/jihua/oa-platform/issues

---

## 📝 更新日志

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| v1.0.0 | 2025-12-04 | 初始版本，任务管理和系统设置完成 |

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

**祝开发顺利！🚀**

如有任何问题，请随时查阅详细文档或联系技术支持团队。
