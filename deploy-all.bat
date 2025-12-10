@echo off
REM =============================================================================
REM QuizUP Complete Deployment Script (Windows)
REM Deploys and tests all three environments: localhost, network, and production
REM =============================================================================

setlocal enabledelayedexpansion

:MENU
cls
echo ╔════════════════════════════════════════╗
echo ║   QuizUP Deployment Manager            ║
echo ╚════════════════════════════════════════╝
echo.
echo 1. Deploy Localhost Environment
echo 2. Deploy Network Environment
echo 3. Deploy Production Environment
echo 4. Deploy All Environments
echo 5. Run Tests (Localhost)
echo 6. Run Tests (Network)
echo 7. Run Tests (Production/Hosted)
echo 8. Run Tests (All Environments)
echo 9. Check Service Status
echo 10. View Logs
echo 11. Stop All Services
echo 0. Exit
echo.

set /p choice="Enter your choice: "

if "%choice%"=="1" goto DEPLOY_LOCALHOST
if "%choice%"=="2" goto DEPLOY_NETWORK
if "%choice%"=="3" goto DEPLOY_PRODUCTION
if "%choice%"=="4" goto DEPLOY_ALL
if "%choice%"=="5" goto TEST_LOCALHOST
if "%choice%"=="6" goto TEST_NETWORK
if "%choice%"=="7" goto TEST_HOSTED
if "%choice%"=="8" goto TEST_ALL
if "%choice%"=="9" goto CHECK_STATUS
if "%choice%"=="10" goto VIEW_LOGS
if "%choice%"=="11" goto STOP_ALL
if "%choice%"=="0" goto EXIT

echo Invalid choice!
pause
goto MENU

:DEPLOY_LOCALHOST
echo.
echo ========================================
echo Deploying Localhost Environment
echo ========================================
echo.

echo Building Docker images...
docker-compose build

echo Starting services...
docker-compose up -d

echo Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo Checking service health...
curl -f http://localhost:3000/api/health > nul 2>&1
if %errorlevel%==0 (
    echo ✅ Backend is healthy
) else (
    echo ❌ Backend health check failed
)

curl -f http://localhost:3001/health > nul 2>&1
if %errorlevel%==0 (
    echo ✅ Match server is healthy
) else (
    echo ❌ Match server health check failed
)

echo.
echo ✅ Localhost deployment complete!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3000
echo Match Server: http://localhost:3001
echo.
pause
goto MENU

:DEPLOY_NETWORK
echo.
echo ========================================
echo Deploying Network Environment
echo ========================================
echo.

REM Get network IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set NETWORK_IP=%%a
    set NETWORK_IP=!NETWORK_IP:~1!
    goto :FOUND_IP
)
:FOUND_IP

echo Using network IP: %NETWORK_IP%
echo NETWORK_IP=%NETWORK_IP% > .env.network

echo Starting services with network configuration...
docker-compose -f docker-compose.yml -f docker-compose.network.yml up -d

echo Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo ✅ Network deployment complete!
echo Frontend: http://%NETWORK_IP%:5173
echo Backend: http://%NETWORK_IP%:3000
echo Match Server: http://%NETWORK_IP%:3001
echo.
pause
goto MENU

:DEPLOY_PRODUCTION
echo.
echo ========================================
echo Deploying Production Environment
echo ========================================
echo.

echo Initializing Docker Swarm...
docker swarm init 2>nul
if %errorlevel%==0 (
    echo ✅ Docker Swarm initialized
) else (
    echo ℹ️  Docker Swarm already initialized
)

echo Creating Docker secrets...
echo 7a0b42e9df5856f7cfe0094361f65630 | docker secret create quizup_jwt_secret - 2>nul
echo quizup_password | docker secret create quizup_db_password - 2>nul

echo Creating Prometheus config...
(
echo global:
echo   scrape_interval: 15s
echo   evaluation_interval: 15s
echo.
echo scrape_configs:
echo   - job_name: 'backend'
echo     static_configs:
echo       - targets: ['backend:3000']
echo   - job_name: 'matchserver'
echo     static_configs:
echo       - targets: ['matchserver:3001']
) > prometheus.yml

docker config create quizup_prometheus_config prometheus.yml 2>nul

echo Building production images...
docker build -t quizup-backend:latest ./backend
docker build -t quizup-matchserver:latest ./backend
docker build -t quizup-frontend:latest ./Frontend-admin

echo Deploying stack...
docker stack deploy -c docker-stack.yml quizup

echo Waiting for services to be ready...
timeout /t 20 /nobreak > nul

echo Checking service status...
docker stack services quizup

echo.
echo ✅ Production deployment complete!
echo Check status with: docker stack services quizup
echo View logs with: docker service logs quizup_backend
echo.
pause
goto MENU

:DEPLOY_ALL
call :DEPLOY_LOCALHOST
call :DEPLOY_NETWORK
call :DEPLOY_PRODUCTION
goto MENU

:TEST_LOCALHOST
echo.
echo ========================================
echo Running Localhost Tests
echo ========================================
echo.

cd tests
if not exist node_modules (
    echo Installing test dependencies...
    call npm install
)

call npm run run:localhost
cd ..

pause
goto MENU

:TEST_NETWORK
echo.
echo ========================================
echo Running Network Tests
echo ========================================
echo.

cd tests
if not exist node_modules (
    echo Installing test dependencies...
    call npm install
)

call npm run run:network
cd ..

pause
goto MENU

:TEST_HOSTED
echo.
echo ========================================
echo Running Hosted Tests
echo ========================================
echo.

cd tests
if not exist node_modules (
    echo Installing test dependencies...
    call npm install
)

call npm run run:hosted
cd ..

pause
goto MENU

:TEST_ALL
echo.
echo ========================================
echo Running All Tests
echo ========================================
echo.

cd tests
if not exist node_modules (
    echo Installing test dependencies...
    call npm install
)

call npm run run:all
cd ..

pause
goto MENU

:CHECK_STATUS
echo.
echo ========================================
echo Service Status
echo ========================================
echo.

echo Docker Compose Services:
docker-compose ps

echo.
echo Docker Stack Services:
docker stack services quizup 2>nul

echo.
echo Docker Stats:
docker stats --no-stream

pause
goto MENU

:VIEW_LOGS
echo.
echo ========================================
echo Service Logs
echo ========================================
echo.
echo 1. Backend logs (docker-compose)
echo 2. Match server logs (docker-compose)
echo 3. Backend logs (swarm)
echo 4. Match server logs (swarm)
echo 5. All logs (docker-compose)
echo.

set /p log_choice="Select log to view: "

if "%log_choice%"=="1" docker-compose logs -f backend
if "%log_choice%"=="2" docker-compose logs -f matchserver
if "%log_choice%"=="3" docker service logs -f quizup_backend
if "%log_choice%"=="4" docker service logs -f quizup_matchserver
if "%log_choice%"=="5" docker-compose logs -f

goto MENU

:STOP_ALL
echo.
echo ========================================
echo Stopping All Services
echo ========================================
echo.

echo Stopping docker-compose services...
docker-compose down

echo Removing Docker stack...
docker stack rm quizup 2>nul

echo.
echo ✅ All services stopped
echo.
pause
goto MENU

:EXIT
echo.
echo Exiting...
exit /b 0
