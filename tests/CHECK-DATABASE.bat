@echo off
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🔍 CHECKING DATABASE FOR FRIEND MATCHES                    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

node check-database-matches.js

echo.
echo ✨ Check complete!
echo.
pause
