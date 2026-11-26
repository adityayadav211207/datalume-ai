@echo off
title DataLume AI Frontend
echo ===================================================
echo   Starting DataLume AI Frontend on Port 5173
echo ===================================================
cd /d "%~dp0"
call npm.cmd run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend failed to start!
    echo Trying npx vite...
    call npx.cmd vite
)
pause
