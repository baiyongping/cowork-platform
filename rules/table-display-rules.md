---
description: 数字表格显示规则 - 统一项目中所有数字表格的UI和显示风格
globs: "**/*.tsx"
alwaysApply: true
inclusion: always
---

# 数字表格显示规则

## 概述

本规则定义了项目中所有数字表格的统一UI和显示风格标准,适用于预算管理、商机管理、项目管理、目标管理等所有涉及数字表格的页面。

## 1. 字体规范

### 1.1 等宽字体配置

**必须使用等宽字体**: 所有数字单元格必须使用等宽字体 (`font-mono`)

**tailwind.config.js 配置**:
```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        mono: ['Monaco', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
}
```

### 1.2 字体大小

- **普通数字单元格**: 15px (`text-[15px]`)
- **合计/小计行**: 16px (`text-base`) + 加粗 (`font-bold`)
- **标题行**: 14-16px (根据层级)
- **表头**: 14px (`text-sm`) + 加粗 (`font-semibold`)

### 1.3 使用示例

```tsx
{/* 普通数字单元格 */}
<td className="px-4 py-2 text-right font-mono text-[15px]">
  {formatNumber(value)}
</td>

{/* 合计行 */}
<td className="px-4 py-3 text-right font-mono text-base font-bold bg-blue-50">
  {formatNumber(totalValue)}
</td>
```

## 2. 对齐规范

### 2.1 对齐规则

- **数字列**: 右对齐 (`text-right`)
- **文本列**: 左对齐 (`text-left`)
- **操作列**: 居中对齐 (`text-center`)
- **状态标签**: 居中对齐 (`text-center`)

### 2.2 使用示例

```tsx
{/* 数字列 - 右对齐 */}
<td className="text-right font-mono text-[15px]">1,234.5</td>

{/* 文本列 - 左对齐 */}
<td className="text-left">营销费用</td>

{/* 操作列 - 居中 */}
<td className="text-center">
  <button>编辑</button>
</td>
```

## 3. 数字格式规范

### 3.1 格式化规则

| 数据类型 | 格式 | 示例 | 说明 |
|---------|------|------|------|
| 整数(数量) | 千分位 | 1,234,567 | 无小数位 |
| 金额(万元) | 千分位+1位小数 | 1,234.5 | 一位小数 |
| 比率(百分比) | 1位小数+% | 85.5% | 百分号 |
| 小数 | 1-2位小数 | 1.23 | 根据业务需求 |
| 负数 | 红色+括号 | (1,234.5) | 红色文字 |

### 3.2 工具函数

```typescript
/**
 * 格式化数字 - 千分位显示
 * @param num 数字
 * @returns 格式化后的字符串
 */
const formatNumber = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num).toLocaleString('zh-CN');
};

/**
 * 格式化金额 - 万元,一位小数
 * @param num 数字
 * @returns 格式化后的字符串
 */
const formatAmount = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num).toLocaleString('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};

/**
 * 格式化百分比 - 一位小数
 * @param num 数字
 * @returns 格式化后的字符串
 */
const formatPercent = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num).toFixed(1) + '%';
};

/**
 * 格式化负数 - 红色显示
 * @param num 数字
 * @returns 包含样式的 JSX
 */
const formatNegative = (num: number) => {
  const isNegative = num < 0;
  const formatted = formatAmount(Math.abs(num));
  return (
    <span className={isNegative ? 'text-red-600' : ''}>
      {isNegative ? `(${formatted})` : formatted}
    </span>
  );
};
```

## 4. 颜色规范

### 4.1 颜色定义

| 用途 | 颜色类 | 说明 |
|-----|-------|------|
| 普通数字 | `text-gray-900` | 深灰色 |
| 合计行 | `text-gray-900 font-bold` | 深灰色+加粗 |
| 负数/异常 | `text-red-600` | 红色 |
| 达标/正常 | `text-green-600` | 绿色 |
| 警告 | `text-orange-600` | 橙色 |
| 未填写 | `text-gray-400` | 浅灰色 |

### 4.2 使用示例

```tsx
{/* 根据完成率设置颜色 */}
<td className={`text-right font-mono text-[15px] ${
  rate >= 100 ? 'text-green-600' :
  rate >= 80 ? 'text-gray-900' :
  rate >= 60 ? 'text-orange-600' :
  'text-red-600'
}`}>
  {formatPercent(rate)}
</td>
```

## 5. 表格布局规范

### 5.1 尺寸规范

| 属性 | 值 | 说明 |
|-----|---|------|
| 普通行高 | 40-44px | `py-2` (8px) × 2 + 内容 |
| 合计行高 | 48px | `py-3` (12px) × 2 + 内容 |
| 水平内边距 | 12-16px | `px-3` 或 `px-4` |
| 垂直内边距 | 8-12px | `py-2` 或 `py-3` |
| 最小列宽 | 根据内容 | 数字列 80-120px |

### 5.2 边框和背景

```tsx
{/* 表格容器 */}
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    {/* 表头 */}
    <thead className="bg-gray-100">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
          科目名称
        </th>
      </tr>
    </thead>
    
    {/* 表体 - 斑马纹 */}
    <tbody className="bg-white divide-y divide-gray-200">
      <tr className="hover:bg-blue-50/50 even:bg-gray-50">
        <td className="px-4 py-2">内容</td>
      </tr>
    </tbody>
  </table>
</div>
```

