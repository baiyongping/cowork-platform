@echo off
chcp 65001 >nul
echo ========================================
echo 际华协同办公平台 - 权限系统初始化
echo Version: v2.1.0
echo ========================================
echo.

echo [步骤1] 正在执行数据库Schema扩展...
call tcb fn run initPermissionDB -p "{\"action\":\"migrate\"}"
if %errorlevel% neq 0 (
    echo ❌ Schema扩展失败
    pause
    exit /b 1
)
echo ✅ Schema扩展成功
echo.

echo [步骤2] 正在初始化默认角色...
call tcb fn run initPermissionDB -p "{\"action\":\"seed\"}"
if %errorlevel% neq 0 (
    echo ❌ 角色初始化失败
    pause
    exit /b 1
)
echo ✅ 角色初始化成功
echo.

echo [步骤3] 正在验证权限系统...
call tcb fn run initPermissionDB -p "{\"action\":\"verify\"}"
if %errorlevel% neq 0 (
    echo ❌ 验证失败
    pause
    exit /b 1
)
echo ✅ 验证成功
echo.

echo ========================================
echo 🎉 权限系统初始化完成！
echo ========================================
echo.
echo 已创建4个默认角色：
echo   - employee (普通员工)
echo   - manager (部门经理)
echo   - executive (高管)
echo   - admin (管理员)
echo.
echo 已扩展数据库表：
echo   - users: 新增 isExecutive, team 字段
echo   - tasks/opportunities/projects: 新增 isEditLocked, team 字段
echo   - 新增 role_permissions 表
echo   - 新增 sales_goals, opportunity_goals, business_strategies, execution_map 表
echo.
pause
