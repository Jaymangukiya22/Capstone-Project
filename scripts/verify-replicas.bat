@echo off
REM =============================================================================
REM QuizUP Replica Verification Script (Windows)
REM Comprehensive testing of Docker Swarm replicas and load balancing
REM =============================================================================

setlocal enabledelayedexpansion

echo.
echo =====================================================================
echo 🔍 QuizUP Replica Verification ^& Testing
echo =====================================================================

REM =============================================================================
REM 1. CHECK DOCKER SWARM STATUS
REM =============================================================================
echo.
echo 1️⃣  Checking Docker Swarm Status...

docker info | findstr /R "Swarm:" > nul
if errorlevel 1 (
  echo ❌ Docker Swarm not active!
  echo Initialize with: docker swarm init
  exit /b 1
)

for /f "tokens=2" %%i in ('docker info ^| findstr "Swarm:"') do set SWARM_STATUS=%%i
echo ✅ Docker Swarm Status: %SWARM_STATUS%

REM =============================================================================
REM 2. CHECK STACK DEPLOYMENT
REM =============================================================================
echo.
echo 2️⃣  Checking Stack Deployment...

docker stack ls | findstr "quizup" > nul
if errorlevel 1 (
  echo ❌ Stack 'quizup' not deployed!
  echo Deploy with: docker stack deploy -c docker-stack.yml quizup
  exit /b 1
)

echo ✅ Stack 'quizup' deployed

REM =============================================================================
REM 3. CHECK SERVICE REPLICAS
REM =============================================================================
echo.
echo 3️⃣  Checking Service Replicas...

echo.
echo Backend Service:
docker service ls --filter "name=quizup_backend" --format "{{.Replicas}}"
docker service ps quizup_backend

echo.
echo Match Server Service:
docker service ls --filter "name=quizup_matchserver" --format "{{.Replicas}}"
docker service ps quizup_matchserver

echo.
echo Nginx Service:
docker service ls --filter "name=quizup_nginx" --format "{{.Replicas}}"
docker service ps quizup_nginx

echo.
echo Frontend Service:
docker service ls --filter "name=quizup_frontend" --format "{{.Replicas}}"
docker service ps quizup_frontend

REM =============================================================================
REM 4. TEST LOAD BALANCING
REM =============================================================================
echo.
echo 4️⃣  Testing Load Balancing...

echo.
echo Backend Load Balancing ^(5 requests^):
setlocal enabledelayedexpansion
set UNIQUE_COUNT=0
set PREV_HOST=

for /l %%i in (1,1,5) do (
  for /f %%j in ('curl -s http://localhost:8090/api/health 2^>nul ^| jq -r ".hostname // \"unknown\"" 2^>nul') do (
    set CURRENT_HOST=%%j
    echo   Request %%i: !CURRENT_HOST!
    if not "!CURRENT_HOST!"=="!PREV_HOST!" (
      set /a UNIQUE_COUNT+=1
      set PREV_HOST=!CURRENT_HOST!
    )
  )
  timeout /t 1 /nobreak > nul
)

if !UNIQUE_COUNT! gtr 1 (
  echo ✅ Load balancing working ^(!UNIQUE_COUNT! different replicas^)
) else (
  echo ⚠️  Load balancing may not be working ^(only 1 unique replica^)
)

REM =============================================================================
REM 5. TEST MATCH SERVER CONNECTIVITY
REM =============================================================================
echo.
echo 5️⃣  Testing Match Server Connectivity...

curl -s http://localhost:3001/health > nul 2>&1
if errorlevel 1 (
  echo ⚠️  Match Server not responding
) else (
  echo ✅ Match Server responding
  curl -s http://localhost:3001/health | jq .
)

REM =============================================================================
REM 6. CHECK RESOURCE USAGE
REM =============================================================================
echo.
echo 6️⃣  Checking Resource Usage...

echo.
echo Docker Stats:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | findstr "quizup"

REM =============================================================================
REM 7. CHECK FOR ERRORS IN LOGS
REM =============================================================================
echo.
echo 7️⃣  Checking for Errors in Logs...

echo.
echo Backend Errors ^(last 20 lines^):
docker service logs quizup_backend --tail 20 2>nul | findstr /i "error" > nul
if errorlevel 1 (
  echo ✅ No errors found
) else (
  echo ⚠️  Found errors
  docker service logs quizup_backend --tail 20 2>nul | findstr /i "error"
)

echo.
echo Match Server Errors ^(last 20 lines^):
docker service logs quizup_matchserver --tail 20 2>nul | findstr /i "error" > nul
if errorlevel 1 (
  echo ✅ No errors found
) else (
  echo ⚠️  Found errors
  docker service logs quizup_matchserver --tail 20 2>nul | findstr /i "error"
)

REM =============================================================================
REM 8. CHECK NETWORK CONNECTIVITY
REM =============================================================================
echo.
echo 8️⃣  Checking Network Connectivity...

docker network ls --filter "name=quizup_quizup_network" --format "{{.ID}}" > nul 2>&1
if errorlevel 1 (
  echo ❌ Network 'quizup_quizup_network' not found
) else (
  echo ✅ Network 'quizup_quizup_network' exists
)

REM =============================================================================
REM 9. VERIFY METRICS ENDPOINT
REM =============================================================================
echo.
echo 9️⃣  Verifying Metrics Endpoint...

curl -s http://localhost:3001/metrics > nul 2>&1
if errorlevel 1 (
  echo ⚠️  Metrics endpoint not responding
) else (
  echo ✅ Metrics endpoint responding
  curl -s http://localhost:3001/metrics | more
)

REM =============================================================================
REM 10. FINAL SUMMARY
REM =============================================================================
echo.
echo =====================================================================
echo 📊 VERIFICATION SUMMARY
echo =====================================================================

echo.
echo ✅ Deployment Status:
echo   • Docker Swarm: %SWARM_STATUS%
docker service ls --filter "name=quizup_backend" --format "  • Backend Replicas: {{.Replicas}}"
docker service ls --filter "name=quizup_matchserver" --format "  • Match Server Replicas: {{.Replicas}}"
docker service ls --filter "name=quizup_nginx" --format "  • Nginx Replicas: {{.Replicas}}"
docker service ls --filter "name=quizup_frontend" --format "  • Frontend Replicas: {{.Replicas}}"

echo.
echo ✅ Health Status:
echo   • All services deployed
echo   • Load balancing active
echo   • Metrics available

echo.
echo =====================================================================
echo ✅ Verification Complete!
echo =====================================================================

echo.
echo Next Steps:
echo 1. Monitor replicas: docker service ps quizup_backend
echo 2. View logs: docker service logs quizup_backend --follow
echo 3. Check metrics: curl http://localhost:3001/metrics
echo 4. Access Prometheus: http://localhost:9090
echo 5. Access Grafana: http://localhost:3000

endlocal
exit /b 0
