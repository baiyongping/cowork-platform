@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 任务管理模块 v1.2.0 版本备份脚本 (Windows)
REM 备份日期: 2025-12-11

echo ========================================
echo 任务管理模块 v1.2.0 版本备份
echo ========================================
echo.

REM 获取当前时间戳
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%-%datetime:~8,6%

REM 创建备份目录
set BACKUP_DIR=backups\task-module-v1.2.0-%TIMESTAMP%
mkdir "%BACKUP_DIR%" 2>nul
mkdir "%BACKUP_DIR%\components" 2>nul
mkdir "%BACKUP_DIR%\types" 2>nul
mkdir "%BACKUP_DIR%\docs" 2>nul

echo 📁 创建备份目录: %BACKUP_DIR%
echo.

REM 1. 备份组件文件
echo 📦 备份组件文件...
copy /Y components\TaskManagementPage.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\CreateTaskModal.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\EditTaskModal.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\TaskDetailModal.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\TaskRecycleBin.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\TaskRecycleBinDetail.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\CollaboratorSelector.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\OpportunitySelector.tsx "%BACKUP_DIR%\components\" >nul 2>&1
copy /Y components\ProjectSelector.tsx "%BACKUP_DIR%\components\" >nul 2>&1
echo    ✅ 9个组件文件

REM 2. 备份类型定义文件
echo 📦 备份类型定义...
copy /Y types\task.ts "%BACKUP_DIR%\types\" >nul 2>&1
echo    ✅ 1个类型文件

REM 3. 备份文档文件
echo 📦 备份文档文件...
copy /Y docs\任务回收站功能说明.md "%BACKUP_DIR%\docs\" >nul 2>&1
copy /Y docs\任务回收站功能测试报告.md "%BACKUP_DIR%\docs\" >nul 2>&1
copy /Y docs\任务公开权限功能说明.md "%BACKUP_DIR%\docs\" >nul 2>&1
copy /Y docs\可见性选项UI优化说明.md "%BACKUP_DIR%\docs\" >nul 2>&1
echo    ✅ 4个文档文件

REM 4. 备份根目录文档
echo 📦 备份根目录文档...
copy /Y 任务回收站功能完成报告.md "%BACKUP_DIR%\" >nul 2>&1
copy /Y 任务公开权限功能完成报告.md "%BACKUP_DIR%\" >nul 2>&1
copy /Y TASK_MODULE_VERSION_v1.2.0.md "%BACKUP_DIR%\" >nul 2>&1
echo    ✅ 3个报告文件

REM 5. 创建备份清单
echo 📝 创建备份清单...
(
echo # 任务管理模块 v1.2.0 备份清单
echo.
echo ## 备份信息
echo - **版本**: v1.2.0
echo - **备份时间**: %date% %time%
echo - **备份位置**: %BACKUP_DIR%
echo.
echo ## 备份文件列表
echo.
echo ### 组件文件 ^(components/^)
echo - TaskManagementPage.tsx - 任务管理主页面
echo - CreateTaskModal.tsx - 创建任务模态框
echo - EditTaskModal.tsx - 编辑任务模态框
echo - TaskDetailModal.tsx - 任务详情模态框
echo - TaskRecycleBin.tsx - 回收站主组件
echo - TaskRecycleBinDetail.tsx - 回收站详情组件
echo - CollaboratorSelector.tsx - 协同人选择器
echo - OpportunitySelector.tsx - 商机选择器
echo - ProjectSelector.tsx - 项目选择器
echo.
echo ### 类型定义 ^(types/^)
echo - task.ts - 任务相关类型定义
echo.
echo ### 文档文件 ^(docs/^)
echo - 任务回收站功能说明.md
echo - 任务回收站功能测试报告.md
echo - 任务公开权限功能说明.md
echo - 可见性选项UI优化说明.md
echo.
echo ### 根目录文档
echo - 任务回收站功能完成报告.md
echo - 任务公开权限功能完成报告.md
echo - TASK_MODULE_VERSION_v1.2.0.md - 完整版本文档
echo.
echo ## 恢复说明
echo.
echo ### Windows快速恢复
echo ```batch
echo backup-task-module-v1.2.0.bat恢复 %BACKUP_DIR%
echo ```
echo.
echo ### 手动恢复
echo ```batch
echo REM 1. 恢复组件文件
echo xcopy /Y /E "%BACKUP_DIR%\components\*" components\
echo.
echo REM 2. 恢复类型定义
echo xcopy /Y /E "%BACKUP_DIR%\types\*" types\
echo.
echo REM 3. 恢复文档
echo xcopy /Y /E "%BACKUP_DIR%\docs\*" docs\
echo copy /Y "%BACKUP_DIR%\*.md" .\
echo ```
echo.
echo ## 注意事项
echo 1. 恢复前请先备份当前文件
echo 2. 确认数据库结构兼容性
echo 3. 检查依赖版本是否匹配
) > "%BACKUP_DIR%\BACKUP_MANIFEST.md"

REM 6. 统计备份信息
echo.
echo ✅ 备份完成！
echo 📊 统计信息:
dir /s /b "%BACKUP_DIR%\*" | find /c "\" > temp.txt
set /p FILE_COUNT=<temp.txt
del temp.txt
echo    - 备份文件数: %FILE_COUNT%
echo    - 备份位置: %BACKUP_DIR%
echo.
echo 📋 备份清单已生成: %BACKUP_DIR%\BACKUP_MANIFEST.md
echo ========================================
echo.
pause
