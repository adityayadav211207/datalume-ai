@echo off
title DataLume AI Backend
echo ===================================================
echo   Starting DataLume AI Backend on Port 8000
echo ===================================================
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    echo Starting server with virtual environment...
    ".venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
) else (
    echo Starting server with system Python...
    python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
)
pause
+