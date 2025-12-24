# 测试微信小程序 - 云环境验证

## 项目说明

这是一个用于测试云开发环境配置的最小化微信小程序。

**目标云环境**：`jihua-oa-dev-3goht9irae4d949f`

## 导入步骤

### 1. 打开微信开发者工具

### 2. 导入项目
- 点击"导入项目"
- 项目目录：`e:\cowork\test-wx`
- AppID：`wx79afc92f6fe01a31`
- 项目名称：`test-wx-jihua`

### 3. 验证云环境

导入后，按以下步骤验证：

#### 检查配置文件
- 打开 `project.config.json`
- 确认 `cloudenv` 字段值为：`jihua-oa-dev-3goht9irae4d949f`

#### 检查云开发控制台
1. 点击工具栏的"云开发"按钮
2. 查看左上角环境名称
3. 应该显示：**jihua-oa-dev**（或完整ID）

#### 查看控制台日志
1. 点击"编译"按钮
2. 查看 Console 控制台
3. 应该看到：
   ```
   === 小程序启动 ===
   ✅ 云开发环境已初始化
   环境ID: jihua-oa-dev-3goht9irae4d949f
   === 开始验证云环境 ===
   ```

### 4. 测试云功能

在模拟器中：
1. 点击"测试云函数"按钮
2. 点击"测试数据库"按钮
3. 查看返回结果

## 关键配置

### project.config.json
```json
{
  "cloudenv": "jihua-oa-dev-3goht9irae4d949f",
  "cloudfunctionRoot": "cloudfunctions/",
  "cloudbaseRoot": "cloudfunctions/"
}
```

### app.js
```javascript
wx.cloud.init({
  env: 'jihua-oa-dev-3goht9irae4d949f',
  traceUser: true
});
```

## 常见问题

### Q: 导入后显示的是旧环境？
**A**: 完全重启微信开发者工具，然后重新打开项目。

### Q: 云函数调用失败？
**A**: 
1. 右键点击 `cloudfunctions/login` 目录
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

### Q: 数据库查询失败？
**A**: 正常现象，因为测试环境可能没有 `tasks` 集合，不影响环境配置验证。

## 成功标志

如果看到以下内容，说明环境配置成功：

1. ✅ 云开发控制台显示环境：`jihua-oa-dev-3goht9irae4d949f`
2. ✅ Console 日志显示：`✅ 云开发环境已初始化`
3. ✅ 云函数调用成功（返回 openid 等信息）
