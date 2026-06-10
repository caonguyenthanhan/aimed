param(
  [int]$Port = 8000,
  [switch]$Reload,
  [switch]$NoNgrok
)

$ErrorActionPreference = "Stop"

function Get-ListeningPids {
  param([int]$P)
  try {
    return @(Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
  } catch {
    return @()
  }
}

$pids = Get-ListeningPids -P $Port
if ($pids.Count -gt 0) {
  foreach ($procId in $pids) {
    if ($procId -and ([int]$procId -ne $PID)) {
      try { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue } catch {}
    }
  }
  Start-Sleep -Milliseconds 500
  $pids2 = Get-ListeningPids -P $Port
  if ($pids2.Count -gt 0) {
    throw ("Port " + $Port + " vẫn đang bị chiếm (PID: " + ($pids2 -join ",") + "). Hãy chạy PowerShell/Terminal bằng quyền Admin hoặc tắt tiến trình đó.")
  }
}

$argsList = @("--port", "$Port")
if ($Reload) { $argsList += "--reload" }
if ($NoNgrok) { $argsList += "--no-ngrok" }

python "cpu_server/launcher/run_cpu_server_ngrok.py" @argsList
