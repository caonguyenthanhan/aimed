param(
  [string]$VercelUrl = "",
  [string]$CpuPublicUrl = "",
  [switch]$SkipSmoke,
  [ValidateSet("cpu","next")] [string]$MatrixTarget = "cpu",
  [string]$MatrixBaseUrl = "http://127.0.0.1:8000",
  [string]$MatrixProvider = "foza",
  [string]$MatrixAgentId = "auto",
  [bool]$MatrixIncludeTools = $true,
  [int]$PassRateMin = 80,
  [int]$SuccessRateMin = 95,
  [int]$LastN = 200
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Fn
  )
  Write-Host ("==> " + $Name)
  & $Fn
}

function Read-Json {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $raw = Get-Content -Raw -Encoding UTF8 $Path
  return ($raw | ConvertFrom-Json)
}

function Read-Jsonl {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return @() }
  $lines = Get-Content -Encoding UTF8 $Path | Where-Object { $_.Trim() }
  $out = @()
  foreach ($ln in $lines) {
    try { $out += ($ln | ConvertFrom-Json) } catch {}
  }
  return @($out)
}

function Tail-Array {
  param([object[]]$Arr, [int]$N)
  if (-not $Arr) { return @() }
  if ($N -le 0) { return @($Arr) }
  if ($Arr.Count -le $N) { return @($Arr) }
  return @($Arr[($Arr.Count - $N)..($Arr.Count - 1)])
}

function Gate-AgentChatSuccessRate {
  param(
    [string]$EventsPath,
    [int]$N,
    [int]$MinPct
  )
  $items = Read-Jsonl -Path $EventsPath
  $chats = @($items | Where-Object { $_.type -eq "agent_chat" })
  $tail = Tail-Array -Arr $chats -N $N
  $total = $tail.Count
  $ok = (@($tail | Where-Object { $_.ok -eq $true })).Count
  $fail = $total - $ok
  $pct = if ($total -gt 0) { [Math]::Round(($ok * 100.0) / $total, 2) } else { 0 }
  $pass = ($pct -ge $MinPct)
  return @{
    pass = $pass
    total = $total
    ok = $ok
    fail = $fail
    success_rate_pct = $pct
    min_pct = $MinPct
  }
}

function Gate-AgentMatrixPassRate {
  param(
    [string]$MatrixLatestPath,
    [int]$MinPct
  )
  $m = Read-Json -Path $MatrixLatestPath
  if ($null -eq $m) {
    return @{ pass = $false; pass_rate = 0; min_pct = $MinPct; total = 0; reason = "missing_matrix_latest" }
  }
  $passRate = [double]($m.pass_rate)
  $total = 0
  if ($m.total) { $total = [int]$m.total }
  if ($total -le 0 -and $m.results) { $total = @($m.results).Count }
  return @{
    pass = ($passRate -ge $MinPct)
    pass_rate = $passRate
    min_pct = $MinPct
    total = $total
    started_at = $m.started_at
  }
}

$AppRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $AppRoot "..")).Path
$ThesisRoot = (Join-Path $RepoRoot "thesis")

$SmokeScript = (Join-Path $PSScriptRoot "demo-smoke-vercel.ps1")
$MatrixScript = (Join-Path $PSScriptRoot "agent-matrix.ps1")
$MatrixLatest = (Join-Path $AppRoot "docs\\reports\\agent-matrix-latest.json")

$EventsPath = (Join-Path $AppRoot "data\\runtime-events.jsonl")
$MetricsPath = (Join-Path $AppRoot "data\\runtime-metrics.jsonl")

$AppendixAgentEval = (Join-Path $ThesisRoot "APPENDIX_AGENT_EVALUATION.md")
$AppendixLLMOps = (Join-Path $ThesisRoot "APPENDIX_LLMOPS_LITE.md")

$didSmoke = $false
$didMatrix = $false
$didAppendix = $false

try {
  if (-not $SkipSmoke) {
    if ($VercelUrl.Trim()) {
      $didSmoke = $true
      Invoke-Step -Name "Smoke Vercel->CPU" -Fn {
        if ($CpuPublicUrl.Trim()) {
          & $SmokeScript -VercelUrl $VercelUrl -CpuPublicUrl $CpuPublicUrl
        } else {
          & $SmokeScript -VercelUrl $VercelUrl
        }
      }
    }
  }

  $didMatrix = $true
  Invoke-Step -Name "Agent matrix" -Fn {
    & $MatrixScript -Target $MatrixTarget -BaseUrl $MatrixBaseUrl -Provider $MatrixProvider -AgentId $MatrixAgentId -IncludeTools $MatrixIncludeTools
  }

  $didAppendix = $true
  Invoke-Step -Name "Generate thesis appendices" -Fn {
    python (Join-Path $ThesisRoot "scripts\\generate_agent_evaluation_appendix.py")
    python (Join-Path $ThesisRoot "scripts\\generate_llmops_lite_appendix.py")
  }

  $matrixGate = Gate-AgentMatrixPassRate -MatrixLatestPath $MatrixLatest -MinPct $PassRateMin
  $eventsGate = Gate-AgentChatSuccessRate -EventsPath $EventsPath -N $LastN -MinPct $SuccessRateMin

  Write-Host ""
  Write-Host "==> Gate summary"
  Write-Host ("- matrix_pass_rate: " + $matrixGate.pass_rate + "% (min " + $matrixGate.min_pct + "%), total=" + $matrixGate.total)
  Write-Host ("- agent_chat_success_rate(last " + $LastN + "): " + $eventsGate.success_rate_pct + "% (min " + $eventsGate.min_pct + "%), ok=" + $eventsGate.ok + ", fail=" + $eventsGate.fail)
  Write-Host ("- runtime logs: events=" + (Test-Path $EventsPath) + ", metrics=" + (Test-Path $MetricsPath))
  Write-Host ("- appendices: agent_eval=" + (Test-Path $AppendixAgentEval) + ", llmops=" + (Test-Path $AppendixLLMOps))

  $allPass = ($matrixGate.pass -and $eventsGate.pass -and (Test-Path $AppendixAgentEval) -and (Test-Path $AppendixLLMOps))
  if (-not $allPass) {
    throw "GATE_FAILED"
  }

  Write-Host ""
  Write-Host "OK: LLMOps-lite test suite passed"
} catch {
  Write-Host ""
  Write-Host ("FAILED: " + $_.Exception.Message)
  Write-Host ("didSmoke=" + $didSmoke + ", didMatrix=" + $didMatrix + ", didAppendix=" + $didAppendix)
  exit 1
}
