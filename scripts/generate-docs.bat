@echo off
REM QuizUP Documentation Generation Script for Windows
REM This script generates comprehensive documentation for both Frontend and Backend projects

echo 🚀 Starting QuizUP Documentation Generation...
echo ==============================================

echo.
echo 📚 Generating Backend Documentation...
cd /d "%~dp0backend"
if not exist package.json (
    echo ❌ Error: Not in backend directory
    exit /b 1
)

echo Installing dependencies...
call npm install --silent

echo Generating TypeDoc documentation...
call npm run docs:typedoc
if %errorlevel% neq 0 (
    echo ❌ Backend TypeDoc generation failed
    exit /b 1
)

echo ✅ Backend documentation generated successfully!

echo.
echo 📱 Generating Frontend Documentation...
cd /d "%~dp0Frontend-admin"
if not exist package.json (
    echo ❌ Error: Not in Frontend-admin directory
    exit /b 1
)

echo Installing dependencies...
call npm install --silent

echo Generating TypeDoc documentation...
call npm run docs:typedoc
if %errorlevel% neq 0 (
    echo ❌ Frontend TypeDoc generation failed
    exit /b 1
)

echo ✅ Frontend documentation generated successfully!

echo.
echo 📊 Documentation Generation Complete!
echo =====================================
echo.
echo 🌐 Access your documentation:
echo   📱 Frontend TypeDoc: Frontend-admin\docs\typedoc\index.html
echo   ⚙️  Backend TypeDoc:  backend\docs\api\index.html
echo   📋 Storybook:        Frontend-admin\storybook-static\index.html
echo   🔗 API Docs:         http://localhost:3000/api-docs (when backend is running)
echo.
echo 🚀 To serve documentation:
echo   Frontend: cd Frontend-admin ^&^& npm run docs:serve
echo   Backend:  cd backend ^&^& npm run docs:serve
echo   Storybook: cd Frontend-admin ^&^& npm run storybook
echo.
echo ✨ Documentation generation completed successfully!
pause
