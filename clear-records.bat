@echo off
setlocal

cd /d "%~dp0"

if not exist "data\records.db" (
  echo records.db not found: data\records.db
  exit /b 1
)

echo Clearing local records table...
node -e "const Database=require('better-sqlite3'); const db=new Database('data/records.db'); db.prepare('DELETE FROM records').run(); const row=db.prepare('SELECT COUNT(*) AS c FROM records').get(); console.log('Records left:', row.c); db.close();"
if errorlevel 1 exit /b %errorlevel%

echo Done.
endlocal
