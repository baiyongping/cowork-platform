@echo off
chcp 65001 >nul
echo ====================================
echo   移除废弃的user角色
echo ====================================
echo.
echo 此脚本将:
echo 1. 查找所有使用user角色的用户
echo 2. 清空他们的role字段
echo 3. 提示管理员为这些用户分配正确的角色
echo.
pause
echo.
echo 正在执行...
node scripts/remove-user-role.js
echo.
pause
