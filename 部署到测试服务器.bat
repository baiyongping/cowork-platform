@echo off
chcp 65001 >nul
echo ======================================
echo   Deploy to Test Server (152.136.183.181:3443)
echo   Database: jihua-oa-dev-3goht9irae4d949f
echo ======================================
echo.

echo [1/4] Cleaning old build...
if exist dist (
    rmdir /s /q dist
    echo     ✓ Cleaned
) else (
    echo     ✓ Already clean
)
echo.

echo [2/4] Building with test mode...
echo     Environment: test
echo     Database: jihua-oa-dev-3goht9irae4d949f
call npx vite build --mode test
if %ERRORLEVEL% NEQ 0 (
    echo     ✗ Build failed!
    pause
    exit /b 1
)
echo     ✓ Build complete
echo.

echo [3/4] Verifying environment ID in build...
findstr /C:"jihua-oa-dev-3goht9irae4d949f" dist\assets\*.js >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo     ✓ Test environment ID found in build
) else (
    echo     ✗ WARNING: Test environment ID NOT found!
    echo     Searching for environment IDs...
    findstr /C:"cowork-" dist\assets\*.js 2>nul
    echo.
    echo Press any key to continue anyway, or Ctrl+C to cancel...
    pause >nul
)
echo.

echo [4/4] Uploading to test server...
echo     Server: 152.136.183.181
echo     Directory: /var/www/jihua-dev/
echo.
echo Please run this command on the server:
echo.
echo   scp -r dist/* root@152.136.183.181:/var/www/jihua-dev/
echo   ssh root@152.136.183.181 "chown -R nginx:nginx /var/www/jihua-dev && chmod -R 755 /var/www/jihua-dev"
echo.
echo Or use Lighthouse deployment tool.
echo.

echo ======================================
echo   ✓ Build complete!
echo   Next: Upload to server
echo ======================================
echo.
echo Test URL: https://152.136.183.181:3443
echo.
pause
