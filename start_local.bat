@echo off
title Crop Growth Monitoring - Local Runner (No Docker)
color 0A
echo =====================================================================
echo  Crop Growth Monitoring System Using Image Processing Technology V2
echo  [Local Launching Mode - Powered by SQLite Database]
echo =====================================================================
echo.
echo 1. Launching FastAPI Python backend service...
start "Backend - FastAPI" cmd /k "cd backend && python -m uvicorn app.main:app --reload"

echo 2. Launching React Vite frontend interface...
start "Frontend - Vite" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  Servers are starting in separate windows.
echo  Please visit the Local URL displayed in the Frontend console.
echo  To close the application, simply close the active terminals.
echo =====================================================================
echo.
pause
