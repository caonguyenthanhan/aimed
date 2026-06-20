@echo off
cd /d "%~dp0"
start "AIMed CPU" cmd /k "powershell -NoProfile -ExecutionPolicy Bypass -File ""cpu_server\launcher\run.ps1"" -Port 8000 -NoNgrok"
timeout /t 3 /nobreak >nul
start "AIMed Frontend" cmd /k "cd /d ""%~dp0medical-consultation-app"" && npm run dev"
