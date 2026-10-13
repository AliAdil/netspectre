@echo off
title NETSPECTRE - Full Build
cd /d "%~dp0"
echo ========================================================
echo   Building NETSPECTRE Native Engine and UI
echo ========================================================
echo.
call npm.cmd run build
echo.
echo Build complete!
pause
