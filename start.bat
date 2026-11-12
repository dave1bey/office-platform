@echo off
cd /d "%~dp0"
title Real-Time Attendance & Performance Platform
echo ========================================================
echo  Real-Time Attendance, Action Plan & Performance Platform
echo ========================================================
echo.
echo Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not found on your system PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting server and launching browser...
echo.
node backend\server.cjs
echo.
echo Server has stopped.
pause
