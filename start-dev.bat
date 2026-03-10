@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found in PATH.
  echo Install Node.js 20+ and try again.
  pause
  exit /b 1
)

set "APP_URL=http://localhost:8080"
start "Crimson Wars Server" cmd.exe /k cd /d "%~dp0" ^& node server.js

timeout /t 2 /nobreak >nul
start "" "%APP_URL%"
exit /b 0
