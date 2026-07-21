@echo off
title Crop Growth Monitoring - Docker Orchestrator
color 0A
echo =====================================================================
echo  Crop Growth Monitoring System Using Image Processing Technology V2
echo  [Containerized Launching Mode - Powered by Docker Compose]
echo =====================================================================
echo.
echo Make sure Docker Desktop is open and active.
echo Starting Docker containers (Frontend + Backend + MySQL Database)...
echo.
docker-compose up --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Docker command failed. Please verify that Docker Desktop is running.
    pause
)
