@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "cpu_server\launcher\run.ps1" -Port 8000 -NoNgrok
