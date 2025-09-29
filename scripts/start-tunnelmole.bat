@echo off
REM QuizUP Tunnelmole Deployment Script (Windows)

echo 🚀 Starting QuizUP with Tunnelmole...
echo ====================================
echo.

REM Check if Tunnelmole is installed
where tmole >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Tunnelmole is not installed
    echo Installing Tunnelmole globally...
    npm install -g tunnelmole
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install Tunnelmole
        echo Please install Node.js first: https://nodejs.org
        pause
        exit /b 1
    )
)

echo ✅ Tunnelmole is available

REM Step 1: Start Docker stack
echo 🐳 Starting Docker stack...
docker compose up -d --build

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak > nul

REM Check if services are healthy
echo 🔍 Checking service health...
docker compose ps

REM Step 2: Start Tunnelmole
echo.
echo 🌐 Starting Tunnelmole on port 8090...
echo.

REM Start Tunnelmole (it will show the URL automatically)
echo Starting Tunnelmole tunnel...
echo 📋 Your tunnel URL will appear below:
echo.

REM Start Tunnelmole - it runs in foreground and shows the URL
tmole 8090

echo.
echo ✅ Docker stack is running!
echo 📊 Access points:
echo   • Local: http://localhost:8090
echo   • Grafana: http://localhost:3003  
echo   • Adminer: http://localhost:8080
echo.
echo 🎉 Your QuizUP app is now accessible via Tunnelmole!
echo.
echo 💡 Tips:
echo   • Tunnelmole is much faster than LocalTunnel
echo   • No registration or authentication required
echo   • Perfect for development, testing, and demos
echo   • Press Ctrl+C to stop the tunnel
echo.

pause
