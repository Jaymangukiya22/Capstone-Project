@echo off
REM =============================================================================
REM QuizUP Multi-Host Deployment Script (Windows)
REM Supports: localhost, self-hosted (Cloudflare Tunnel)
REM Usage: deploy.bat [localhost|self-hosted]
REM =============================================================================

setlocal enabledelayedexpansion

REM Colors (using text for Windows)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM =============================================================================
REM FUNCTIONS
REM =============================================================================

:print_header
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ %~1
echo ╚════════════════════════════════════════════════════════════════╝
echo.
exit /b 0

:print_success
echo [92m✅ %~1[0m
exit /b 0

:print_error
echo [91m❌ %~1[0m
exit /b 0

:print_info
echo [93mℹ️  %~1[0m
exit /b 0

:setup_localhost
call :print_header "🚀 LOCALHOST DEPLOYMENT"

call :print_info "Setting up localhost environment..."
copy .env.localhost .env >nul 2>&1
copy backend\.env.localhost backend\.env >nul 2>&1
copy Frontend-admin\.env.localhost Frontend-admin\.env >nul 2>&1

call :print_success "Environment files copied"

call :print_info "Building Docker images..."
docker-compose build --no-cache
if %errorlevel% neq 0 (
    call :print_error "Docker build failed"
    exit /b 1
)

call :print_success "Docker images built"

call :print_info "Starting services..."
docker-compose up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start services"
    exit /b 1
)

call :print_success "Services started"

call :print_info "Waiting for services to be healthy..."
timeout /t 10 /nobreak >nul

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ✅ LOCALHOST DEPLOYMENT COMPLETE
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📍 Access Points:
echo    Frontend: http://localhost:5173
echo    API: http://localhost:3000
echo    Match Server: http://localhost:3001
echo    Nginx Proxy: http://localhost:8090
echo.
exit /b 0

:setup_self_hosted
call :print_header "☁️  SELF-HOSTED DEPLOYMENT (Cloudflare Tunnel)"

call :print_info "Setting up self-hosted environment..."
copy .env.self-hosted .env >nul 2>&1
copy backend\.env.self-hosted backend\.env >nul 2>&1
copy Frontend-admin\.env.self-hosted Frontend-admin\.env >nul 2>&1

call :print_success "Environment files copied"

call :print_info "Initializing Docker Swarm..."
docker swarm init >nul 2>&1
call :print_success "Docker Swarm ready"

call :print_info "Building production images..."
docker build -f backend/Dockerfile -t quizup-backend:latest ./backend
docker build -f backend/Dockerfile --target matchserver-master -t quizup-matchserver:latest ./backend
docker build -f Frontend-admin/Dockerfile --target production -t quizup-frontend:latest ./Frontend-admin

call :print_success "Production images built"

call :print_info "Deploying stack..."
docker stack deploy -c docker-compose.yml quizup
if %errorlevel% neq 0 (
    call :print_error "Failed to deploy stack"
    exit /b 1
)

call :print_success "Stack deployed"

call :print_info "Waiting for services to be ready..."
timeout /t 15 /nobreak >nul

echo.
docker stack services quizup
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║ ✅ SELF-HOSTED DEPLOYMENT COMPLETE
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📍 Access Points (via Cloudflare Tunnel):
echo    Frontend: https://quizdash.dpdns.org
echo    API: https://api.quizdash.dpdns.org
echo    Match Server: wss://match.quizdash.dpdns.org
echo.
echo 🔧 Next Steps:
echo    1. Start Cloudflare tunnel: cloudflared tunnel run 260b3937-da0e-4802-bd8b-219e47806139
echo    2. Monitor services: docker service logs -f quizup_backend
echo    3. Check status: docker stack services quizup
echo.
exit /b 0

:show_usage
echo Usage: %0 [localhost^|self-hosted]
echo.
echo Modes:
echo   localhost    - Deploy on single machine (http://localhost:5173)
echo   self-hosted  - Deploy with Cloudflare Tunnel (https://quizdash.dpdns.org)
echo.
echo Examples:
echo   %0 localhost
echo   %0 self-hosted
echo.
exit /b 0

REM =============================================================================
REM MAIN
REM =============================================================================

if "%~1"=="" (
    call :print_error "No deployment mode specified"
    echo.
    call :show_usage
    exit /b 1
)

set MODE=%~1

if /i "%MODE%"=="localhost" (
    call :setup_localhost
    exit /b !errorlevel!
) else if /i "%MODE%"=="self-hosted" (
    call :setup_self_hosted
    exit /b !errorlevel!
) else (
    call :print_error "Unknown deployment mode: %MODE%"
    echo.
    call :show_usage
    exit /b 1
)
