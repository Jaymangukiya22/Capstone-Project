@echo off
REM Test Tunnelmole Setup Script

echo 🧪 Testing Tunnelmole Setup...
echo ===============================
echo.

REM Get the Tunnelmole URL from user
set /p TUNNEL_URL="Enter your Tunnelmole URL (e.g., https://abc123.tunnelmole.net): "

if "%TUNNEL_URL%"=="" (
    echo ❌ No URL provided
    pause
    exit /b 1
)

echo.
echo 🔍 Testing endpoints...
echo.

REM Test main health endpoint
echo 1. Testing main health endpoint...
curl -s "%TUNNEL_URL%/health" > nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Main health: OK
) else (
    echo ❌ Main health: FAILED
)

REM Test API health endpoint
echo 2. Testing API health endpoint...
curl -s "%TUNNEL_URL%/api/health" > nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ API health: OK
) else (
    echo ❌ API health: FAILED
)

REM Test frontend loading
echo 3. Testing frontend loading...
curl -s "%TUNNEL_URL%/" | findstr "QuizUP" > nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend: OK
) else (
    echo ❌ Frontend: FAILED
)

echo.
echo 🎯 Quick Test Results:
echo • Main App: %TUNNEL_URL%
echo • API: %TUNNEL_URL%/api/health
echo • Admin: %TUNNEL_URL%/admin
echo.
echo 💡 If all tests pass, your Tunnelmole setup is working!
echo.

pause
