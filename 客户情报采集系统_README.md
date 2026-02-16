# 客户情报采集系统 v1.0

## 🎯 功能简介

客户情报采集系统是际华协同办公平台的创新功能，专门解决**如何从互联网采集所需信息形成有价值报告**的难题。

### 主要特点

✅ **智能采集** - 支持6种情报类型，一键采集客户信息  
✅ **可靠评分** - 每条情报都有可靠度评分（0-100分）  
✅ **自动整理** - 按类型自动分组，生成专业报告  
✅ **多格式导出** - 支持Markdown和HTML格式  
✅ **无缝集成** - 直接集成到商机管理流程中  

## 📦 快速开始

### 1. 部署系统

```bash
# 一键部署（推荐）
./deploy-intelligence-system.sh

# 或手动部署
# 步骤1：初始化数据库
node database/init-intelligence-collections.js

# 步骤2：部署云函数
node deploy-function-direct.js intelligence-collector

# 步骤3：构建前端
npm run build
```

### 2. 使用功能

1. **进入商机管理** → 打开任意商机详情
2. **切换到"客户情报"标签** → 查看情报采集界面
3. **选择情报类型** → 勾选需要的类型（公司背景、经营状况等）
4. **开始采集** → 点击"开始采集"按钮
5. **保存情报** → 查看结果并保存
6. **生成报告** → 点击"生成Markdown报告"按钮

## 📋 支持的情报类型

| 类型 | 说明 | 示例用途 |
|------|------|----------|
| 🏢 公司背景 | 企业基本信息、发展历程 | 初步了解客户 |
| 💼 经营状况 | 营收、利润、市场表现 | 评估客户实力 |
| 📈 行业动态 | 行业趋势、政策变化 | 把握市场机会 |
| 🏆 竞争对手 | 竞品分析、竞争格局 | 制定竞争策略 |
| 👤 关键人物 | 高管信息、决策人背景 | 建立人际关系 |
| ⚠️ 风险预警 | 经营风险、信用风险 | 风险控制 |

## 🗂️ 文件结构

```
cowork-platform/
├── types/
│   └── customer-intelligence.ts          # 情报类型定义
├── components/
│   ├── IntelligenceCollector.tsx        # 情报采集器组件
│   ├── CustomerIntelligenceDetail.tsx   # 情报详情展示
│   ├── IntelligenceReportGenerator.tsx  # 报告生成器
│   └── OpportunityDetailModal.tsx       # 集成到商机详情
├── cloudfunctions/
│   └── intelligence-collector/          # 情报采集云函数
│       ├── index.js                     # 云函数主文件
│       └── package.json                 # 依赖配置
├── database/
│   └── init-intelligence-collections.js # 数据库初始化
├── deploy-intelligence-system.sh        # 快速部署脚本
└── 客户情报采集系统_使用指南.md         # 完整使用文档
```

## 💾 数据库集合

系统使用以下CloudBase数据库集合：

### customer_intelligence
存储采集的情报数据

主要字段：
- `customerName`: 客户名称
- `opportunityId`: 关联商机ID
- `type`: 情报类型
- `source`: 情报来源
- `title`: 情报标题
- `content`: 情报内容
- `reliability`: 可靠度评分
- `status`: 状态

### intelligence_reports
存储生成的报告数据

主要字段：
- `customerName`: 客户名称
- `title`: 报告标题
- `summary`: 报告摘要
- `intelligenceIds`: 包含的情报ID列表
- `sections`: 报告章节数据

## 🔧 配置说明

### 环境变量

```bash
# CloudBase 环境ID
TCB_ENV_ID=your-env-id
```

### 数据库权限

在CloudBase控制台配置以下权限：

```json
{
  "read": "auth != null",
  "write": "auth != null"
}
```

适用集合：
- customer_intelligence
- intelligence_reports

## 📊 使用流程图

```
开始
  ↓
进入商机详情
  ↓
切换到"客户情报"标签
  ↓
选择情报类型 + 自定义关键词（可选）
  ↓
点击"开始采集"
  ↓
查看采集结果
  ↓
保存情报（单条/批量）
  ↓
生成报告（Markdown/HTML）
  ↓
下载报告文件
  ↓
结束
```

## 🎓 示例场景

### 场景1：了解新客户
```
需求：销售团队接触到新客户"某某科技公司"
操作：
1. 创建商机，客户名称：某某科技公司
2. 打开商机详情 → 客户情报标签
3. 选择：公司背景 + 经营状况 + 关键人物
4. 开始采集 → 保存结果 → 生成报告
结果：获得完整的客户背景报告
```

### 场景2：跟踪行业动态
```
需求：了解客户所在行业的最新趋势
操作：
1. 打开相关商机详情
2. 选择：行业动态 + 竞争对手
3. 自定义关键词：最新动态、行业趋势
4. 定期采集更新（每月/每季度）
结果：持续跟踪行业变化
```

### 场景3：风险评估
```
需求：大额订单前评估客户风险
操作：
1. 选择：风险预警 + 经营状况
2. 自定义关键词：诉讼、风险、违约
3. 查看可靠度高的情报
4. 根据内容做出判断
结果：及时发现潜在风险
```

## ⚙️ 技术栈

- **前端**: React + TypeScript + Tailwind CSS
- **后端**: CloudBase 云函数
- **数据库**: CloudBase 数据库
- **导出**: Markdown + HTML

## 🔄 版本历史

### v1.0.0 (2026-02-16)
- ✨ 首次发布
- ✅ 支持6种情报类型采集
- ✅ 实现Markdown和HTML报告导出
- ✅ 集成到商机管理系统
- ✅ 完整的使用文档和部署脚本

## 📝 注意事项

1. **模拟数据**：当前版本使用模拟数据演示功能。实际使用需要接入真实的搜索API（如企查查、天眼查等）。

2. **数据安全**：情报数据涉及商业机密，请确保：
   - 配置正确的数据库权限
   - 定期备份数据
   - 遵守数据保护法规

3. **API集成**：接入真实API时，需要：
   - 申请API密钥
   - 修改云函数中的搜索逻辑
   - 处理API限流和错误

4. **性能优化**：大量采集时注意：
   - 控制并发请求数量
   - 实现请求队列
   - 添加缓存机制

## 🚀 未来计划

- [ ] 接入真实的企业信息查询API
- [ ] 支持PDF格式报告导出
- [ ] AI智能分析和总结
- [ ] 情报预警推送
- [ ] 移动端优化
- [ ] 知识图谱构建

## 📚 文档

- [完整使用指南](./客户情报采集系统_使用指南.md)
- [API文档](./docs/api/intelligence-api.md)（待补充）
- [部署文档](./docs/deployment/intelligence-deployment.md)（待补充）

## 🤝 贡献

欢迎提交问题和建议：

- 提交 Issue：[GitHub Issues](https://github.com/baiyongping/cowork-platform/issues)
- 提交 PR：[GitHub Pull Requests](https://github.com/baiyongping/cowork-platform/pulls)

## 📄 许可证

本项目遵循项目主仓库的许可证。

---

**际华协同办公平台开发团队**  
_让数据驱动决策，让情报创造价值_
