@echo off
chcp 65001 >nul
echo === 执行归档脚本 ===
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\archive-old-files.ps1"
echo.
echo === 归档完成 ===
pause
