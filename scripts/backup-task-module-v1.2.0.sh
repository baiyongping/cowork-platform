#!/bin/bash

# 任务管理模块 v1.2.0 版本备份脚本
# 备份日期: 2025-12-11
# 说明: 备份任务管理模块的所有相关文件

echo "========================================"
echo "任务管理模块 v1.2.0 版本备份"
echo "========================================"

# 创建备份目录
BACKUP_DIR="backups/task-module-v1.2.0-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 创建备份目录: $BACKUP_DIR"

# 1. 备份组件文件
echo "📦 备份组件文件..."
mkdir -p "$BACKUP_DIR/components"
cp components/TaskManagementPage.tsx "$BACKUP_DIR/components/"
cp components/CreateTaskModal.tsx "$BACKUP_DIR/components/"
cp components/EditTaskModal.tsx "$BACKUP_DIR/components/"
cp components/TaskDetailModal.tsx "$BACKUP_DIR/components/"
cp components/TaskRecycleBin.tsx "$BACKUP_DIR/components/"
cp components/TaskRecycleBinDetail.tsx "$BACKUP_DIR/components/"
cp components/CollaboratorSelector.tsx "$BACKUP_DIR/components/"
cp components/OpportunitySelector.tsx "$BACKUP_DIR/components/"
cp components/ProjectSelector.tsx "$BACKUP_DIR/components/"

# 2. 备份类型定义文件
echo "📦 备份类型定义..."
mkdir -p "$BACKUP_DIR/types"
cp types/task.ts "$BACKUP_DIR/types/"

# 3. 备份文档文件
echo "📦 备份文档文件..."
mkdir -p "$BACKUP_DIR/docs"
cp docs/任务回收站功能说明.md "$BACKUP_DIR/docs/" 2>/dev/null || true
cp docs/任务回收站功能测试报告.md "$BACKUP_DIR/docs/" 2>/dev/null || true
cp docs/任务公开权限功能说明.md "$BACKUP_DIR/docs/" 2>/dev/null || true
cp docs/可见性选项UI优化说明.md "$BACKUP_DIR/docs/" 2>/dev/null || true

# 4. 备份根目录文档
echo "📦 备份根目录文档..."
cp 任务回收站功能完成报告.md "$BACKUP_DIR/" 2>/dev/null || true
cp 任务公开权限功能完成报告.md "$BACKUP_DIR/" 2>/dev/null || true
cp TASK_MODULE_VERSION_v1.2.0.md "$BACKUP_DIR/" 2>/dev/null || true

# 5. 创建备份清单
echo "📝 创建备份清单..."
cat > "$BACKUP_DIR/BACKUP_MANIFEST.md" << EOF
# 任务管理模块 v1.2.0 备份清单

## 备份信息
- **版本**: v1.2.0
- **备份时间**: $(date +"%Y-%m-%d %H:%M:%S")
- **备份位置**: $BACKUP_DIR

## 备份文件列表

### 组件文件 (components/)
- TaskManagementPage.tsx - 任务管理主页面
- CreateTaskModal.tsx - 创建任务模态框
- EditTaskModal.tsx - 编辑任务模态框
- TaskDetailModal.tsx - 任务详情模态框
- TaskRecycleBin.tsx - 回收站主组件
- TaskRecycleBinDetail.tsx - 回收站详情组件
- CollaboratorSelector.tsx - 协同人选择器
- OpportunitySelector.tsx - 商机选择器
- ProjectSelector.tsx - 项目选择器

### 类型定义 (types/)
- task.ts - 任务相关类型定义

### 文档文件 (docs/)
- 任务回收站功能说明.md
- 任务回收站功能测试报告.md
- 任务公开权限功能说明.md
- 可见性选项UI优化说明.md

### 根目录文档
- 任务回收站功能完成报告.md
- 任务公开权限功能完成报告.md
- TASK_MODULE_VERSION_v1.2.0.md - 完整版本文档

## 恢复说明

### 快速恢复
\`\`\`bash
# 执行恢复脚本
bash scripts/restore-task-module-v1.2.0.sh $BACKUP_DIR
\`\`\`

### 手动恢复
\`\`\`bash
# 1. 恢复组件文件
cp -r $BACKUP_DIR/components/* components/

# 2. 恢复类型定义
cp -r $BACKUP_DIR/types/* types/

# 3. 恢复文档
cp -r $BACKUP_DIR/docs/* docs/
cp $BACKUP_DIR/*.md ./
\`\`\`

## 注意事项
1. 恢复前请先备份当前文件
2. 确认数据库结构兼容性
3. 检查依赖版本是否匹配

EOF

# 6. 统计备份文件
FILE_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "✅ 备份完成！"
echo "📊 统计信息:"
echo "   - 备份文件数: $FILE_COUNT"
echo "   - 总大小: $TOTAL_SIZE"
echo "   - 备份位置: $BACKUP_DIR"
echo ""
echo "📋 备份清单已生成: $BACKUP_DIR/BACKUP_MANIFEST.md"
echo "========================================"
