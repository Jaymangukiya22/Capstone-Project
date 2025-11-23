@echo off
REM =============================================================================
REM QuizUP Network Setup Script for Windows
REM Automatically configures network access for 4000 concurrent users
REM =============================================================================

echo 🚀 QuizUP Network Setup for 4000 Concurrent Users
echo.

REM Get network IP
echo 📡 Detecting your network IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="" (
        if not "!ip!"=="127.0.0.1" (
            set NETWORK_IP=!ip!
            goto :found_ip
        )
    )
)

:found_ip
if "%NETWORK_IP%"=="" (
    echo ❌ Could not detect network IP automatically
    set /p NETWORK_IP="Please enter your network IP address (e.g., 192.168.1.100): "
)

echo ✅ Using network IP: %NETWORK_IP%
echo.

REM Create network environment file
echo 📝 Creating network configuration...
(
echo # =============================================================================
echo # NETWORK ACCESS CONFIGURATION - AUTO-GENERATED
echo # Generated on %date% at %time%
echo # =============================================================================
echo.
echo NODE_ENV=development
echo.
echo # Network Configuration
echo VITE_NETWORK_IP=%NETWORK_IP%
echo VITE_NETWORK_MODE=true
echo.
echo # Database Configuration
echo POSTGRES_DB=quizup_db
echo POSTGRES_USER=quizup_user
echo POSTGRES_PASSWORD=quizup_password
echo POSTGRES_PORT=5432
echo DATABASE_URL=postgresql://quizup_user:quizup_password@localhost:5432/quizup_db
echo.
echo # Redis Configuration
echo REDIS_PORT=6379
echo REDIS_URL=redis://localhost:6379
echo.
echo # Server Configuration
echo BACKEND_PORT=3000
echo MATCH_SERVICE_PORT=3001
echo FRONTEND_PORT=5173
echo NGINX_HTTP_PORT=8090
echo.
echo # Security Configuration
echo JWT_SECRET=7a0b42e9df5856f7cfe0094361f65630
echo JWT_REFRESH_SECRET=cc904107600ce1cc0631f254302ebf11
echo JWT_EXPIRES_IN=24h
echo JWT_REFRESH_EXPIRES_IN=30d
echo BCRYPT_ROUNDS=10
echo SESSION_SECRET=8dffc9cf66c63c3eb912ba2c6fd1a306
echo.
echo # CORS Configuration - Network Access
echo CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:8090,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:8090,http://%NETWORK_IP%:5173,http://%NETWORK_IP%:8090,http://10.0.0.0/8,http://172.16.0.0/12,http://192.168.0.0/16
echo.
echo # Frontend Configuration - Network Access
echo VITE_API_BASE_URL=http://%NETWORK_IP%:8090
echo VITE_WEBSOCKET_URL=ws://%NETWORK_IP%:3001
echo VITE_APP_NAME=QuizUP
echo VITE_APP_VERSION=1.0.0
echo VITE_NODE_ENV=development
echo.
echo # HMR Configuration
echo VITE_CLOUDFLARE_HOSTED=false
echo VITE_USE_PRODUCTION_HMR=false
echo.
echo # Scaling Configuration for 4000 Users
echo MIN_WORKERS=2
echo MAX_WORKERS=8
echo MAX_MATCHES=3
echo WORKER_IDLE_TIMEOUT=300000
echo.
echo # Database Pool
echo DB_POOL_MIN=5
echo DB_POOL_MAX=20
echo DB_POOL_ACQUIRE_TIMEOUT=60000
echo DB_POOL_IDLE_TIMEOUT=10000
echo.
echo # Redis Pool
echo REDIS_POOL_MIN=5
echo REDIS_POOL_MAX=20
echo.
echo # Rate Limiting
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=1000
echo.
echo # Performance
echo LOG_LEVEL=warn
echo ENABLE_QUERY_LOGGING=false
echo ENABLE_DEBUG_ROUTES=false
echo SEED_DATABASE=false
echo.
echo # Admin Tools
echo ADMINER_PORT=8080
echo ENABLE_SWAGGER=false
echo.
echo # Container Configuration
echo COMPOSE_PROJECT_NAME=quizup
echo COMPOSE_FILE=docker-compose.yml
echo RESTART_POLICY=unless-stopped
) > .env

REM Create frontend environment
echo 📝 Creating frontend network configuration...
(
echo # Frontend Network Configuration - AUTO-GENERATED
echo # Generated on %date% at %time%
echo.
echo VITE_NODE_ENV=development
echo.
echo # API Configuration - Network Access
echo VITE_API_BASE_URL=http://%NETWORK_IP%:8090
echo VITE_WEBSOCKET_URL=ws://%NETWORK_IP%:3001
echo.
echo # App Configuration
echo VITE_APP_NAME=QuizUP
echo VITE_APP_VERSION=1.0.0
echo.
echo # HMR Configuration - Network
echo VITE_CLOUDFLARE_HOSTED=false
echo VITE_USE_PRODUCTION_HMR=false
echo VITE_NETWORK_MODE=true
echo VITE_NETWORK_IP=%NETWORK_IP%
) > Frontend-admin\.env

echo ✅ Configuration files created successfully!
echo.

REM Display access information
echo 🌐 Network Access Information:
echo ================================
echo.
echo 📱 Access from your computer:
echo    Frontend: http://localhost:5173
echo    API:      http://localhost:8090
echo.
echo 📱 Access from other devices on your network:
echo    Frontend: http://%NETWORK_IP%:5173
echo    API:      http://%NETWORK_IP%:8090
echo.
echo 🔧 Next Steps:
echo    1. Make sure Windows Firewall allows ports 5173, 8090, 3001
echo    2. Run: docker-compose up -d
echo    3. For 4000 users: docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
echo    4. Test from another device: http://%NETWORK_IP%:5173
echo.

REM Ask if user wants to start services
set /p START_SERVICES="🚀 Start services now? (y/n): "
if /i "%START_SERVICES%"=="y" (
    echo.
    echo 🔄 Starting services...
    docker-compose up -d
    echo.
    echo ✅ Services started! 
    echo 📊 Check status: docker ps
    echo 🌐 Access at: http://%NETWORK_IP%:5173
) else (
    echo.
    echo 💡 To start services later, run:
    echo    docker-compose up -d
    echo.
    echo 💡 For high-scale deployment (4000 users), run:
    echo    docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
)

echo.
echo 🎉 Network setup complete!
pause
