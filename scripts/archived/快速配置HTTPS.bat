@echo off
chcp 65001 >nul
echo ════════════════════════════════════════
echo 配置测试环境 HTTPS
echo ════════════════════════════════════════
echo.

echo 正在上传配置脚本...
scp 配置测试环境HTTPS.sh root@152.136.183.181:/tmp/

echo.
echo 正在执行配置...
ssh root@152.136.183.181 "chmod +x /tmp/配置测试环境HTTPS.sh && bash /tmp/配置测试环境HTTPS.sh"

echo.
echo ════════════════════════════════════════
echo ✅ 配置完成！
echo ════════════════════════════════════════
echo.
echo 访问地址: https://152.136.183.181:3443
echo.
echo ⚠️  注意: 自签名证书会显示警告，点击继续访问即可
echo.
pause
