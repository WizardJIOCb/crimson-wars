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
set "SKILLS_ADMIN_TOKEN_LOCAL=local-skills-admin"

echo Starting Crimson Wars local server...
echo.
echo Local URLs:
echo   Game:  %APP_URL%
echo   Admin: %APP_URL%/admin-skills.html
echo.
echo Admin token:
echo   %SKILLS_ADMIN_TOKEN_LOCAL%
echo.

for /f %%P in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1)"') do (
  if not "%%P"=="" (
    echo Stopping existing process on port 8080: PID %%P
    taskkill /PID %%P /F >nul 2>nul
    timeout /t 1 /nobreak >nul
  )
)

start "Crimson Wars Server" cmd.exe /k "cd /d ""%~dp0"" && set ""SKILLS_ADMIN_TOKEN=%SKILLS_ADMIN_TOKEN_LOCAL%"" && echo Using SKILLS_ADMIN_TOKEN=%SKILLS_ADMIN_TOKEN_LOCAL% && node server.js"

timeout /t 2 /nobreak >nul
start "" "%APP_URL%"
exit /b 0
