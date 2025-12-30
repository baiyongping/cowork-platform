# 混合 UI 框架使用指南

## 📦 技术栈

```yaml
基础组件: Radix UI (Headless Components)
复杂组件: TDesign React
样式方案: Tailwind CSS v4.0
图标库: Lucide React + TDesign Icons
```

---

## 🎯 组件选型原则

### ✅ 优先使用 Radix UI 的场景

**适用组件**：
- `Dialog` - 对话框
- `Popover` - 弹出框
- `Tooltip` - 提示
- `Select` - 简单选择器
- `Switch` - 开关
- `Checkbox` - 复选框
- `RadioGroup` - 单选
- `Slider` - 滑块
- `Tabs` - 标签页
- `Accordion` - 折叠面板

**使用理由**：
- ✅ 极致轻量（单组件 ~5KB）
- ✅ 无障碍性 AAA 级别
- ✅ 完全定制自由度
- ✅ 与 Tailwind 完美结合

**示例代码**：
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>打开对话框</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标题</DialogTitle>
        </DialogHeader>
        <p>内容</p>
      </DialogContent>
    </Dialog>
  );
}
```

---

### ✅ 优先使用 TDesign 的场景

**适用组件**：
- `Table` - 复杂表格（虚拟滚动、树形、可编辑）
- `Form` - 表单验证
- `DateRangePicker` - 日期范围选择器
- `Upload` - 文件上传
- `Transfer` - 穿梭框
- `Cascader` - 级联选择器
- `TimePicker` - 时间选择器
- `Tree` - 树形控件
- `Steps` - 步骤条
- `Breadcrumb` - 面包屑

**使用理由**：
- ✅ 开箱即用，开发速度快
- ✅ 复杂场景经过验证
- ✅ 企业级设计规范
- ✅ 完整的主题系统

**示例代码**：
```tsx
import { Table, DateRangePicker, Upload } from 'tdesign-react';

function MyTable() {
  const columns = [
    { colKey: 'name', title: '姓名' },
    { colKey: 'age', title: '年龄' },
  ];
  
  const data = [
    { name: '张三', age: 28 },
    { name: '李四', age: 32 },
  ];
  
  return (
    <Table
      data={data}
      columns={columns}
      pagination={{ total: data.length }}
    />
  );
}
```

---

## 🔧 配置步骤

### 1. 安装依赖

```bash
npm install tdesign-react tdesign-icons-react
```

### 2. 引入样式（main.tsx）

```tsx
import 'tdesign-react/es/style/index.css';  // TDesign 基础样式
import './styles/tdesign-custom.css';       // 自定义覆盖样式
```

### 3. 配置全局 Provider（main.tsx）

```tsx
import { TDesignProvider } from './lib/tdesign-config';

<TDesignProvider>
  <App />
</TDesignProvider>
```

### 4. 自定义主题（lib/tdesign-config.tsx）

```tsx
export const tdesignTheme = {
  brandColor: '#2563eb',    // 主色（Tailwind blue-600）
  warningColor: '#eab308',  // 警告色（Tailwind yellow-500）
  errorColor: '#dc2626',    // 错误色（Tailwind red-600）
  successColor: '#16a34a',  // 成功色（Tailwind green-600）
};
```

---

## 🎨 样式统一策略

### 1. 颜色规范

| 用途 | Tailwind 类名 | TDesign 主题 | Hex 值 |
|------|--------------|--------------|---------|
| 主色 | `bg-blue-600` | `brandColor` | `#2563eb` |
| 成功 | `bg-green-600` | `successColor` | `#16a34a` |
| 警告 | `bg-yellow-500` | `warningColor` | `#eab308` |
| 错误 | `bg-red-600` | `errorColor` | `#dc2626` |

### 2. 圆角规范

- 统一使用 `rounded-lg` (0.5rem)
- TDesign 组件通过 CSS 覆盖

### 3. 阴影规范

- 统一使用 `shadow-sm`
- TDesign 组件通过 CSS 覆盖

---

## 📝 实战示例

### 示例 1: 对话框 + 表单（混合使用）

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, Input, DateRangePicker } from 'tdesign-react';

function EditUserDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>编辑用户</Button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户信息</DialogTitle>
        </DialogHeader>
        
        {/* TDesign Form（复杂表单验证） */}
        <Form>
          <Form.FormItem label="姓名" name="name">
            <Input placeholder="请输入姓名" />
          </Form.FormItem>
          
          <Form.FormItem label="入职日期" name="joinDate">
            <DateRangePicker />
          </Form.FormItem>
        </Form>
        
        <DialogFooter>
          <Button variant="outline">取消</Button>
          <Button>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 示例 2: 表格 + 筛选器（混合使用）

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, DateRangePicker } from 'tdesign-react';

function UserList() {
  return (
    <div>
      {/* 筛选栏（Radix UI Select） */}
      <div className="flex gap-4 mb-4">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">在职</SelectItem>
            <SelectItem value="inactive">离职</SelectItem>
          </SelectContent>
        </Select>
        
        {/* TDesign DateRangePicker */}
        <DateRangePicker />
      </div>
      
      {/* TDesign Table（复杂表格） */}
      <Table
        data={data}
        columns={columns}
        pagination={true}
      />
    </div>
  );
}
```

---

## ⚠️ 注意事项

### 1. 避免样式冲突

```tsx
// ❌ 错误：TDesign 组件使用 Tailwind 类名可能无效
<Table className="bg-blue-600" />

// ✅ 正确：使用 TDesign 的主题配置
<Table theme="primary" />
```

### 2. 按需加载

```tsx
// ✅ 推荐：按需引入（减少包体积）
import { Table } from 'tdesign-react';
import { Dialog } from '@/components/ui/dialog';

// ❌ 避免：全量引入
import * as TDesign from 'tdesign-react';
```

### 3. 事件处理统一

```tsx
// Radix UI 使用 onOpenChange
<Dialog onOpenChange={setOpen} />

// TDesign 使用 onChange
<Select onChange={setValue} />
```

---

## 📊 性能优化

### 包体积对比

```bash
Radix UI (按需加载):    ~50KB
TDesign (按需加载):     ~150KB
Total:                  ~200KB

纯 TDesign:             ~300KB+
纯 Ant Design:          ~400KB+
```

### 优化建议

1. **代码分割**：使用 `React.lazy()` 懒加载 TDesign 组件
2. **按需引入**：只引入需要的组件
3. **缓存策略**：配置 Vite 构建缓存

---

## 🔗 参考资源

- [TDesign React 官方文档](https://tdesign.tencent.com/react/overview)
- [Radix UI 官方文档](https://www.radix-ui.com/)
- [Tailwind CSS 官方文档](https://tailwindcss.com/)
- [混合组件示例代码](./components/examples/HybridComponentExample.tsx)

---

## 📞 技术支持

如有问题，请参考：
- 项目文档：`docs/HYBRID_UI_GUIDE.md`
- 示例代码：`components/examples/HybridComponentExample.tsx`
- 配置文件：`lib/tdesign-config.tsx`
