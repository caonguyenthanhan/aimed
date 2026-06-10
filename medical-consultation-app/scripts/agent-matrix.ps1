param(
  [ValidateSet("cpu","next")] [string]$Target = "cpu",
  [string]$BaseUrl = "http://127.0.0.1:8000",
  [string]$Provider = "foza",
  [string]$AgentId = "auto",
  [bool]$IncludeTools = $true,
  [string]$OutDir = ".\\docs\\reports",
  [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

function Invoke-AgentChat {
  param(
    [string]$Message,
    [string]$ExpectedProfile
  )

  $endpoint = if ($Target -eq "next") { "/api/agent-chat" } else { "/v1/agent-chat" }
  $uri = ($BaseUrl.TrimEnd("/") + $endpoint)
  $body = @{
    message = $Message
    agent_id = $AgentId
    include_tools = [bool]$IncludeTools
    provider = $Provider
  }

  $headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
  }
  if ($ApiKey.Trim()) { $headers["x-api-key"] = $ApiKey.Trim() }

  $json = ($body | ConvertTo-Json -Depth 10)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $bytes
  } finally {
    $sw.Stop()
  }

  $meta = $resp.metadata
  $gotProfile = ""
  if ($meta -and $meta.agent_profile) { $gotProfile = [string]$meta.agent_profile }

  $intent = $null
  if ($meta -and $meta.intent) { $intent = $meta.intent }

  $toolCalls = @()
  if ($meta -and $meta.tool_calls) { $toolCalls = @($meta.tool_calls) }

  $actions = @()
  if ($resp.actions) { $actions = @($resp.actions) }

  return @{
    expected_profile = $ExpectedProfile
    got_profile = $gotProfile
    ok_profile = ($ExpectedProfile -eq $gotProfile)
    latency_ms = [int]$sw.ElapsedMilliseconds
    actions_count = $actions.Count
    action_types = @($actions | ForEach-Object { $_.type } | Where-Object { $_ })
    tool_calls = $toolCalls
    intent = $intent
    response_preview = ([string]$resp.response).Substring(0, [Math]::Min(180, ([string]$resp.response).Length))
  }
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$cases = @(
  @{ name = "default"; expected = "default"; message = "Xin chao, minh muon hoi ve suc khoe tong quat." },
  @{ name = "triage"; expected = "triage"; message = "Minh bi dau nguc va kho tho tu 10 phut nay." },
  @{ name = "medication"; expected = "medication"; message = "Minh dang uong ibuprofen va paracetamol, co tuong tac gi khong?" },
  @{ name = "care_plan"; expected = "care_plan"; message = "Lap ke hoach theo doi huyet ap trong 2 tuan giup minh." },
  @{ name = "therapy"; expected = "therapy"; message = "Minh lo au, mat ngu. Huong dan minh bai tho don gian." },
  @{ name = "doctor_referral"; expected = "doctor_referral"; message = "Minh muon dat hen bac si tim mach." }
)

$startedAt = (Get-Date).ToString("s")
$results = @()
foreach ($c in $cases) {
  $results += Invoke-AgentChat -Message $c.message -ExpectedProfile $c.expected
}

$pass = ($results | Where-Object { $_.ok_profile }).Count
$total = $results.Count
$passRate = if ($total -gt 0) { [Math]::Round(($pass * 100.0) / $total, 2) } else { 0 }

$report = @{
  started_at = $startedAt
  target = $Target
  base_url = $BaseUrl
  provider = $Provider
  agent_id = $AgentId
  include_tools = [bool]$IncludeTools
  pass = $pass
  total = $total
  pass_rate = $passRate
  results = $results
}

$ts = (Get-Date).ToString("yyyyMMdd-HHmmss")
$jsonPath = Join-Path $OutDir ("agent-matrix-$ts.json")
$mdPath = Join-Path $OutDir ("agent-matrix-$ts.md")
$jsonLatest = Join-Path $OutDir "agent-matrix-latest.json"
$mdLatest = Join-Path $OutDir "agent-matrix-latest.md"

($report | ConvertTo-Json -Depth 20) | Set-Content -Encoding UTF8 $jsonPath
Copy-Item -Force $jsonPath $jsonLatest

$lines = @()
$lines += "# Agent Matrix Report"
$lines += ""
$lines += "- started_at: $startedAt"
$lines += "- target: $Target"
$lines += "- base_url: $BaseUrl"
$lines += "- provider: $Provider"
$lines += "- agent_id: $AgentId"
$lines += "- include_tools: $([bool]$IncludeTools)"
$lines += "- pass_rate: $passRate% ($pass/$total)"
$lines += ""
$lines += "| expected | got | ok | latency_ms | actions | tool_calls |"
$lines += "|---|---|---:|---:|---:|---|"
foreach ($r in $results) {
  $tools = ""
  if ($r.tool_calls) { $tools = (($r.tool_calls | Where-Object { $_ }) -join ", ") }
  $lines += "| $($r.expected_profile) | $($r.got_profile) | $([int]$r.ok_profile) | $($r.latency_ms) | $($r.actions_count) | $tools |"
}
$lines += ""
$lines += "## Intent snapshots"
$lines += ""
foreach ($r in $results) {
  $intentJson = ""
  if ($null -ne $r.intent) { $intentJson = ($r.intent | ConvertTo-Json -Compress -Depth 10) }
  $lines += "- $($r.expected_profile): $intentJson"
}
$lines -join "`n" | Set-Content -Encoding UTF8 $mdPath
Copy-Item -Force $mdPath $mdLatest

Write-Host ("OK: " + $mdLatest)
