# 任务可见性选项UI优化说明

## 📝 需求背景

用户反馈在任务编辑状态下，"是否公开"选项不够清晰明确。原本使用复选框形式，容易让用户混淆。

## ✅ 优化内容

### 1. UI形式改进

**优化前：**
- 使用复选框（checkbox）
- 标签："公开任务"
- 说明文字根据选中状态动态变化

**优化后：**
- 使用单选按钮（radio button）
- 明确两个选项：
  - **团队可见** - 所有团队成员都可以查看此任务
  - **不公开** - 仅任务负责人、协同人、部门负责人和管理员可见

### 2. 视觉设计

**团队可见（公开）：**
- 边框：蓝色（`border-blue-500`）
- 背景：淡蓝色（`bg-blue-50`）
- 悬停效果：蓝色边框和背景
- 单选按钮颜色：蓝色

**不公开（私密）：**
- 边框：橙色（`border-orange-500`）
- 背景：淡橙色（`bg-orange-50`）
- 悬停效果：橙色边框和背景
- 单选按钮颜色：橙色

### 3. 交互优化

- 卡片式布局，点击整个卡片即可选择
- 选中状态有明显的视觉反馈（边框加粗、背景高亮）
- 悬停时显示轻微的颜色变化
- 说明文字始终可见，无需根据状态切换

## 📁 修改文件

1. **components/CreateTaskModal.tsx**
   - 将复选框改为单选按钮组
   - 新增卡片式布局
   - 优化视觉样式

2. **components/EditTaskModal.tsx**
   - 将复选框改为单选按钮组
   - 新增卡片式布局
   - 优化视觉样式

## 🎨 UI代码示例

```tsx
{/* 可见性设置 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">
    可见性设置
  </label>
  <div className="space-y-3">
    {/* 团队可见 */}
    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
      <input
        type="radio"
        name="visibility"
        value="public"
        checked={formData.isPublic === true}
        onChange={() => setFormData({ ...formData, isPublic: true })}
        className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">团队可见</div>
        <div className="text-xs text-gray-500 mt-1">
          所有团队成员都可以查看此任务
        </div>
      </div>
    </label>

    {/* 不公开 */}
    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:bg-orange-50 hover:border-orange-300 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
      <input
        type="radio"
        name="visibility"
        value="private"
        checked={formData.isPublic === false}
        onChange={() => setFormData({ ...formData, isPublic: false })}
        className="mt-0.5 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">不公开</div>
        <div className="text-xs text-gray-500 mt-1">
          仅任务负责人、协同人、部门负责人和管理员可见
        </div>
      </div>
    </label>
  </div>
</div>
```

## 🔍 权限说明

### 团队可见（isPublic: true）
所有团队成员都能看到该任务，无论角色和权限。

### 不公开（isPublic: false）
仅以下人员可见：
1. ✅ 任务负责人
2. ✅ 任务协同人
3. ✅ 部门负责人（同部门）
4. ✅ 管理员角色

## ✨ 优化亮点

1. **更清晰的选项** - 用"团队可见"和"不公开"替代"公开任务"复选框
2. **更好的视觉反馈** - 卡片式设计，选中状态一目了然
3. **更友好的交互** - 点击整个卡片即可选择，提升用户体验
4. **一致的设计语言** - 创建和编辑任务保持相同的UI风格
5. **颜色语义化** - 蓝色代表公开/开放，橙色代表限制/私密

## 📸 视觉效果

**团队可见（选中状态）：**
```
┌─────────────────────────────────────────┐
│ ◉ 团队可见                              │ ← 蓝色边框+背景
│   所有团队成员都可以查看此任务         │
└─────────────────────────────────────────┘
```

**不公开（选中状态）：**
```
┌─────────────────────────────────────────┐
│ ◉ 不公开                                │ ← 橙色边框+背景
│   仅任务负责人、协同人、部门负责人和   │
│   管理员可见                            │
└─────────────────────────────────────────┘
```

## 🚀 测试建议

1. 创建新任务时，测试两种可见性选项的选择
2. 编辑已有任务时，测试切换可见性设置
3. 验证默认值（应为"团队可见"）
4. 确认视觉反馈正常（边框、背景、悬停效果）
5. 验证权限控制是否符合预期

---

**优化完成时间：** 2025-12-11
**版本：** v1.2.0
