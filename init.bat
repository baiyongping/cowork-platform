@echo off
cd /d %~dp0
echo Deploying initDatabase function...
call cloudbase functions:deploy initDatabase --envId cowork-9gg9oocb516be5fb
echo.
echo Invoking initDatabase function...
call cloudbase functions:invoke initDatabase --envId cowork-9gg9oocb516be5fb
echo.
echo Done!
pause
