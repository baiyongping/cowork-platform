#!/bin/bash

# 任务管理模块 v1.2.0 版本恢复脚本
# 恢复日期: 按需执行
# 说明: 从备份恢复任务管理模块

echo "========================================"
echo "任务管理模块 v1.2.0 版本恢复"
echo "========================================"

# 检查参数
if [ -z "$1" ]; then
  echo "❌ 错误: 请指定备份目录路径"
  echo "用法: bash restore-task-module-v1.2.0.sh <备份目录路径>"
  echo "示例: bash restore-task-module-v1.2.0.sh backups/task-module-v1.2.0-20251211-120000"
  exit 1
fi

BACKUP_DIR="$1"

# 检查备份目录是否存在
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ 错误: 备份目录不存在: $BACKUP_DIR"
  exit 1
fi

echo "📁 备份目录: $BACKUP_DIR"
echo ""

# 确认操作
read -p "⚠️  此操作将覆盖当前文件，是否继续？[y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 操作已取消"
  exit 0
fi

# 创建当前状态备份
CURRENT_BACKUP="backups/before-restore-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CURRENT_BACKUP/components"
mkdir -p "$CURRENT_BACKUP/types"
mkdir -p "$CURRENT_BACKUP/docs"

echo "📦 备份当前状态到: $CURRENT_BACKUP"
cp components/Task*.tsx "$CURRENT_BACKUP/components/" 2>/dev/null || true
cp components/Collaborator*.tsx "$CURRENT_BACKUP/components/" 2>/dev/null || true
cp components/Opportunity*.tsx "$CURRENT_BACKUP/components/" 2>/dev/null || true
cp components/Project*.tsx "$CURRENT_BACKUP/components/" 2>/dev/null || true
cp types/task.ts "$CURRENT_BACKUP/types/" 2>/dev/null || true
cp docs/任务*.md "$CURRENT_BACKUP/docs/" 2>/dev/null || true
cp 任务*.md "$CURRENT_BACKUP/" 2>/dev/null || true
cp TASK_MODULE_VERSION_*.md "$CURRENT_BACKUP/" 2>/dev/null || true

# 开始恢复
echo ""
echo "🔄 开始恢复..."

# 1. 恢复组件文件
echo "📦 恢复组件文件..."
if [ -d "$BACKUP_DIR/components" ]; then
  cp -r "$BACKUP_DIR/components"/* components/
  echo "   ✅ 组件文件恢复完成"
else
  echo "   ⚠️  未找到组件备份"
fi

# 2. 恢复类型定义
echo "📦 恢复类型定义..."
if [ -d "$BACKUP_DIR/types" ]; then
  cp -r "$BACKUP_DIR/types"/* types/
  echo "   ✅ 类型定义恢复完成"
else
  echo "   ⚠️  未找到类型定义备份"
fi

# 3. 恢复文档
echo "📦 恢复文档文件..."
if [ -d "$BACKUP_DIR/docs" ]; then
  cp -r "$BACKUP_DIR/docs"/* docs/ 2>/dev/null || true
  echo "   ✅ 文档恢复完成"
else
  echo "   ⚠️  未找到文档备份"
fi

# 4. 恢复根目录文档
echo "📦 恢复根目录文档..."
cp "$BACKUP_DIR"/*.md ./ 2>/dev/null || true
echo "   ✅ 根目录文档恢复完成"

# 5. 验证恢复
echo ""
echo "🔍 验证恢复结果..."

REQUIRED_FILES=(
  "components/TaskManagementPage.tsx"
  "components/CreateTaskModal.tsx"
  "components/EditTaskModal.tsx"
  "components/TaskDetailModal.tsx"
  "components/TaskRecycleBin.tsx"
  "types/task.ts"
)

MISSING_COUNT=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "   ❌ 缺失: $file"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done

if [ $MISSING_COUNT -eq 0 ]; then
  echo "   ✅ 所有关键文件已恢复"
else
  echo "   ⚠️  有 $MISSING_COUNT 个文件缺失"
fi

echo ""
echo "✅ 恢复完成！"
echo "📊 恢复信息:"
echo "   - 源备份: $BACKUP_DIR"
echo "   - 当前状态备份: $CURRENT_BACKUP"
echo ""
echo "📝 后续步骤:"
echo "   1. 检查代码是否正常运行"
echo "   2. 测试任务管理功能"
echo "   3. 如有问题，可从 $CURRENT_BACKUP 回滚"
echo ""
echo "========================================"
