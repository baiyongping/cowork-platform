# 商机需求成本和毛利润字段迁移说明

## 修改内容

### 1. 数据模型变更

在 `OpportunityRequirement` 接口中新增两个字段：

```typescript
export interface OpportunityRequirement {
  id: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  estimatedCost: number;     // 新增: 预估成本(元)
  totalPrice: number;
  grossProfit: number;        // 新增: 预估毛利润(元) = totalPrice - (quantity * estimatedCost)
}
```

### 2. 界面变更

#### 商机需求列表
- 在"预算单价"后增加"预估成本"列
- 在"总价"后增加"预估毛利润"列

#### 商机需求表单
- 新增"预估成本"输入框（必填，默认为0）
- 新增"预估毛利润"只读显示框（自动计算）

#### 商机总计
- "商机总金额" 改名为 "商机预期金额"
- 新增 "商机预估毛利润" 显示

### 3. 计算逻辑

**单个需求项:**
- 总价 = 需求数量 × 预算单价
- 预估毛利润 = 总价 - (需求数量 × 预估成本)

**商机汇总:**
- 商机预期金额 = ∑(各需求项总价)
- 商机预估毛利润 = ∑(各需求项预估毛利润)

## 数据迁移

### 执行迁移脚本

```bash
# 在项目根目录执行
node database/migrations/add-opportunity-cost-profit-fields.js
```

### 迁移策略

对于现有商机数据：
- `estimatedCost`: 默认设置为 0
- `grossProfit`: 默认设置为 totalPrice (假设成本为0)

**注意**: 迁移后，需要手动更新各商机需求的实际成本数据。

### 回滚方案

如需回滚，执行以下操作：

1. 恢复类型定义文件 `types/opportunity.ts`
2. 恢复组件文件 `components/OpportunityRequirements.tsx`
3. 可选：从数据库中移除新增字段（不影响现有功能）

## 影响范围

### 受影响的文件

1. **类型定义**
   - `types/opportunity.ts`

2. **组件**
   - `components/OpportunityRequirements.tsx`

3. **依赖组件**（自动适配）
   - `components/CreateOpportunityModal.tsx`
   - `components/EditOpportunityModal.tsx`
   - `components/OpportunityDetailModal.tsx`

### 不受影响的功能

- 商机列表显示（仍显示预计金额）
- 商机筛选和排序
- 商机阶段管理
- 商机跟进记录

## 测试建议

1. **创建新商机**
   - 添加商机需求
   - 填写预估成本
   - 验证毛利润自动计算

2. **编辑现有商机**
   - 修改需求数量/单价
   - 修改预估成本
   - 验证总计自动更新

3. **查看商机详情**
   - 验证新字段正确显示
   - 验证商机预期金额和预估毛利润正确显示

4. **数据一致性**
   - 验证迁移后的旧数据能正常显示
   - 验证新旧数据格式兼容

## 注意事项

1. 预估成本字段为必填，最小值为0
2. 毛利润可能为负值（成本高于单价）
3. 所有金额字段保持元为单位，显示时自动转换为万元
4. 迁移脚本是幂等的，可以多次执行

## 版本信息

- 修改日期: 2025-12-12
- 版本: v1.1.5
- 修改人: AI Assistant
