@echo off
echo ================================================================
echo QuizDash Stress Test Setup
echo ================================================================
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Installing Playwright browsers...
call npx playwright install chromium
if errorlevel 1 (
    echo ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)
echo.

echo Step 3: Seeding 2000 test users...
call node seed-users.js
if errorlevel 1 (
    echo ERROR: Failed to seed users
    pause
    exit /b 1
)
echo.

echo ================================================================
echo Setup Complete!
echo ================================================================
echo.
echo You can now run stress tests:
echo   - Small:  npm run stress:small  (10 matches)
echo   - Medium: npm run stress:medium (100 matches)
echo   - Large:  npm run stress:large  (500 matches)
echo   - Full:   npm run stress:full   (2000 matches)
echo.
echo Monitor in real-time:
echo   - npm run monitor
echo.
pause
