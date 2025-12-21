# 任务管理模块 v1.2.0 - 快速访问索引

## 🚀 快速链接

### 📖 核心文档
| 文档 | 说明 | 路径 |
|-----|------|------|
| **完整版本文档** | 24项功能详细说明、API文档、开发指南 | [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md) |
| **版本归档指南** | 备份与恢复完整指南 | [VERSION_ARCHIVE_GUIDE.md](./VERSION_ARCHIVE_GUIDE.md) |
| **发布总结** | 版本发布信息、归档清单 | [TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md](./TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md) |

### 📦 功能文档
| 功能 | 文档路径 |
|-----|---------|
| 任务回收站功能说明 | [docs/任务回收站功能说明.md](./docs/任务回收站功能说明.md) |
| 任务回收站功能测试报告 | [docs/任务回收站功能测试报告.md](./docs/任务回收站功能测试报告.md) |
| 任务公开权限功能说明 | [docs/任务公开权限功能说明.md](./docs/任务公开权限功能说明.md) |
| 可见性选项UI优化说明 | [docs/可见性选项UI优化说明.md](./docs/可见性选项UI优化说明.md) |

### 📁 版本备份
| 内容 | 路径 |
|-----|------|
| **v1.2.0备份目录** | `backups/task-module-v1.2.0-20251211-120112/` |
| 备份清单 | `backups/task-module-v1.2.0-20251211-120112/BACKUP_MANIFEST.md` |

---

## 🎯 核心功能速览

### ✨ v1.2.0 三大新功能

#### 1. 任务回收站 🗑️
```
功能：软删除、任务恢复、永久删除
入口：任务管理页面 → 回收站按钮（灰色）
特点：二次确认保护、删除时间记录
```

#### 2. 任务权限控制 🔒
```
公开任务：所有团队成员可见
私密任务：仅负责人、协同人、部门负责人、管理员可见
实现：前端智能权限过滤
```

#### 3. 可见性UI优化 🎨
```
形式：单选按钮卡片式
选项：团队可见（蓝色）、不公开（橙色）
位置：创建/编辑任务表单
```

---

## 📂 代码文件位置

### 核心组件 (components/)
```
TaskManagementPage.tsx      - 任务管理主页面（800行）
CreateTaskModal.tsx          - 创建任务模态框（700行）
EditTaskModal.tsx            - 编辑任务模态框（700行）
TaskDetailModal.tsx          - 任务详情模态框（700行）
TaskRecycleBin.tsx           - 回收站主组件（350行）
TaskRecycleBinDetail.tsx     - 回收站详情组件（350行）
CollaboratorSelector.tsx     - 协同人选择器
OpportunitySelector.tsx      - 商机选择器
ProjectSelector.tsx          - 项目选择器
```

### 类型定义 (types/)
```
task.ts - 任务相关类型定义（200行）
```

### 备份脚本 (scripts/)
```
backup-task-module-v1.2.0.sh     - Linux备份脚本
backup-task-module-v1.2.0.bat    - Windows备份脚本
restore-task-module-v1.2.0.sh    - 恢复脚本
```

---

## 🔄 常用操作

### 备份当前版本
```bash
# Windows
cd e:\cowork
scripts\backup-task-module-v1.2.0.bat

# Linux/Mac
cd /path/to/cowork
bash scripts/backup-task-module-v1.2.0.sh
```

### 恢复到v1.2.0
```bash
# 方法1: 使用恢复脚本（Linux/Mac）
bash scripts/restore-task-module-v1.2.0.sh backups/task-module-v1.2.0-20251211-120112

# 方法2: 手动复制（Windows）
xcopy /Y /E backups\task-module-v1.2.0-20251211-120112\components\* components\
xcopy /Y /E backups\task-module-v1.2.0-20251211-120112\types\* types\
```

### 查看版本信息
```bash
# 查看完整版本文档
cat TASK_MODULE_VERSION_v1.2.0.md

# 查看发布总结
cat TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md

# 查看备份清单
cat backups/task-module-v1.2.0-20251211-120112/BACKUP_MANIFEST.md
```

---

## 🧪 功能测试清单

### 基础功能
- [ ] 创建任务（日常工作、商机跟进、项目任务）
- [ ] 编辑任务
- [ ] 查看任务详情
- [ ] 添加任务评论

