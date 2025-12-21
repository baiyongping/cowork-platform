@echo off
chcp 65001 >nul
echo ========================================
echo  baiyp02 权限问题快速验证
echo ========================================
echo.
echo 📋 验证步骤：
echo.
echo 1. 清除浏览器缓存和登录状态
echo    - 在浏览器控制台执行：
echo      localStorage.removeItem('auth_token');
echo      localStorage.removeItem('current_user');
echo      location.reload();
echo.
echo 2. 重新登录
echo    - 使用 baiyp02 账号重新登录系统
echo.
echo 3. 检查用户数据
echo    - 在浏览器控制台执行：
echo      console.log(JSON.parse(localStorage.getItem('current_user')));
echo    - 确认输出包含 "roles": ["executive"]
echo.
echo 4. 使用诊断工具
echo.
echo 正在启动浏览器诊断工具...
echo.
start http://localhost:5173/test-baiyp02-permission.html
echo.
echo ✅ 诊断工具已在浏览器中打开
echo.
echo 📝 使用说明：
echo 1. 按顺序点击每个步骤的按钮
echo 2. 查看每个步骤的诊断结果
echo 3. 特别注意"步骤4"的匹配结果
echo.
echo 🔍 如果匹配结果显示"✅ 匹配成功"，说明：
echo    - 数据库配置正确
echo    - 权限匹配逻辑正常
echo    - 问题可能在于 localStorage 缓存
echo.
echo ❌ 如果匹配结果显示"❌ 匹配失败"，请：
echo    - 检查 baiyp02 的 roles 字段
echo    - 检查"公司高管"角色的 role 字段
echo    - 查看详细的问题分析
echo.
echo ========================================
echo  详细诊断报告：baiyp02权限问题诊断报告.md
echo ========================================
echo.
pause
