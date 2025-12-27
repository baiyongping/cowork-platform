@echo off
chcp 65001 > nul
cd /d "d:\project\cowork12-21"

echo ========================================
echo Git 提交脚本
echo ========================================
echo.

echo [1/4] 添加所有修改...
git add .

echo.
echo [2/4] 查看当前状态...
git status

echo.
echo [3/4] 提交修改...
git commit -m "修复预算执行保存和显示问题

- 修复保存后数据显示为0的问题
- 重新加载执行数据以刷新显示
- 简化了二级科目的获取逻辑
- 删除了调试日志
"

echo.
echo [4/4] 完成!
echo.
echo 如需推送到远程仓库，请运行: git push
echo.
pause
