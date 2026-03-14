param(
  [int]$Port = 8000,
  [switch]$Reload,
  [switch]$NoNgrok
)

$ErrorActionPreference = "Stop"

$argsList = @("--port", "$Port")
if ($Reload) { $argsList += "--reload" }
if ($NoNgrok) { $argsList += "--no-ngrok" }

python "cpu-server-app/run_cpu_server_ngrok.py" @argsList

