@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo      Jihua OA Environment Manager
echo ========================================
echo.
echo [Environment Architecture]
echo.
echo Local Development (localhost:5173)
echo   ^|-- Database: jihua-oa-dev-3goht9irae4d949f (Test)
echo   ^|-- Config: .env.development
echo.
echo Test Server (https://152.136.183.181:3443)
echo   ^|-- Database: jihua-oa-dev-3goht9irae4d949f (Test)
echo   ^|-- Config: .env.test
echo.
echo Production Server (https://jihuadz.xin)
echo   ^|-- Database: cowork-9gg9oocb516be5fb (Production)
echo   ^|-- Config: .env.production
echo.
echo ========================================
echo.
echo [Options]
echo 1. Start Local Development (Test DB)
echo 2. Build for Test Server
echo 3. Build for Production Server
echo 4. Deploy to Test Server (152.136.183.181:3443)
echo 5. Deploy to Production Server (jihuadz.xin)
echo 6. Open Test Database Console
echo 7. Open Production Database Console
echo 8. Exit
echo.
set /p choice="Please select (1-8): "

if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto build_test
if "%choice%"=="3" goto build_prod
if "%choice%"=="4" goto deploy_test
if "%choice%"=="5" goto deploy_prod
if "%choice%"=="6" goto console_test
if "%choice%"=="7" goto console_prod
if "%choice%"=="8" goto end

echo Invalid choice!
pause
exit /b

:start_dev
echo.
echo [Starting Local Development...]
echo Environment: Test (jihua-oa-dev-3goht9irae4d949f)
echo URL: http://localhost:5173
echo.
call npm run dev
goto end

:build_test
echo.
echo [Building for Test Server...]
echo Environment: Test (jihua-oa-dev-3goht9irae4d949f)
echo.
call npx vite build --mode test
echo.
echo Build Complete! Output: dist/
pause
goto end

:build_prod
echo.
echo [Building for Production Server...]
echo Environment: Production (cowork-9gg9oocb516be5fb)
echo.
call npx vite build --mode production
echo.
echo Build Complete! Output: dist/
pause
goto end

:deploy_test
echo.
echo [Deploying to Test Server...]
echo Target: https://152.136.183.181:3443
echo Database: jihua-oa-dev-3goht9irae4d949f
echo.
set /p confirm="Confirm deployment? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Deployment cancelled.
    pause
    goto end
)

echo Building...
call npx vite build --mode test

echo Uploading to Test Server...
scp -r dist/* root@152.136.183.181:/var/www/jihua-dev/

echo.
echo Deployment Complete!
echo Test URL: https://152.136.183.181:3443
echo.
pause
goto end

:deploy_prod
echo.
echo ========================================
echo  WARNING: PRODUCTION DEPLOYMENT
echo ========================================
echo Target: https://jihuadz.xin
echo Database: cowork-9gg9oocb516be5fb
echo.
echo This will affect the production environment!
echo.
set /p confirm="Type 'YES' to confirm: "
if not "%confirm%"=="YES" (
    echo Deployment cancelled.
    pause
    goto end
)

echo Building...
call npx vite build --mode production

echo Uploading to Production Server...
scp -r dist/* root@152.136.183.181:/var/www/jihua/

echo.
echo Deployment Complete!
echo Production URL: https://jihuadz.xin
echo.
echo Please verify the production site!
pause
goto end

:console_test
echo.
echo Opening Test Database Console...
start https://tcb.cloud.tencent.com/dev?envId=jihua-oa-dev-3goht9irae4d949f#/db/doc
pause
goto end

:console_prod
echo.
echo Opening Production Database Console...
start https://tcb.cloud.tencent.com/dev?envId=cowork-9gg9oocb516be5fb#/db/doc
pause
goto end

:end
endlocal
exit /b