## 6. 合计行样式

### 6.1 样式定义

```tsx
{/* 合计行 */}
<tr className="bg-blue-50 border-t-2 border-b-2 border-blue-300">
  <td className="px-4 py-3 text-left font-bold">
    合计
  </td>
  <td className="px-4 py-3 text-right font-mono text-base font-bold">
    {formatAmount(totalAmount)}
  </td>
</tr>
```

### 6.2 特点
- 背景色: `bg-blue-50` (浅蓝色)
- 字体: 16px (`text-base`) + 加粗 (`font-bold`)
- 边框: 上下双边框 (`border-t-2 border-b-2 border-blue-300`)
- 内边距: 垂直加大至 `py-3`

## 7. 可编辑单元格

### 7.1 编辑状态

```tsx
{isEditing ? (
  <input
    type="text"
    value={value}
    onChange={handleChange}
    className="w-full px-2 py-1 text-right font-mono text-[15px] border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
) : (
  <div
    onClick={() => setIsEditing(true)}
    className="cursor-pointer hover:bg-blue-50 rounded px-2 py-1 text-right font-mono text-[15px]"
  >
    {formatNumber(value)}
  </div>
)}
```

### 7.2 特点
- **编辑状态**: 白色背景 + 蓝色边框 + 聚焦环
- **非编辑状态**: 透明背景 + 悬停显示淡蓝背景 + 指针光标

## 8. 响应式处理

### 8.1 基本配置

```tsx
{/* 响应式表格容器 */}
<div className="overflow-x-auto">
  <table className="min-w-[1200px]">
    {/* 表格内容 */}
  </table>
</div>
```

### 8.2 注意事项
- 小屏幕使用横向滚动
- 设置合适的 `min-w-[XXXpx]` 避免列挤压
- 重要列优先显示,次要列可隐藏

## 9. 空值处理

### 9.1 显示规则

| 情况 | 显示 | 样式 |
|-----|------|------|
| 未填写 | "-" | 居中,浅灰色 |
| 零值 | "0" 或 "0.0" | 右对齐,等宽字体 |
| null/undefined | "-" | 居中,浅灰色 |

### 9.2 实现示例

```tsx
<td className="text-center text-gray-400">
  {value === null || value === undefined || value === '' ? '-' : formatNumber(value)}
</td>
```

## 10. 完整示例

### 10.1 基础表格

```tsx
<div className="border border-gray-200 rounded-lg overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    {/* 表头 */}
    <thead className="bg-gray-100">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
          科目名称
        </th>
        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
          预算金额(万元)
        </th>
        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
          实际金额(万元)
        </th>
        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
          完成率
        </th>
      </tr>
    </thead>

    {/* 表体 */}
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((item, index) => (
        <tr key={index} className="hover:bg-blue-50/50 even:bg-gray-50">
          <td className="px-4 py-2 text-left">
            {item.name}
          </td>
          <td className="px-4 py-2 text-right font-mono text-[15px]">
            {formatAmount(item.budget)}
          </td>
          <td className="px-4 py-2 text-right font-mono text-[15px]">
            {formatAmount(item.actual)}
          </td>
          <td className={`px-4 py-2 text-right font-mono text-[15px] ${
            item.rate >= 100 ? 'text-green-600' : 'text-gray-900'
          }`}>
            {formatPercent(item.rate)}
          </td>
        </tr>
      ))}

      {/* 合计行 */}
      <tr className="bg-blue-50 border-t-2 border-b-2 border-blue-300">
        <td className="px-4 py-3 text-left font-bold">
          合计
        </td>
        <td className="px-4 py-3 text-right font-mono text-base font-bold">
          {formatAmount(totalBudget)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-base font-bold">
          {formatAmount(totalActual)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-base font-bold">
          {formatPercent(totalRate)}
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

## 11. 检查清单

在实现数字表格时,请确保:

- [ ] 所有数字单元格使用 `font-mono` 等宽字体
- [ ] 普通数字单元格使用 15px (`text-[15px]`)
- [ ] 合计行使用 16px (`text-base`) + 加粗 (`font-bold`)
- [ ] 数字列右对齐 (`text-right`)
- [ ] 使用正确的格式化函数 (formatNumber, formatAmount, formatPercent)
- [ ] 合计行使用浅蓝背景 (`bg-blue-50`)
- [ ] 表格有斑马纹 (`even:bg-gray-50`)
- [ ] 行有悬停效果 (`hover:bg-blue-50/50`)
- [ ] 可编辑单元格有正确的编辑/非编辑样式
- [ ] 空值统一显示为 "-"
- [ ] 负数使用红色显示
- [ ] 响应式处理正确 (overflow-x-auto)

## 12. 注意事项

1. **字体一致性**: 确保 tailwind.config.js 已配置 font-mono
2. **性能优化**: 大数据量表格考虑虚拟滚动
3. **无障碍访问**: 添加适当的 ARIA 标签
4. **打印友好**: 考虑打印时的样式适配
5. **国际化**: 数字格式化支持不同地区

## 13. 相关资源

- Tailwind CSS 文档: https://tailwindcss.com/docs
- React Table: https://react-table.tanstack.com/
- 数字格式化: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString

---

**版本**: v1.0.0  
**更新日期**: 2025-12-26  
**维护者**: 际华协同办公平台开发团队
