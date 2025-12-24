# TabBar图标说明

## 📋 当前状态

目前所有TabBar图标都是**空的占位符文件**，小程序可以正常运行，但图标不会显示。

## 🎨 替换为真实图标的步骤

### 方法1：手动下载替换（推荐）

1. **准备图标**
   - 尺寸：建议 81px × 81px（3倍图）
   - 格式：PNG格式（必须）
   - 颜色：默认状态使用灰色，选中状态使用彩色

2. **图标来源**
   - **iconfont**：https://www.iconfont.cn/
   - **IconPark**：https://iconpark.oceanengine.com/
   - **Material Icons**：https://fonts.google.com/icons

3. **下载图标并重命名**
   ```
   主页图标 → tab-home.png (未选中) 和 tab-home-active.png (选中)
   任务图标 → tab-task.png (未选中) 和 tab-task-active.png (选中)
   商机图标 → tab-opportunity.png (未选中) 和 tab-opportunity-active.png (选中)
   我的图标 → tab-profile.png (未选中) 和 tab-profile-active.png (选中)
   ```

4. **替换文件**
   - 将下载的图标文件复制到 `e:\cowork\miniprogram\images\` 目录
   - 覆盖现有的占位符文件

---

### 方法2：使用在线工具生成

#### 使用 IconPark 生成（推荐）

1. 访问：https://iconpark.oceanengine.com/
2. 搜索需要的图标（如 "home"、"task"、"briefcase"、"user"）
3. 设置参数：
   - 大小：81px
   - 格式：PNG
   - 颜色：默认灰色 #999999，选中彩色 #07C160（微信绿）
4. 下载并重命名为对应文件名

---

### 方法3：使用 Figma 设计图标

如果您有设计师，可以使用Figma设计专属图标：

1. 创建 81px × 81px 的画板
2. 设计4种图标（home、task、opportunity、profile）
3. 导出为PNG格式
4. 分别导出未选中和选中两种状态

---

## 📦 推荐的图标资源

### iconfont（阿里巴巴矢量图标库）
```
1. 搜索"home" → 下载 → 重命名为 tab-home.png
2. 搜索"task" 或 "check" → tab-task.png
3. 搜索"briefcase" 或 "business" → tab-opportunity.png
4. 搜索"user" 或 "profile" → tab-profile.png
```

**颜色建议**：
- 未选中：#999999（灰色）
- 选中：#07C160（微信官方绿色）或 #1989FA（蓝色）

---

## ✅ 完成后验证

替换图标后，在微信开发者工具中：
1. 点击"编译"按钮
2. 查看底部TabBar是否正常显示图标
3. 切换不同Tab，验证选中/未选中状态

---

## 🎯 临时解决方案

如果暂时不想替换图标，可以使用**纯色色块**代替：

```json
// 修改 app.json 中的 tabBar 配置
"tabBar": {
  "color": "#999999",
  "selectedColor": "#07C160",
  "backgroundColor": "#ffffff",
  "borderStyle": "white",
  "list": [
    {
      "pagePath": "pages/index/index",
      "text": "主页"
      // 暂时移除 iconPath 和 selectedIconPath
    },
    // ... 其他配置
  ]
}
```

但这样会失去图标，只显示文字。
