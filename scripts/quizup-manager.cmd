@echo off
setlocal enabledelayedexpansion

:MAIN_MENU
cls
echo ============================================
echo           QuizUP Management Console
echo ============================================
echo.
echo 1. Start All Services (Full Stack)
echo 2. Stop All Services
echo 3. Setup Cloudflare Tunnel (First Time)
echo 4. Create DNS Records
echo 5. Troubleshoot Services
echo 6. View Service Status
echo 7. Clean Restart Everything
echo 8. View Logs
echo 9. Exit
echo.
set /p choice="Select an option (1-9): "

if "%choice%"=="1" goto START_SERVICES
if "%choice%"=="2" goto STOP_SERVICES
if "%choice%"=="3" goto SETUP_TUNNEL
if "%choice%"=="4" goto CREATE_DNS
if "%choice%"=="5" goto TROUBLESHOOT
if "%choice%"=="6" goto VIEW_STATUS
if "%choice%"=="7" goto CLEAN_RESTART
if "%choice%"=="8" goto VIEW_LOGS
if "%choice%"=="9" goto EXIT
goto MAIN_MENU

:START_SERVICES
echo ============================================
echo           Starting All Services
echo ============================================
echo [1/3] Starting Docker services...
docker-compose up -d

echo [2/3] Waiting for services to initialize...
timeout /t 15 /nobreak > nul

echo [3/3] Starting Cloudflare Tunnel...
echo.
echo Services available at:
echo - https://quizdash.dpdns.org (Frontend)
echo - https://api.quizdash.dpdns.org (Backend API)
echo - https://match.quizdash.dpdns.org (Match Server)
echo - https://grafana.quizdash.dpdns.org (Grafana)
echo - https://adminer.quizdash.dpdns.org (Database)
echo - https://prometheus.quizdash.dpdns.org (Monitoring)
echo - https://redis.quizdash.dpdns.org (Redis)
echo.
echo Starting tunnel... (Press Ctrl+C to stop)
cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
goto MAIN_MENU

:STOP_SERVICES
echo ============================================
echo           Stopping All Services
echo ============================================
echo Stopping Docker services...
docker-compose down
echo Stopping Cloudflare tunnel...
taskkill /f /im cloudflared.exe 2>nul
echo All services stopped.
pause
goto MAIN_MENU

:SETUP_TUNNEL
echo ============================================
echo         First Time Tunnel Setup
echo ============================================
echo Creating .cloudflared directory...
if not exist "Users/jay/.cloudflared" mkdir "Users/jay/.cloudflared"

echo Copying configuration files...
copy config-local.yml "Users/jay/.cloudflared/config.yml"
@REM copy 260b3937-da0e-4802-bd8b-219e47806139.json "C:\Users\Aryan\.cloudflared\"

echo Setup complete! Now run option 4 to create DNS records.
pause
goto MAIN_MENU

:CREATE_DNS
echo ============================================
echo           Creating DNS Records
echo ============================================
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 api.quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 match.quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 grafana.quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 adminer.quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 prometheus.quizdash.dpdns.org
@REM cloudflared tunnel route dns 260b3937-da0e-4802-bd8b-219e47806139 redis.quizdash.dpdns.org
echo DNS records created successfully!
pause
goto MAIN_MENU

:TROUBLESHOOT
echo ============================================
echo              Troubleshooting
echo ============================================
echo Docker containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo Port usage:
netstat -an | findstr ":3000\|:3001\|:5173\|:8080\|:9090\|:8081\|:3003"
echo.
echo Testing endpoints:
curl -s http://localhost:3000/health || echo "Backend not responding"
echo.
pause
goto MAIN_MENU

:VIEW_STATUS
echo ============================================
echo              Service Status
echo ============================================
echo Docker Services:
docker-compose ps
echo.
echo Cloudflare Tunnel:
tasklist /fi "imagename eq cloudflared.exe" /fo table 2>nul || echo "Tunnel not running"
echo.
pause
goto MAIN_MENU

:CLEAN_RESTART
echo ============================================
echo            Clean Restart
echo ============================================
echo Stopping everything...
docker-compose down
taskkill /f /im cloudflared.exe 2>nul
echo Cleaning up...
docker system prune -f
echo Restarting...
goto START_SERVICES

:VIEW_LOGS
echo ============================================
echo               View Logs
echo ============================================
echo 1. Backend logs
echo 2. Database logs
echo 3. All Docker logs
echo 4. Back to main menu
set /p log_choice="Select log type (1-4): "
if "%log_choice%"=="1" docker-compose logs backend --tail=50
if "%log_choice%"=="2" docker-compose logs postgres --tail=50
if "%log_choice%"=="3" docker-compose logs --tail=20
if "%log_choice%"=="4" goto MAIN_MENU
pause
goto MAIN_MENU

:EXIT
echo Goodbye!
exit /b 0
