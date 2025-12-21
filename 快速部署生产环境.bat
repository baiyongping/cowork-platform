@echo off
chcp 65001 >nul

echo ========================================
echo   Deploy to Production Server
echo ========================================
echo.
echo Target: https://jihuadz.xin
echo Database: cowork-9gg9oocb516be5fb (Production)
echo Directory: /var/www/jihua/
echo.
echo WARNING: This will affect the production environment!
echo.

set /p confirm="Type 'YES' to confirm: "
if not "%confirm%"=="YES" (
    echo Deployment cancelled.
    pause
    exit /b
)

echo.
echo [1/3] Building project (Production mode)...
call npx vite build --mode production

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Uploading files to production server...
scp -r dist/* root@152.136.183.181:/var/www/jihua/

if errorlevel 1 (
    echo Upload failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Deployment complete!
echo.
echo Production URL: https://jihuadz.xin
echo Database: cowork-9gg9oocb516be5fb
echo.
echo Please verify the production site immediately!
pause
