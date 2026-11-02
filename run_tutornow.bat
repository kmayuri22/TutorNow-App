@echo off
setlocal enabledelayedexpansion
title TutorNow Unified App Launcher
cls
color 0b

echo =====================================================================
echo                     TUTORNOW APP LAUNCHER
echo =====================================================================
echo.

set "SCRIPT_DIR=%~dp0"

:: 1. Start Backend FastAPI Server
echo  [1/3] Starting Backend (FastAPI on Port 8000)...
start "TutorNow Backend Server" cmd /k "title TutorNow Backend ^& cd /d \"%SCRIPT_DIR%backend\" ^& if exist venv\Scripts\python.exe (venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) else (python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload)"

:: 2. Start Frontend Next.js Server using npm.cmd
echo  [2/3] Starting Frontend (Next.js on Port 3000)...
start "TutorNow Frontend Server" cmd /k "title TutorNow Frontend ^& cd /d \"%SCRIPT_DIR%frontend\" ^& call npm.cmd run dev"

:: 3. Detect Local IP Address for mobile
set "LOCAL_IP=localhost"
for /f "tokens=4" %%a in ('route print 2^>nul ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0 "') do set LOCAL_IP=%%a

echo.
echo  [3/3] Waiting for Next.js to finish compiling (this takes ~15-20s)...
powershell -Command "for ($i=0; $i -lt 40; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { break } } catch {}; Start-Sleep -Seconds 1 }"

echo.
echo  Opening browser now...
start http://localhost:3000

cls
echo =====================================================================
echo                     TUTORNOW IS READY!
echo =====================================================================
echo.
echo   * PC Browser:      http://localhost:3000
echo   * Backend Docs:    http://localhost:8000/docs
if not "%LOCAL_IP%"=="localhost" (
echo   * Mobile Browser:  http://%LOCAL_IP%:3000
)
echo.
echo =====================================================================
echo   Both Frontend and Backend are active and ready.
echo   Keep the command prompt windows open while working.
echo =====================================================================
echo.
pause
