@echo off
title IP Locator Runner
echo ===================================================
echo Starting Geolocation Project dev servers...
echo Opening application in default browser...
echo ===================================================
start http://localhost:5173
call npm run dev
pause
