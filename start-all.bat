@echo off
title DataLume AI Launcher
echo ===================================================
echo   Starting DataLume AI (Backend + Frontend)
echo ===================================================
cd /d "%~dp0"

echo [1/2] Launching Backend on Port 8000...
start "DataLume Backend" run-backend.bat

echo [2/2] Launching Frontend on Port 5173...
start "DataLume Frontend" run-frontend.bat

echo.
echo ===================================================
echo   Both servers launched successfully!
echo   Open http://localhost:5173 in your browser
echo ===================================================
timeout /t 5
