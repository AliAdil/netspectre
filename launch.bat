@echo off
title NETSPECTRE Launcher
echo ========================================================
echo   NETSPECTRE - Launching Desktop Surveillance Suite
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Native Telemetry Engine...
if not exist "src-engine\NetSpectreEngine.exe" (
    echo Compiling Native Telemetry Engine...
    call "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:exe /platform:x64 /optimize+ /out:src-engine\NetSpectreEngine.exe src-engine\NetSpectreEngine.cs
)

echo [2/2] Starting NETSPECTRE Desktop Application...
call npm.cmd run electron

pause
