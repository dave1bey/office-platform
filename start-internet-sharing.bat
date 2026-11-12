@echo off
cd /d "%~dp0"
title Real-Time Attendance - Internet Sharing (Zero Cost)
echo ========================================================
echo   ZERO-COST INTERNET SHARING - SHARE ACROSS ANY ISP
echo ========================================================
echo.
echo Starting secure public HTTPS link for your app...
echo (NO GitHub needed, NO passwords, 100%% Free)
echo.
echo Connecting to tunnel...
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8091 nokey@localhost.run
pause

