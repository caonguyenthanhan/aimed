@echo off
cd /d "%~dp0"
set CPU_NO_GRAPH=1
powershell -NoProfile -ExecutionPolicy Bypass -File "cpu_server\launcher\run.ps1" -Port 8000 -NoNgrok
