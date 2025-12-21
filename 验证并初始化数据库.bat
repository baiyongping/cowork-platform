@echo off
chcp 65001 > nul
echo ========================================
echo   验证并初始化 cowork 数据库
echo ========================================
echo.
echo 环境: cowork-9gg9oocb516be5fb
echo.

node scripts/verify-and-init-db.js

echo.
pause
