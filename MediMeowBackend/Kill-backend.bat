@echo off
echo Terminating all backend processes (Python, Uvicorn, FastAPI related)...

REM Kill all Python processes
taskkill /f /im python.exe /t >nul 2>&1

REM Kill any Uvicorn processes if running as separate executable
taskkill /f /im uvicorn.exe /t >nul 2>&1

REM Kill any FastAPI related processes (usually run under Python)
taskkill /f /im fastapi.exe /t >nul 2>&1

echo All backend processes have been terminated.
pause