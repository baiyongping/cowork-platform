# 数据库集合完整指南

> **版本**: v1.0  
> **更新日期**: 2026-01-09  
> **维护者**: 际华协同办公平台开发团队  

本文档详细说明了系统中所有数据库集合的用途、结构和关联关系。

---

## 📋 目录

- [核心业务模块集合](#核心业务模块集合)
- [目标管理相关集合](#目标管理相关集合)
- [预算管理相关集合](#预算管理相关集合)
- [系统管理相关集合](#系统管理相关集合)
- [认证相关集合](#认证相关集合)
- [关联数据集合](#关联数据集合)
- [系统配置集合](#系统配置集合)

---

## 核心业务模块集合

### 1. `tasks` - 任务管理
**用途**: 存储所有任务数据  
**功能模块**: 任务管理 (tasks)  
**主要字段**:
- `_id`: 任务ID
- `name`: 任务名称
- `owner`: 负责人
- `level`: 任务级别 (公司级/团队级/个人级)
- `type`: 任务类型 (日常工作/商机跟进/项目任务)
- `status`: 任务状态
- `progress`: 完成进度
- `startDate`, `endDate`: 起止日期
- `description`: 任务描述
- `relatedTo`: 关联内容ID (商机/项目/目标)

**关联数据**:
- `task_comments`: 任务评论

---

### 2. `issues` - 问题管理
**用途**: 存储问题记录和跟踪数据  
**功能模块**: 问题管理 (issues)  
**主要字段**:
- `_id`: 问题ID
- `title`: 问题标题
- `description`: 问题描述
- `priority`: 优先级 (低/中/高/紧急)
- `status`: 状态 (待处理/处理中/已解决/已关闭)
- `assignee`: 负责人
- `reporter`: 报告人
- `resolution`: 解决方案
- `closedAt`: 关闭时间

**关联数据**:
- `issue_replies`: 问题回复
- `issueComments`: 问题评论 (旧版本,建议合并到 issue_replies)

---

### 3. `opportunities` - 商机管理
**用途**: 存储商机信息和跟进记录  
**功能模块**: 商机管理 (opportunities)  
**主要字段**:
- `_id`: 商机ID
- `customer`: 客户名称
- `contact`: 联系人
- `amount`: 商机金额
- `status`: 商机状态 (潜在商机/意向客户/方案报价/谈判中/已成交/已失败)
- `owner`: 负责人
- `expectedCloseDate`: 预计成交日期
- `description`: 商机描述
- `followUpRecords`: 跟进记录数组

---

### 4. `projects` - 项目管理
**用途**: 存储项目信息和执行进度  
**功能模块**: 项目管理 (projects)  
**主要字段**:
- `_id`: 项目ID
- `name`: 项目名称
- `owner`: 项目负责人
- `customer`: 客户名称
- `phase`: 当前阶段 (立项/设计/实施/验收/结项)
- `status`: 项目状态
- `budget`: 项目预算
- `actualCost`: 实际成本
- `startDate`, `endDate`: 项目周期
- `progress`: 完成进度

---

### 5. `meetings` - 例会管理
**用途**: 存储会议安排和参与信息  
**功能模块**: 例会管理 (meetings)  
**主要字段**:
- `_id`: 会议ID
- `title`: 会议标题
- `type`: 会议类型 (周会/月会/季度会/年度会)
- `date`: 会议日期
- `startTime`, `endTime`: 会议时间
- `location`: 会议地点
- `organizer`: 组织者
- `attendees`: 参会人员数组
- `agenda`: 会议议程
- `status`: 会议状态 (待召开/进行中/已结束)

**关联数据**:
- `meeting_minutes`: 会议纪要

---

## 目标管理相关集合

### 6. `sales_goals` - 销售目标
**用途**: 存储销售目标数据 (已合并商机目标)  
**功能模块**: 目标管理 > 销售目标 (goal.salesGoal)  
**主要字段**:
- `_id`: 目标ID
- `year`: 年度
- `quarter`: 季度
- `department`: 部门
- `target`: 目标金额
- `actual`: 实际完成
- `completion`: 完成率

**说明**: 原 `opportunity_goals` 集合已合并到此集合

---

### 7. `product_order_forecast` - 产品订单预测
**用途**: 存储产品订单目标和预测数据  
**功能模块**: 目标管理 > 产品订单预测 (goal.productOrder)  
**主要字段**:
- `_id`: 预测ID
- `year`: 年度
- `product`: 产品名称
- `forecast`: 预测订单量
- `actual`: 实际订单量
- `variance`: 差异分析

---

### 8. `annual_strategies` - 年度策略
**用途**: 存储年度经营策略和执行措施  
**功能模块**: 目标管理 > 年度策略 (goal.strategy)  
**主要字段**:
- `_id`: 策略ID
- `year`: 年度
- `strategyName`: 策略名称
- `description`: 策略描述
- `objectives`: 目标数组
- `measures`: 措施数组
- `owner`: 负责人
- `status`: 执行状态

**关联数据**:
- `quarterly_measures`: 季度经营措施
- `safeguardMeasures`: 保障措施

---

### 9. `outcome_goals` - 成果目标
**用途**: 存储成果目标数据  
**功能模块**: 目标管理 > 成果目标 (goal.outcome)  
**主要字段**:
- `_id`: 目标ID
- `year`: 年度
- `goalName`: 目标名称
- `description`: 目标描述
- `target`: 目标值
- `actual`: 实际值
- `unit`: 单位
- `owner`: 负责人
- `relatedTasks`: 关联任务数组

---

### 10. `decompositionTables` - 目标分解表
**用途**: 存储目标分解表配置  
**功能模块**: 目标管理 > 目标分解 (goal.decomposition)  
**主要字段**:
- `_id`: 分解表ID
- `name`: 分解表名称
- `year`: 年度
- `dimensions`: 维度配置数组
- `enabled`: 是否启用
- `order`: 显示顺序

**关联数据**:
- `decompositionDimensions`: 分解维度定义
- `decompositionTableConfigs`: 分解表详细配置
- `goalDecompositionData`: 分解数据
- `goalDecompositionDimensions`: 目标分解维度
- `goalDecompositionHistory`: 分解历史记录
- `goalDecompositions`: 目标分解记录
- `goalDecompositions2025` ~ `goalDecompositions2030`: 年度目标分解数据

**说明**: 目标分解采用多表结构,每年度单独存储

---

### 11. `goals` - 目标 (通用)
**用途**: 可能是历史数据或通用目标表  
**状态**: 待确认是否仍在使用  
**建议**: 检查是否可以合并到其他专用目标表

---

## 预算管理相关集合

### 12. `annual_budgets` - 年度预算
**用途**: 存储年度预算编制数据  
**功能模块**: 预算管理 > 年度预算 (budget.annual)  
**主要字段**:
- `_id`: 预算ID
- `year`: 年度
- `department`: 部门
- `category`: 预算类别
- `amount`: 预算金额
- `status`: 审批状态 (草稿/待审批/已批准/已驳回)
- `approver`: 审批人

---

### 13. `budget_execution` - 预算执行
**用途**: 存储预算执行情况数据  
**功能模块**: 预算管理 > 预算执行 (budget.execution)  
**主要字段**:
- `_id`: 执行记录ID
- `year`: 年度
- `month`: 月份
- `budgetId`: 关联预算ID
- `budgeted`: 预算金额
- `actual`: 实际支出
- `variance`: 差异
- `varianceRate`: 差异率

---

### 14. `asset_budgets` - 资产预算
**用途**: 存储资产采购预算数据  
**功能模块**: 预算管理 > 资产预算 (budget.asset)  
**主要字段**:
- `_id`: 资产预算ID
- `year`: 年度
- `assetName`: 资产名称
- `category`: 资产类别
- `amount`: 预算金额
- `purchaseDate`: 计划采购日期
- `status`: 审批状态

---

### 15. `hrExpenses` - 薪酬预算
**用途**: 存储薪酬成本预算数据  
**功能模块**: 预算管理 > 薪酬预算 (budget.hr)  
**主要字段**:
- `_id`: 薪酬预算ID
- `year`: 年度
- `department`: 部门
- `position`: 岗位
- `headcount`: 人数
- `salary`: 薪酬金额
- `benefits`: 福利金额
- `total`: 总成本

**关联数据**:
- `payroll_accounts`: 工资科目

---

### 16. `budget_accounts` - 预算科目
**用途**: 存储预算科目定义  
**关联模块**: 预算管理 (通用)  
**主要字段**:
- `_id`: 科目ID
- `code`: 科目编码
- `name`: 科目名称
- `category`: 科目类别
- `level`: 科目层级
- `parentCode`: 父科目编码

**说明**: 可能对应 budget.parameters (预算参数)

---

## 系统管理相关集合

### 17. `users` - 用户信息
**用途**: 存储所有用户(员工)信息  
**功能模块**: 
- 系统设置 > 用户审核 (settings.userApproval)
- 系统设置 > 员工管理 (settings.employees)
- 个人信息 > 基本信息 (profile.info)

**主要字段**:
- `_id`: 用户ID
- `_openid`: 微信OpenID (认证标识)
- `username`: 用户名
- `name`: 姓名
- `email`: 邮箱
- `phone`: 手机号
- `department`: 部门
- `position`: 职位
- `role`: 角色
- `status`: 状态 (active/inactive/pending/deleted)
- `isDeleted`: 软删除标记
- `deletedAt`: 删除时间

**关联数据**:
- `pending_users`: 待审核用户 (状态为pending的用户子集)
- `handover_history`: 业务交接历史

---

### 18. `departments` - 部门管理
**用途**: 存储部门组织架构  
**功能模块**: 系统设置 > 部门管理 (settings.departments)  
**主要字段**:
- `_id`: 部门ID
- `name`: 部门名称
- `code`: 部门编码
- `parentId`: 上级部门ID
- `level`: 部门层级
- `manager`: 部门负责人
- `order`: 显示顺序

---

### 19. `role_permissions` - 角色权限
**用途**: 存储角色权限配置  
**功能模块**: 系统设置 > 角色权限 (settings.roles)  
**主要字段**:
- `_id`: 角色ID
- `roleName`: 角色名称
- `description`: 角色描述
- `permissions`: 权限配置对象
  - 各模块权限: `{view, create, edit, delete, export}`
- `isActive`: 是否启用

---

### 20. `type_settings` - 参数配置
**用途**: 存储系统参数和选项配置  
**功能模块**: 系统设置 > 参数配置 (settings.typeSettings)  
**主要字段**:
- `_id`: 配置ID
- `category`: 配置类别
- `type`: 配置类型
- `name`: 配置名称
- `value`: 配置值
- `options`: 选项数组
- `order`: 显示顺序

**说明**: 包含任务类型、商机状态、项目阶段等所有下拉选项

---

### 21. `operation_logs` - 操作日志
**用途**: 存储系统操作记录  
**功能模块**: 系统设置 > 操作日志 (settings.operationLogs)  
**主要字段**:
- `_id`: 日志ID
- `userId`: 操作用户ID
- `userName`: 操作用户名
- `module`: 操作模块
- `action`: 操作类型 (create/update/delete)
- `target`: 操作对象
- `details`: 操作详情
- `ipAddress`: IP地址
- `timestamp`: 操作时间

---

### 22. `modulesConfig` - 功能模块配置
**用途**: 存储功能模块的启用/禁用和排序  
**功能模块**: 系统设置 > 功能模块 (settings.moduleManagement)  
**主要字段**:
- `_id`: 配置ID
- `moduleCode`: 模块代码
- `enabled`: 是否启用
- `order`: 显示顺序
- `updatedAt`: 更新时间
- `updatedBy`: 更新人

**关联数据**:
- `moduleOrder`: 模块排序配置 (旧版本,建议合并)

---

### 23. `audit_logs` - 审计日志
**用途**: 存储系统审计记录  
**关联模块**: 系统日志 (系统级)  
**主要字段**:
- `_id`: 日志ID
- `eventType`: 事件类型
- `userId`: 用户ID
- `resource`: 资源类型
- `action`: 操作
- `before`: 操作前数据
- `after`: 操作后数据
- `timestamp`: 时间戳

**说明**: 更详细的审计记录,可能用于合规性审计

---

## 认证相关集合

### 24. `wechat_sessions` - 微信会话
**用途**: 存储微信登录会话信息  
**关联模块**: 身份认证 (系统级)  
**主要字段**:
- `_id`: 会话ID
- `openid`: 微信OpenID
- `unionid`: 微信UnionID
- `sessionKey`: 会话密钥
- `expiresAt`: 过期时间
- `createdAt`: 创建时间

---

### 25. `sms_codes` - 短信验证码
**用途**: 存储短信验证码记录  
**关联模块**: 身份认证 (系统级)  
**主要字段**:
- `_id`: 记录ID
- `phone`: 手机号
- `code`: 验证码
- `type`: 验证码类型 (register/login/reset)
- `expiresAt`: 过期时间
- `used`: 是否已使用

---

### 26. `invitation_codes` - 邀请码
**用途**: 存储用户邀请码  
**关联模块**: 身份认证 (系统级)  
**主要字段**:
- `_id`: 邀请码ID
- `code`: 邀请码
- `createdBy`: 创建人
- `usedBy`: 使用人
- `status`: 状态 (unused/used/expired)
- `expiresAt`: 过期时间

---

## 关联数据集合

### 27. `task_comments` - 任务评论
**用途**: 存储任务评论和讨论  
**关联模块**: 任务管理 (tasks)  
**主要字段**:
- `_id`: 评论ID
- `taskId`: 任务ID
- `userId`: 评论人ID
- `content`: 评论内容
- `createdAt`: 评论时间

---

### 28. `issue_replies` - 问题回复
**用途**: 存储问题的回复和讨论  
**关联模块**: 问题管理 (issues)  
**主要字段**:
- `_id`: 回复ID
- `issueId`: 问题ID
- `userId`: 回复人ID
- `content`: 回复内容
- `createdAt`: 回复时间

---

### 29. `issueComments` - 问题评论 (旧版)
**用途**: 问题评论 (建议合并到 issue_replies)  
**关联模块**: 问题管理 (issues)  
**状态**: 可能与 issue_replies 重复  
**建议**: 数据迁移后删除

---

### 30. `meeting_minutes` - 会议纪要
**用途**: 存储会议纪要内容  
**关联模块**: 例会管理 (meetings)  
**主要字段**:
- `_id`: 纪要ID
- `meetingId`: 会议ID
- `content`: 纪要内容
- `summary`: 会议总结
- `decisions`: 决策事项数组
- `actionItems`: 行动事项数组
- `createdBy`: 记录人
- `createdAt`: 创建时间

---

### 31. `quarterly_measures` - 季度经营措施
**用途**: 存储季度经营措施数据  
**关联模块**: 目标管理 > 年度策略 (goal.strategy)  
**主要字段**:
- `_id`: 措施ID
- `strategyId`: 关联策略ID
- `year`: 年度
- `quarter`: 季度
- `measureName`: 措施名称
- `description`: 措施描述
- `owner`: 负责人
- `status`: 执行状态
- `progress`: 完成进度

---

### 32. `safeguardMeasures` - 保障措施
**用途**: 存储保障措施数据  
**关联模块**: 目标管理 > 年度策略 (goal.strategy)  
**主要字段**:
- `_id`: 措施ID
- `strategyId`: 关联策略ID
- `measureName`: 措施名称
- `category`: 措施类别
- `description`: 措施描述
- `owner`: 负责人
- `status`: 执行状态

---

### 33. `payroll_accounts` - 工资科目
**用途**: 存储工资科目定义  
**关联模块**: 预算管理 > 薪酬预算 (budget.hr)  
**主要字段**:
- `_id`: 科目ID
- `code`: 科目编码
- `name`: 科目名称
- `category`: 科目类别 (基本工资/绩效工资/津贴/福利)
- `order`: 显示顺序

---

### 34. `handover_history` - 交接历史
**用途**: 存储业务交接记录  
**关联模块**: 系统管理 (通用)  
**主要字段**:
- `_id`: 交接记录ID
- `fromUser`: 交接人
- `toUser`: 接收人
- `module`: 交接模块
- `items`: 交接内容数组
- `status`: 交接状态 (pending/completed)
- `handoverDate`: 交接日期

---

## 系统配置集合

### 35. `moduleOrder` - 模块排序 (旧版)
**用途**: 存储模块排序配置  
**关联模块**: 系统设置 > 功能模块  
**状态**: 可能与 modulesConfig 重复  
**建议**: 数据迁移后删除

---

### 36. `pending_users` - 待审核用户 (旧版)
**用途**: 待审核用户数据  
**关联模块**: 系统设置 > 用户审核  
**状态**: 可能与 users 表 (status=pending) 重复  
**建议**: 通过 users 表的 status 字段查询即可

---

## 📊 集合统计

| 分类 | 集合数量 | 说明 |
|-----|---------|------|
| **核心业务** | 5 | tasks, issues, opportunities, projects, meetings |
| **目标管理** | 6 + N | sales_goals, product_order_forecast, annual_strategies, outcome_goals, decompositionTables, goals + 年度分解表 |
| **预算管理** | 4 | annual_budgets, budget_execution, asset_budgets, hrExpenses |
| **系统管理** | 7 | users, departments, role_permissions, type_settings, operation_logs, modulesConfig, audit_logs |
| **认证相关** | 3 | wechat_sessions, sms_codes, invitation_codes |
| **关联数据** | 9 | task_comments, issue_replies, issueComments, meeting_minutes, quarterly_measures, safeguardMeasures, payroll_accounts, budget_accounts, handover_history |
| **系统配置** | 2 | moduleOrder, pending_users |
| **总计** | **36+** | (不含年度分解表) |

---

## 🔍 集合命名规范

### 命名风格
1. **小写单词 + 下划线**: `annual_budgets`, `budget_execution`, `role_permissions`
2. **驼峰命名法**: `tasks`, `meetings`, `opportunities`
3. **复数形式**: 大部分集合使用复数 (如 users, tasks)

### 建议统一命名
为了保持一致性,建议:
- ✅ **统一使用下划线命名**: `annual_budgets` (推荐)
- ❌ **避免驼峰命名**: `annualBudgets`

---

## 🗑️ 可能废弃的集合

以下集合可能不再使用或已被替代:

| 集合名 | 状态 | 建议 |
|-------|------|------|
| `issueComments` | 可能重复 | 数据迁移到 `issue_replies` 后删除 |
| `moduleOrder` | 可能重复 | 数据迁移到 `modulesConfig` 后删除 |
| `pending_users` | 可能重复 | 通过 `users.status='pending'` 查询即可 |
| `opportunity_goals` | 已合并 | 数据已迁移到 `sales_goals` |
| `goals` | 可能历史数据 | 确认用途后决定是否保留 |

**建议**: 在清理前,先确认这些集合是否还有历史数据需要保留。

---

## 📝 维护建议

### 定期检查
1. **清理废弃集合**: 每季度检查一次,删除确认不再使用的集合
2. **数据迁移**: 对于重复的集合,制定数据迁移计划
3. **命名统一**: 逐步统一集合命名风格

### 文档更新
1. 新增集合时,必须更新本文档
2. 修改集合结构时,必须记录变更
3. 废弃集合时,必须标记状态

---

## 📞 联系方式

如有疑问或需要补充,请联系:
- **开发团队**: 际华协同办公平台开发组
- **更新时间**: 2026-01-09
- **文档版本**: v1.0
