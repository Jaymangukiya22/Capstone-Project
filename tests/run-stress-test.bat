@echo off
REM QuizDash Stress Test Launcher
REM Usage: run-stress-test.bat <matches>

echo.
echo ================================================================================
echo   QuizDash Ultimate Stress Test Launcher
echo ================================================================================
echo.

if "%1"=="" (
    echo Usage: run-stress-test.bat ^<matches^>
    echo.
    echo Supported match counts:
    echo   10   - Quick validation ^(2-3 min^)
    echo   15   - Small load test ^(3-4 min^)
    echo   20   - Medium load test ^(4-5 min^)
    echo   30   - Standard test ^(6-8 min^)
    echo   50   - High load test ^(10-12 min^)
    echo   100  - Stress test ^(20-25 min^)
    echo   200  - Heavy stress test ^(40-50 min^)
    echo   500  - Extreme load test ^(90-120 min^)
    echo   1000 - Maximum capacity test ^(3-4 hours^)
    echo   2000 - REQUIRES 4000 USERS ^(6-8 hours^)
    echo.
    echo Examples:
    echo   run-stress-test.bat 30
    echo   run-stress-test.bat 100
    echo.
    goto :end
)

set MATCHES=%1

echo Starting stress test with %MATCHES% matches...
echo.
echo TIP: Open another terminal and run 'node resource-monitor.js' for live monitoring
echo.
echo Press Ctrl+C to stop the test at any time.
echo Metrics will be saved automatically.
echo.

timeout /t 3 /nobreak >nul

node stress-test-ultimate.js %MATCHES%

echo.
echo ================================================================================
echo Test complete! Check the following files:
echo   - stress-test-metrics-*.json (detailed results)
echo   - resource-metrics.jsonl (time-series data)
echo ================================================================================
echo.

:end
