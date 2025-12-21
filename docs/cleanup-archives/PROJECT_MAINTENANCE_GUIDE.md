# 项目维护指南 - 保持项目整洁

> 📅 创建日期: 2025-12-21  
> 🎯 目标: 保持项目长期整洁有序

---

## 📋 日常维护规则

### 1. 文件创建规范

**✅ 应该做:**
- 新建文件前先确认是否有类似文件存在
- 临时文件使用 `.tmp` 或 `.temp` 后缀
- 测试文件放在 `scripts/tests/` 目录
- 配置文件放在项目根目录

**❌ 不应该做:**
- 在根目录创建临时测试文件
- 创建重复功能的脚本
- 保留构建日志文件
- 使用中文文件名（尽量避免）

---

### 2. 文档管理规范

**文档分类标准:**

| 文档类型 | 存放位置 | 保留期限 |
|---------|---------|---------|
| **完成报告** | `docs/archived-reports/` | 永久保留 |
| **功能说明** | `docs/guides/` | 永久保留 |
| **部署文档** | `docs/deployment/` | 永久保留 |
| **版本发布** | `docs/releases/` | 永久保留 |
| **临时笔记** | 本地不提交 Git | 完成后删除 |
| **测试文档** | `docs/tests/` | 测试通过后可删除 |

**命名规范:**
```
✅ 好的命名:
- 商机管理优化完成报告_v1.2.0.md
- 权限系统使用指南.md
- 生产环境部署手册.md

❌ 不好的命名:
- 完成.md (太模糊)
- test123.md (无意义)
- 新建文本文档.md (未重命名)
```

---

### 3. 代码提交规范

**提交前检查清单:**
- [ ] 删除 `console.log()` 调试代码
- [ ] 删除注释掉的旧代码
- [ ] 删除未使用的导入
- [ ] 删除临时测试文件
- [ ] 更新相关文档

**Commit Message 格式:**
```bash
# 功能开发
git commit -m "feat: 添加商机阶段管理功能"

# Bug 修复
git commit -m "fix: 修复登录超时问题"

# 文档更新
git commit -m "docs: 更新部署指南"

# 代码重构
git commit -m "refactor: 优化任务列表查询性能"

# 代码清理
git commit -m "chore: 清理临时测试文件"
```

---

### 4. 定期清理任务

**每周清理 (建议周五):**
```bash
# 1. 检查根目录是否有临时文件
dir e:\cowork\*.tmp
dir e:\cowork\*.log

# 2. 归档本周完成报告
move *完成报告*.md docs\archived-reports\

# 3. 清理构建产物
del /q build*.log
```

**每月清理 (建议月末):**
```bash
# 1. 运行归档脚本
powershell -ExecutionPolicy Bypass -File .\scripts\archive-old-files.ps1

# 2. 检查脚本目录
dir scripts\*.bat | find /c /v ""

# 3. 清理未使用的依赖
npm prune
```

**每季度审查 (建议季末):**
- 审查 `docs/archived-reports/` 是否需要压缩存档
- 检查 `scripts/archived/` 是否有可永久删除的脚本
- 更新 `FILE_CLEANUP_PLAN.md` 清理计划

---

## 🔧 维护工具使用

### 工具 1: 归档脚本
```powershell
# 自动归档旧文件
powershell -ExecutionPolicy Bypass -File .\scripts\archive-old-files.ps1
```

**适用场景:**
- 根目录积累了多个完成报告
- 有新的功能说明文档
- 部署文档需要归档

### 工具 2: 查看归档
```batch
# 快速查看所有归档文件
.\scripts\view-archives.bat
```

**适用场景:**
- 查找历史完成报告
- 查看已归档的功能说明
- 检查归档文件数量

### 工具 3: 清理垃圾文件
```batch
# 安全删除垃圾文件
.\scripts\clean-project.bat
```

**适用场景:**
- 构建后清理日志
- 删除临时测试文件
- 清理过期配置文件

---

## 📊 项目健康度检查

### 检查清单

