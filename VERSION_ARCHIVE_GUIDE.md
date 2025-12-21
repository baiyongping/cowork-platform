# 版本归档与恢复指南

## 📦 当前版本

### 任务管理模块 v1.2.0
- **发布日期**: 2025-12-11
- **状态**: 稳定版 (Stable)
- **完整文档**: [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md)

---

## 🚀 快速备份

### Windows系统
```batch
# 进入项目根目录
cd e:\cowork

# 执行备份脚本
scripts\backup-task-module-v1.2.0.bat
```

### Linux/Mac系统
```bash
# 进入项目根目录
cd /path/to/cowork

# 添加执行权限
chmod +x scripts/backup-task-module-v1.2.0.sh

# 执行备份脚本
bash scripts/backup-task-module-v1.2.0.sh
```

**备份结果：**
- 备份位置：`backups/task-module-v1.2.0-{时间戳}/`
- 备份清单：`backups/task-module-v1.2.0-{时间戳}/BACKUP_MANIFEST.md`

---

## 🔄 版本恢复

### 场景1: 从备份恢复

**Windows:**
```batch
# 查看备份列表
dir /B backups

# 恢复指定版本（将脚本内容修改为恢复逻辑）
# 或手动复制文件
xcopy /Y /E backups\task-module-v1.2.0-{时间戳}\components\* components\
xcopy /Y /E backups\task-module-v1.2.0-{时间戳}\types\* types\
```

**Linux/Mac:**
```bash
# 查看备份列表
ls -la backups/

# 恢复指定版本
bash scripts/restore-task-module-v1.2.0.sh backups/task-module-v1.2.0-{时间戳}
```

### 场景2: 从Git恢复（如果使用版本控制）

```bash
# 查看提交历史
git log --oneline

# 恢复到指定提交
git checkout {commit-hash} -- components/Task*.tsx
git checkout {commit-hash} -- types/task.ts

# 或者创建新分支
git checkout -b restore-v1.2.0 {commit-hash}
```

---

## 📁 备份文件结构

```
backups/
└── task-module-v1.2.0-20251211-120000/
    ├── components/
    │   ├── TaskManagementPage.tsx
    │   ├── CreateTaskModal.tsx
    │   ├── EditTaskModal.tsx
    │   ├── TaskDetailModal.tsx
    │   ├── TaskRecycleBin.tsx
    │   ├── TaskRecycleBinDetail.tsx
    │   ├── CollaboratorSelector.tsx
    │   ├── OpportunitySelector.tsx
    │   └── ProjectSelector.tsx
    ├── types/
    │   └── task.ts
    ├── docs/
    │   ├── 任务回收站功能说明.md
    │   ├── 任务回收站功能测试报告.md
    │   ├── 任务公开权限功能说明.md
    │   └── 可见性选项UI优化说明.md
    ├── 任务回收站功能完成报告.md
    ├── 任务公开权限功能完成报告.md
    ├── TASK_MODULE_VERSION_v1.2.0.md
    └── BACKUP_MANIFEST.md
```

---

## 🔍 验证恢复结果

### 1. 文件检查
```bash
# 检查关键文件是否存在
ls components/TaskManagementPage.tsx
ls components/TaskRecycleBin.tsx
ls types/task.ts
```

### 2. 编译检查
```bash
# 运行开发服务器
npm run dev

# 检查是否有编译错误
```

### 3. 功能测试
- [ ] 创建任务
- [ ] 编辑任务
- [ ] 查看任务详情
- [ ] 删除任务（放入回收站）
- [ ] 从回收站恢复
- [ ] 永久删除
- [ ] 权限控制测试

---

## ⚠️ 注意事项

### 恢复前必做
1. ✅ **备份当前状态** - 恢复前先备份当前文件，以防需要回滚
2. ✅ **检查依赖** - 确认 package.json 中的依赖版本
3. ✅ **数据库兼容性** - 确认数据库结构是否兼容
4. ✅ **停止开发服务器** - 避免文件被占用

### 恢复后必做
1. ✅ **重新安装依赖** - `npm install`（如果需要）
2. ✅ **清除缓存** - 删除 `node_modules/.vite` 缓存
3. ✅ **编译检查** - 运行 `npm run dev` 检查编译
4. ✅ **功能测试** - 完整测试所有核心功能

---

## 📋 版本对比

### v1.2.0 vs v1.1.0

| 功能 | v1.1.0 | v1.2.0 |
|-----|--------|--------|
| 任务创建/编辑 | ✅ | ✅ |
| 任务详情 | ✅ | ✅ |
| 任务删除 | 永久删除 | 软删除（回收站） |
| 回收站 | ❌ | ✅ 新增 |
| 任务恢复 | ❌ | ✅ 新增 |
| 权限控制 | 简单 | ✅ 增强 |
| 可见性UI | 复选框 | ✅ 单选按钮卡片 |
| 商机关联 | ✅ | ✅ |
| 项目关联 | ✅ | ✅ |

---

## 🛠️ 手动备份步骤（不使用脚本）

### 1. 创建备份目录
```bash
mkdir -p backups/manual-backup-$(date +%Y%m%d)
```

### 2. 复制关键文件
```bash
# 组件
cp components/Task*.tsx backups/manual-backup-$(date +%Y%m%d)/
cp components/Collaborator*.tsx backups/manual-backup-$(date +%Y%m%d)/
cp components/Opportunity*.tsx backups/manual-backup-$(date +%Y%m%d)/
cp components/Project*.tsx backups/manual-backup-$(date +%Y%m%d)/

# 类型
cp types/task.ts backups/manual-backup-$(date +%Y%m%d)/

# 文档
cp docs/任务*.md backups/manual-backup-$(date +%Y%m%d)/
cp 任务*.md backups/manual-backup-$(date +%Y%m%d)/
cp TASK_MODULE_VERSION_*.md backups/manual-backup-$(date +%Y%m%d)/
```

### 3. 创建备份说明
```bash
echo "备份时间: $(date)" > backups/manual-backup-$(date +%Y%m%d)/README.txt
echo "版本: v1.2.0" >> backups/manual-backup-$(date +%Y%m%d)/README.txt
```

---

## 📞 技术支持

如遇到恢复问题，请参考：
1. **完整版本文档**: [TASK_MODULE_VERSION_v1.2.0.md](./TASK_MODULE_VERSION_v1.2.0.md)
2. **备份清单**: 查看备份目录中的 `BACKUP_MANIFEST.md`
3. **Git历史**: `git log --all --graph --oneline`

---

## 📊 版本历史记录

| 版本 | 日期 | 主要变更 | 备份位置 |
|-----|------|---------|---------|
| v1.2.0 | 2025-12-11 | 回收站、权限控制、UI优化 | backups/task-module-v1.2.0-* |
| v1.1.0 | 2025-12-10 | 商机跟进、项目任务 | - |
| v1.0.0 | 2025-12-09 | 基础功能 | - |

---

## 🎯 最佳实践

### 何时备份
- ✅ 每次重大功能完成后
- ✅ 开始新的大型重构前
- ✅ 发布稳定版本后
- ✅ 定期备份（每周/每月）

### 备份命名规范
```
task-module-v{版本号}-{时间戳}
示例: task-module-v1.2.0-20251211-120000
```

### 备份保留策略
- 最近3个稳定版本 - 永久保留
- 开发版本 - 保留30天
- 每月备份 - 保留6个月
- 年度备份 - 永久保留

---

**文档维护**: 每次版本更新后更新本文档  
**最后更新**: 2025-12-11
