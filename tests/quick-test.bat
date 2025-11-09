@echo off
echo ================================================================
echo Quick Stress Test (10 Matches = 20 Players)
echo ================================================================
echo.
echo This is a quick test to verify everything is working.
echo Full test (2000 matches) takes ~60-90 minutes.
echo.
timeout /t 3 /nobreak

node stress-test-matches.js 10

echo.
echo ================================================================
echo Quick test completed!
echo ================================================================
echo.
pause