**优秀状态 ⭐⭐⭐⭐⭐:**
- [ ] 根目录 .md 文件 ≤ 10 个
- [ ] 根目录 .bat 文件 ≤ 5 个
- [ ] 无构建日志文件
- [ ] 无临时测试文件
- [ ] docs/ 目录结构清晰
- [ ] scripts/ 脚本有序分类

**良好状态 ⭐⭐⭐⭐:**
- [ ] 根目录 .md 文件 ≤ 15 个
- [ ] 根目录 .bat 文件 ≤ 8 个
- [ ] 构建日志 ≤ 3 个
- [ ] 临时文件 ≤ 5 个

**需要清理 ⭐⭐:**
- 根目录 .md 文件 > 20 个
- 根目录 .bat 文件 > 10 个
- 大量构建日志和临时文件

### 快速检查命令
```batch
@echo off
echo === 项目健康度检查 ===
echo.
echo 根目录 MD 文件数量:
dir e:\cowork\*.md /b | find /c /v ""
echo.
echo 根目录 BAT 文件数量:
dir e:\cowork\*.bat /b | find /c /v ""
echo.
echo 构建日志文件:
dir e:\cowork\build*.log 2>nul || echo ✅ 无构建日志
echo.
echo 临时测试文件:
dir e:\cowork\*test*.html 2>nul || echo ✅ 无临时测试
```

---

## 🚨 常见问题处理

### Q1: 根目录文件太多怎么办？

**解决方案:**
1. 运行归档脚本: `.\scripts\archive-old-files.ps1`
2. 手动分类未归档的文件
3. 删除确认不需要的临时文件

### Q2: 不确定某个文件是否需要保留？

**判断标准:**
- 是否在最近 30 天内使用过？
- 是否有其他文件提供相同功能？
- 删除后是否影响项目运行？

**建议操作:**
- 先移到 `backups/temp/` 目录观察 1 周
- 确认不需要后再永久删除

### Q3: 如何恢复误删的归档文件？

**方法 1: Git 恢复**
```bash
# 查看删除的文件
git log --diff-filter=D --summary

# 恢复特定文件
git checkout <commit-hash> -- <file-path>
```

**方法 2: 从归档目录恢复**
```bash
# 归档文件位置
docs/archived-reports/
docs/guides/
docs/deployment/
docs/releases/
scripts/archived/
```

---

## 📖 最佳实践

### 实践 1: 文件即删原则
```
✅ 功能完成 → 立即删除调试文件
✅ 测试通过 → 立即删除测试脚本
✅ 部署成功 → 立即归档部署日志
```

### 实践 2: 一周一清理
```
每周五下班前:
1. 删除构建日志
2. 归档完成报告
3. 提交清理的代码
```

### 实践 3: 命名规范
```
文档命名: <模块>_<类型>_<版本>.md
示例: 商机管理_功能说明_v2.1.md

脚本命名: <动作>-<目标>.bat
示例: deploy-to-test.bat
```

### 实践 4: Git 提交规范
```
每次提交前:
1. git status  # 检查修改
2. git diff    # 查看变更
3. 删除不需要提交的文件
4. git add 明确的文件
5. git commit 清晰的消息
```

---

## 🎯 维护目标

**短期目标 (1 个月):**
- [x] 完成首次大清理 ✅
- [ ] 建立每周清理习惯
- [ ] 熟悉归档工具使用

**中期目标 (3 个月):**
- [ ] 保持根目录文件 ≤ 10 个
- [ ] 文档归档率 > 90%
- [ ] 无垃圾文件积累

**长期目标 (6 个月):**
- [ ] 项目整洁度保持 ⭐⭐⭐⭐⭐
- [ ] 形成自动化清理流程
- [ ] 完善维护文档体系

---

## 📞 需要帮助？

如果遇到清理相关问题:
1. 查看 `FILE_CLEANUP_PLAN.md` 清理计划
2. 阅读 `docs/cleanup-archives/CLEANUP_FINAL_SUMMARY.md`
3. 运行 `.\scripts\view-archives.bat` 查看归档

---

**记住: 整洁的项目 = 高效的开发！** 🚀
