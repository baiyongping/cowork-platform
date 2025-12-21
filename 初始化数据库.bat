@echo off
chcp 65001 > nul
echo ========================================
echo   际华协同办公平台 - 数据库初始化
echo ========================================
echo.
echo 环境: cowork-9gg9oocb516be5fb
echo.

node scripts/init-database-local.js

echo.
pause
