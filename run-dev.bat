@echo off
title NETSPECTRE - Development Server
cd /d "%~dp0"
echo ========================================================
echo   Starting NETSPECTRE Vite Web App
echo ========================================================
echo.
call npm.cmd run dev
pause
