@echo off
title DataLume AI Backend
echo ===================================================
echo   Starting DataLume AI Backend on Port 8000
echo ===================================================
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    echo Starting server with virtual environment Python...
    call ".venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
) else if exist "backend\.venv\Scripts\python.exe" (
    echo Starting server with backend virtual environment...
    call "backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
) else (
    echo Starting server with system Python...
    call python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend failed to start or exited with an error.
)
pause
