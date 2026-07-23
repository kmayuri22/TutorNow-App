@echo off
title TutorNow Runner
echo ============================================================
echo                TutorNow Server Launcher
echo ============================================================
echo.

:: 1. Start Backend FastAPI Server (Host on 0.0.0.0 so other devices on Wi-Fi can connect)
echo [1/3] Launching FastAPI Backend Server...
start "TutorNow Backend Server" cmd /k "cd backend && call venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: 2. Start Frontend Next.js Server (Host on 0.0.0.0)
echo [2/3] Launching Next.js Frontend Server...
start "TutorNow Frontend Server" cmd /k "cd frontend && npx next dev -H 0.0.0.0"

:: 3. Wait and Launch Browser
echo [3/3] Waiting for servers to initialize...
timeout /t 5 >nul

echo.
echo Launching TutorNow application in your default browser...
start http://localhost:3000

echo.
echo ============================================================
echo TutorNow is now running!
echo - Keep both command prompt windows open to keep the servers active.
echo - To stop, simply close the backend and frontend terminal windows.
echo ============================================================
echo.
pause
