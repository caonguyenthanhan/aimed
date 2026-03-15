@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\..\.."

:menu
cls
echo ===============================
echo CPU Server Launcher
echo ===============================
echo 1^) Chay CPU server + ngrok (port 8000)
echo 2^) Chay CPU server (khong ngrok) (port 8000)
echo 3^) Chay CPU server + ngrok + reload (port 8000)
echo 4^) Doi port
echo 0^) Thoat
echo.
set /p choice=Chon: 

if "%choice%"=="1" goto run_ngrok
if "%choice%"=="2" goto run_local
if "%choice%"=="3" goto run_ngrok_reload
if "%choice%"=="4" goto set_port
if "%choice%"=="0" goto end
goto menu

:set_port
set /p PORT=Nhap port (mac dinh 8000): 
if "%PORT%"=="" set PORT=8000
goto menu

:run_ngrok
if "%PORT%"=="" set PORT=8000
powershell -NoProfile -ExecutionPolicy Bypass -File "cpu_server\launcher\run.ps1" -Port %PORT%
pause
goto menu

:run_local
if "%PORT%"=="" set PORT=8000
powershell -NoProfile -ExecutionPolicy Bypass -File "cpu_server\launcher\run.ps1" -Port %PORT% -NoNgrok
pause
goto menu

:run_ngrok_reload
if "%PORT%"=="" set PORT=8000
powershell -NoProfile -ExecutionPolicy Bypass -File "cpu_server\launcher\run.ps1" -Port %PORT% -Reload
pause
goto menu

:end
endlocal
exit /b 0

