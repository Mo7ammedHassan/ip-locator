@echo off
title IP Locator Setup
echo ===================================================
echo Installing project dependencies (Root, Backend, Frontend)...
echo ===================================================
call npm run setup
echo ===================================================
echo Done installing dependencies!
echo You can now close this window and double-click "run.bat" to start the app.
echo ===================================================
pause
