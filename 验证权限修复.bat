@echo off
chcp 65001 >nul
echo ========================================
echo 权限系统修复验证工具 v2.2.0
echo ========================================
echo.

echo 📋 修复内容:
echo   - 支持 user.roles 数组匹配权限 (新格式)
echo   - 兼容 user.role 字段匹配权限 (旧格式)
echo   - 支持多角色权限合并
echo.

echo 🔍 验证步骤:
echo   1. 打开浏览器访问系统
echo   2. 使用 baiyp02 账号登录
echo   3. 打开浏览器开发者工具 (F12)
echo   4. 查看控制台日志
echo.

echo 📊 预期日志输出:
echo   [权限] 开始计算用户权限: { username: "baiyp02", ... }
echo   [权限] 使用 user.roles 数组匹配权限: [...]
echo   [权限] 通过 user.roles 匹配到的角色: [...]
echo   [权限] 最终权限: { tasks: {...}, opportunities: {...} }
echo.

echo ✅ 验证要点:
echo   - 检查侧边栏菜单是否显示正确
echo   - 检查功能页面的操作按钮是否显示
echo   - 检查权限是否与角色配置一致
echo.

echo 🌐 是否现在打开浏览器? (Y/N)
set /p choice=请选择: 

if /i "%choice%"=="Y" (
    echo.
    echo 正在打开系统...
    start http://localhost:5173
    
    timeout /t 2 >nul
    echo.
    echo 正在打开测试页面...
    start http://localhost:5173/test-permission-fix.html
    
    echo.
    echo ✓ 浏览器已打开
    echo.
    echo 💡 提示:
    echo   - 主系统: http://localhost:5173
    echo   - 测试页面: http://localhost:5173/test-permission-fix.html
    echo   - 用户诊断: http://localhost:5173/test-user-permissions.html
) else (
    echo.
    echo 验证链接:
    echo   - 主系统: http://localhost:5173
    echo   - 测试页面: http://localhost:5173/test-permission-fix.html
    echo   - 用户诊断: http://localhost:5173/test-user-permissions.html
)

echo.
echo 📖 详细报告请查看: 权限系统修复报告_v2.2.0.md
echo.
pause