### 回收站功能
- [ ] 删除任务（放入回收站）
- [ ] 查看回收站列表
- [ ] 从回收站恢复任务
- [ ] 永久删除任务

### 权限控制
- [ ] 创建公开任务
- [ ] 创建私密任务
- [ ] 验证权限过滤（普通用户）
- [ ] 验证权限过滤（部门负责人）
- [ ] 验证权限过滤（管理员）

### UI交互
- [ ] 可见性选项单选按钮
- [ ] 悬停效果
- [ ] 选中状态反馈

---

## 📊 数据库结构

### Task集合（tasks）
```typescript
{
  _id: string;
  name: string;
  level: '个人级' | '团队级' | '公司级';
  type: '日常工作' | '商机跟进' | '项目任务';
  status: string;
  progress: number;
  owner: string;
  collaborators?: string[];
  startDate: Date;
  endDate: Date;
  description?: string;
  isPublic: boolean;           // v1.2.0新增
  isDeleted?: boolean;         // v1.2.0新增
  deletedAt?: Date;            // v1.2.0新增
  createdAt: Date;
  updatedAt: Date;
}
```

### 索引建议
```javascript
// 推荐创建的索引
db.collection('tasks').createIndex({ owner: 1, level: 1, status: 1 })
db.collection('tasks').createIndex({ isDeleted: 1, updatedAt: -1 })
```

---

## 🎓 开发者提示

### 添加新功能
1. 修改 `types/task.ts` 添加类型定义
2. 在相应组件中实现UI
3. 更新数据库操作逻辑
4. 添加功能文档
5. 执行备份

### 修改权限规则
1. 找到 `TaskManagementPage.tsx` 的 `loadTasks` 函数
2. 修改 `filteredTasks` 的过滤逻辑
3. 更新文档说明

### 调试技巧
```javascript
// 查看当前用户信息
console.log(JSON.parse(localStorage.getItem('current_user')));

// 查看任务权限过滤结果
console.log('可见任务数:', filteredTasks.length);
console.log('总任务数:', tasksWithUsers.length);
```

---

## ⚠️ 注意事项

### 使用前
1. ✅ 确认已登录CloudBase环境
2. ✅ 确认数据库结构兼容
3. ✅ 备份当前数据

### 使用中
1. ⚠️ 删除操作不可撤销（放入回收站除外）
2. ⚠️ 权限变更立即生效
3. ⚠️ 大量任务可能影响性能

### 使用后
1. ✅ 定期清理回收站
2. ✅ 定期备份数据
3. ✅ 监控系统性能

---

## 📞 获取帮助

### 文档索引
| 问题 | 查看文档 |
|-----|---------|
| 完整功能列表 | [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md) |
| 如何备份恢复 | [VERSION_ARCHIVE_GUIDE.md](./VERSION_ARCHIVE_GUIDE.md) |
| 版本发布信息 | [TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md](./TASK_MODULE_RELEASE_v1.2.0_SUMMARY.md) |
| 回收站使用 | [docs/任务回收站功能说明.md](./docs/任务回收站功能说明.md) |
| 权限控制 | [docs/任务公开权限功能说明.md](./docs/任务公开权限功能说明.md) |

### 常见问题
**Q: 如何恢复到v1.2.0？**  
A: 查看 [VERSION_ARCHIVE_GUIDE.md](./VERSION_ARCHIVE_GUIDE.md) 的"版本恢复"章节

**Q: 回收站中的任务会自动删除吗？**  
A: 不会，需要手动执行永久删除

**Q: 私密任务谁可以看到？**  
A: 负责人、协同人、部门负责人（同部门）、管理员

**Q: 如何查看完整的API文档？**  
A: 查看 [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md) 的"API文档"章节

---

## 🎯 下一步

### 建议学习路径
1. 📖 阅读 [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md) 了解完整功能
2. 🧪 按照测试清单逐项测试功能
3. 💾 执行一次完整备份操作
4. 🔄 测试一次完整恢复操作
5. 📝 根据实际使用情况补充文档

### 功能扩展方向
- 任务标签功能
- 任务批量操作
- 任务导出（Excel/PDF）
- 移动端优化
- 任务提醒通知

---

**最后更新**: 2025-12-11  
**版本**: v1.2.0  
**状态**: ✅ 稳定可用
