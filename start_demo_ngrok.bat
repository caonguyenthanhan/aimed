@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set "CPU_PORT=8000"
set "CPU_HEALTH=http://127.0.0.1:%CPU_PORT%/health"
set "NGROK_API=http://127.0.0.1:4040/api/tunnels"
set "FRONTEND_DIR=%ROOT%medical-consultation-app"
set "CPU_SCRIPT=%ROOT%cpu_server\launcher\run.ps1"

echo ========================================
echo AIMed Demo Starter
echo ========================================
echo [1/4] Starting CPU + Graph + ngrok...
start "AIMed CPU+Graph+Ngrok" powershell -NoExit -ExecutionPolicy Bypass -File "%CPU_SCRIPT%" -Port %CPU_PORT%

echo [2/4] Waiting for CPU health...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline=(Get-Date).AddSeconds(75); $ok=$false; while((Get-Date) -lt $deadline){ try { $resp=Invoke-RestMethod -Uri '%CPU_HEALTH%' -TimeoutSec 3; if($null -ne $resp){ $ok=$true; break } } catch {}; Start-Sleep -Milliseconds 750 }; if(-not $ok){ Write-Error 'CPU health check failed'; exit 1 }"
if errorlevel 1 (
  echo CPU server did not become healthy in time. Check the CPU window for details.
  exit /b 1
)

echo [3/4] Waiting for ngrok public URL...
set "PUBLIC_URL="
for /f "delims=" %%U in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(45); while((Get-Date) -lt $deadline){ try { $data=Invoke-RestMethod -Uri '%NGROK_API%' -TimeoutSec 3; $url=$data.tunnels ^| Where-Object { $_.public_url -like 'https://*' } ^| Select-Object -First 1 -ExpandProperty public_url; if($url){ Write-Output $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 750 }; exit 0"') do set "PUBLIC_URL=%%U"
if defined PUBLIC_URL (
  echo CPU_SERVER_URL=!PUBLIC_URL!
) else (
  echo ngrok public URL is not ready yet. The CPU window will keep trying.
)

echo [4/4] Starting Frontend...
start "AIMed Frontend" powershell -NoExit -Command ^
  "$port=3000; while(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){ $port++ }; Set-Location '%FRONTEND_DIR%'; Write-Host ('Frontend URL: http://127.0.0.1:' + $port); npm run dev -- --hostname 127.0.0.1 --port $port"

echo ----------------------------------------
echo Demo summary
echo - CPU health: %CPU_HEALTH%
if defined PUBLIC_URL (
  echo - CPU public: !PUBLIC_URL!
) else (
  echo - CPU public: pending, check the CPU window
)
echo - Frontend: check the Frontend window for the selected port
echo ----------------------------------------
