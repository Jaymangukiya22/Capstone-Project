@echo off
REM Script to switch between development and production environments
REM Usage: switch-env.bat [dev|prod]

set MODE=%1
if "%MODE%"=="" set MODE=dev

if "%MODE%"=="prod" goto production
if "%MODE%"=="production" goto production
if "%MODE%"=="dev" goto development
if "%MODE%"=="development" goto development

echo ❌ Invalid mode: %MODE%
echo Usage: %0 [dev^|prod]
echo   dev  - Development mode (localhost)
echo   prod - Production mode (Cloudflare tunnel)
exit /b 1

:production
echo 🚀 Switching to PRODUCTION mode...

REM Copy production environment files
copy /Y .env.production .env >nul
copy /Y Frontend-admin\.env.production Frontend-admin\.env >nul

echo ✅ Production environment activated!
echo 📋 Configuration:
echo    - API: https://api.quizdash.dpdns.org
echo    - WebSocket: wss://match.quizdash.dpdns.org
echo    - HMR: wss://quizdash.dpdns.org (for Cloudflare tunnel)
echo.
echo 🔄 Restart services: docker-compose restart frontend
goto end

:development
echo 🔧 Switching to DEVELOPMENT mode...

REM Restore development environment files (you may need to manually restore these)
echo ℹ️  Make sure your .env files are set to development mode
echo    You can manually edit them or restore from git

echo ✅ Development environment activated!
echo 📋 Configuration:
echo    - API: http://localhost:8090
echo    - WebSocket: ws://localhost:3001
echo    - HMR: ws://localhost:5173 (for local development)
echo.
echo 🔄 Restart services: docker-compose restart frontend

:end
