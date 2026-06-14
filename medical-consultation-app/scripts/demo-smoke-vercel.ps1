param(
  [Parameter(Mandatory=$true)] [string]$VercelUrl,
  [string]$CpuPublicUrl = "",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    $Body = $null
  )
  $headers = @{ "Accept" = "application/json" }
  if ($env:NGROK_SKIP_BROWSER_WARNING -and $env:NGROK_SKIP_BROWSER_WARNING.Trim()) { $headers["ngrok-skip-browser-warning"] = "1" }
  if ($Url -match "ngrok-free\." -or $Url -match "ngrok\.io") { $headers["ngrok-skip-browser-warning"] = "1" }
  if ($ApiKey.Trim()) { $headers["x-api-key"] = $ApiKey.Trim() }
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
  }
  $headers["Content-Type"] = "application/json"
  $json = ($Body | ConvertTo-Json -Depth 20)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $bytes
}

function Assert-True {
  param([bool]$Cond, [string]$Msg)
  if (-not $Cond) { throw $Msg }
}

function Get-GpuSkipSummary {
  $deployMode = [string]($env:MCS_DEPLOY_MODE)
  $demoMode = [string]($env:DEMO_MODE)
  $gpuEnabled = [string]($env:GPU_INFRA_ENABLED)
  $marker = [string]($env:GPU_SKIP_PENDING_INFRA_MARKER)
  if (-not $marker.Trim()) { $marker = "[GPU skipped - pending infrastructure]" }
  $isDemo = $false
  if ($deployMode.Trim().ToLower() -eq "demo") { $isDemo = $true }
  if ($demoMode.Trim().ToLower() -eq "demo") { $isDemo = $true }
  if (@("1","true","yes","on") -contains $demoMode.Trim().ToLower()) { $isDemo = $true }
  if ($isDemo) { return "$marker (demo_mode)" }
  if (-not $gpuEnabled.Trim() -or (@("1","true","yes","on") -notcontains $gpuEnabled.Trim().ToLower())) {
    return "$marker (pending infrastructure)"
  }
  return ""
}

$vercel = $VercelUrl.Trim().TrimEnd("/")
$cpuPub = $CpuPublicUrl.Trim().TrimEnd("/")
$gpuSummary = Get-GpuSkipSummary

Write-Host ("Vercel: " + $vercel)
if ($cpuPub) { Write-Host ("CPU public: " + $cpuPub) }
if ($gpuSummary) { Write-Host ("GPU: " + $gpuSummary) }

if ($cpuPub) {
  try {
    $h = Invoke-Json -Method Get -Url ($cpuPub + "/health")
  } catch {
    throw ("CPU public URL không truy cập được. Hãy chạy CPU server với ngrok và dùng đúng public URL. Chi tiết: " + $_.Exception.Message)
  }
  Assert-True ($h.status -eq "ok") "CPU /health not ok"

  try {
    $gs = Invoke-Json -Method Get -Url ($cpuPub + "/v1/graph/status")
  } catch {
    throw ("CPU public graph/status không truy cập được. Chi tiết: " + $_.Exception.Message)
  }
  Assert-True ($gs.ok -eq $true) "CPU /v1/graph/status not ok"
  Assert-True ([int]$gs.nodes -gt 0) "CPU graph nodes=0"
}

$db = Invoke-Json -Method Get -Url ($vercel + "/api/db/ping")
Assert-True ($db.ok -eq $true) "Vercel /api/db/ping not ok"

$mcpStatus = Invoke-Json -Method Post -Url ($vercel + "/api/mcp/call") -Body @{ name="graph.status"; args=@{} }
Assert-True ($mcpStatus.result.connected -eq $true) "Vercel graph.status not connected (kiểm tra CPU_SERVER_URL trên Vercel có trỏ đúng ngrok public URL và ngrok đang online)"
Assert-True ([int]$mcpStatus.result.nodes -gt 0) "Vercel graph nodes=0"

$mcpEv = Invoke-Json -Method Post -Url ($vercel + "/api/mcp/call") -Body @{ name="graph.evidence"; args=@{ query="Tram cam"; limit=10; entity_limit=5 } }
Assert-True ($mcpEv.result.ok -eq $true) "Vercel graph.evidence not ok"

$triage = Invoke-Json -Method Post -Url ($vercel + "/api/agent-chat") -Body @{ message="Minh bi dau nguc va kho tho tu 10 phut nay."; agent_id="auto"; include_tools=$false; provider="foza" }
Assert-True ($triage.metadata.agent_profile -eq "triage") "agent_profile != triage"
$triageIntent = $triage.metadata.intent
$triageOk = ($triageIntent.wants_triage -eq $true) -or ($triageIntent.triage -eq $true)
Assert-True ($triageOk) "intent.triage/wants_triage != true"

$med = Invoke-Json -Method Post -Url ($vercel + "/api/agent-chat") -Body @{ message="Minh dang uong ibuprofen va paracetamol, co tuong tac gi khong?"; agent_id="auto"; include_tools=$false; provider="foza" }
Assert-True ($med.metadata.agent_profile -eq "medication") "agent_profile != medication"

Write-Host "OK: demo smoke passed"
