# 统一提示框系统迁移指南

## 概述

本系统已实现统一的提示框组件，用于替换原生的 `alert()` 和 `confirm()`。

新系统具有以下优势：
- ✅ 美观的UI设计，与系统风格统一
- ✅ 支持多种类型（成功/错误/警告/信息）
- ✅ Promise API，易于使用
- ✅ Toast自动消失提示
- ✅ 支持动画效果

## 快速开始

### 1. 导入工具函数

```typescript
import { showAlert, showConfirm, showToast, showSuccess, showError } from '@/lib/dialog-utils';
```

### 2. 使用方法

#### 替换 `alert()`

**原代码：**
```typescript
alert('操作成功');
alert('操作失败，请重试');
```

**新代码：**
```typescript
await showSuccess('操作成功');
await showError('操作失败，请重试');

// 或使用通用方法
await showAlert('普通消息', 'info');
await showAlert('警告消息', 'warning');
```

#### 替换 `confirm()`

**原代码：**
```typescript
if (confirm('确认删除吗？')) {
  // 执行删除
}
```

**新代码：**
```typescript
const confirmed = await showConfirm('确认删除吗？');
if (confirmed) {
  // 执行删除
}
```

#### 使用 Toast 提示

**适用场景：** 不需要用户确认的简单提示（如"保存成功"、"复制成功"）

```typescript
import { toastSuccess, toastError, toastWarning, toastInfo } from '@/lib/dialog-utils';

toastSuccess('保存成功');
toastError('网络错误');
toastWarning('请注意检查');
toastInfo('系统提示');
```

## 完整 API 文档

### showAlert

显示警告提示框（替代 `alert`）

```typescript
await showAlert(message: string, variant?: 'success' | 'error' | 'warning' | 'info', title?: string)
```

**参数：**
- `message` - 提示消息（必填）
- `variant` - 提示类型（可选，默认 'info'）
- `title` - 标题（可选）

**示例：**
```typescript
await showAlert('操作成功', 'success');
await showAlert('操作失败', 'error', '错误提示');
```

### showConfirm

显示确认对话框（替代 `confirm`）

```typescript
const result = await showConfirm(message: string, title?: string): Promise<boolean>
```

**参数：**
- `message` - 确认消息（必填）
- `title` - 标题（可选，默认无标题）

**返回值：**
- `true` - 用户点击了确认
- `false` - 用户点击了取消

**示例：**
```typescript
const confirmed = await showConfirm('确认删除这条记录吗？');
if (confirmed) {
  // 执行删除操作
}

const result = await showConfirm(
  '此操作不可撤销，确认继续吗？',
  '危险操作确认'
);
```

### showToast

显示自动消失的Toast提示

```typescript
showToast(message: string, variant?: 'success' | 'error' | 'warning' | 'info', duration?: number)
```

**参数：**
- `message` - 提示消息（必填）
- `variant` - 提示类型（可选，默认 'success'）
- `duration` - 显示时长（毫秒，可选，默认3000）

**示例：**
```typescript
showToast('操作成功');
showToast('网络错误', 'error', 5000);
```

### 便捷方法

```typescript
// Alert 便捷方法
await showSuccess(message, title?)  // 成功提示
await showError(message, title?)    // 错误提示
await showWarning(message, title?)  // 警告提示
await showInfo(message, title?)     // 信息提示

// Toast 便捷方法
toastSuccess(message)  // 成功Toast
toastError(message)    // 错误Toast
toastWarning(message)  // 警告Toast
toastInfo(message)     // 信息Toast
```

## 迁移示例

### 示例1：简单提示

**原代码：**
```typescript
try {
  await saveData();
  alert('保存成功');
} catch (error) {
  alert('保存失败：' + error.message);
}
```

**新代码：**
```typescript
import { showSuccess, showError } from '@/lib/dialog-utils';

try {
  await saveData();
  await showSuccess('保存成功');
} catch (error) {
  await showError('保存失败：' + error.message);
}
```

### 示例2：确认操作

**原代码：**
```typescript
const handleDelete = () => {
  if (!confirm('确认删除吗？此操作不可撤销。')) {
    return;
  }
  
  deleteItem();
};
```

**新代码：**
```typescript
import { showConfirm } from '@/lib/dialog-utils';

const handleDelete = async () => {
  const confirmed = await showConfirm('确认删除吗？此操作不可撤销。');
  if (!confirmed) {
    return;
  }
  
  deleteItem();
};
```

### 示例3：复杂交互

**原代码：**
```typescript
const handleSubmit = () => {
  if (!validateForm()) {
    alert('请填写必填项');
    return;
  }
  
  if (!confirm('确认提交吗？')) {
    return;
  }
  
  try {
    submitForm();
    alert('提交成功');
  } catch (error) {
    alert('提交失败：' + error.message);
  }
};
```

**新代码：**
```typescript
import { showWarning, showConfirm, toastSuccess, showError } from '@/lib/dialog-utils';

const handleSubmit = async () => {
  if (!validateForm()) {
    await showWarning('请填写必填项');
    return;
  }
  
  const confirmed = await showConfirm('确认提交吗？');
  if (!confirmed) {
    return;
  }
  
  try {
    await submitForm();
    toastSuccess('提交成功');  // 使用Toast，不阻塞操作
  } catch (error) {
    await showError('提交失败：' + error.message);
  }
};
```

## 需要迁移的文件列表

以下文件包含原生 `alert()` 或 `confirm()` 调用，需要逐步迁移：

1. ✅ TaskManagementPage.tsx
2. ⏳ UserApprovalPage.tsx
3. ⏳ TaskDetailModal.tsx
4. ⏳ ProjectDetailModal.tsx
5. ⏳ OpportunityManagement.tsx
6. ⏳ GoalManagement.tsx
7. ⏳ SystemSettings.tsx
8. ⏳ LoginPage.tsx
9. ... (共38个文件)

## 注意事项

1. **async/await 支持**：
   - `showAlert` 和 `showConfirm` 是异步函数，需要使用 `await`
   - 如果函数不是 async，需要添加 `async` 关键字

2. **Toast vs Alert**：
   - 不需要用户确认的简单提示 → 使用 `Toast`
   - 需要用户确认的重要提示 → 使用 `Alert`
   - 需要用户做选择的操作 → 使用 `Confirm`

3. **错误处理**：
   - 新系统会自动fallback到原生提示框
   - 确保在 `App.tsx` 中正确配置了 `DialogProvider`

4. **样式定制**：
   - 如需修改样式，编辑 `components/ui/GlobalDialog.tsx`
   - 保持与系统整体风格一致

## 测试清单

迁移后请测试：
- [ ] 提示框正常显示
- [ ] 点击确认/取消按钮正常响应
- [ ] Toast自动消失
- [ ] 多个提示框可以同时显示
- [ ] 样式与系统风格一致
- [ ] 在移动端显示正常

## 反馈

如遇到问题或有改进建议，请联系开发团队。
