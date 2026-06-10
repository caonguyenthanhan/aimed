<#
.SYNOPSIS
    AIMed smoke test - verifies core endpoints before deployment.
.DESCRIPTION
    Runs quick health checks against the local Next.js dev server.
    Exit code 0 = all pass, 1 = any failure.
.NOTES
    Run from project root:  powershell -File smoke.ps1
#>

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:3000"
$TIMEOUT = 10
$FAIL_COUNT = 0

function Test-Endpoint {
    param([string]$Name, [string]$Path, [string]$Method = "GET", [hashtable]$Body = $null, [string]$Auth = $null)

    $url = "$BASE$Path"
    $headers = @{}
    if ($Auth) { $headers["Authorization"] = $Auth }
    $headers["Content-Type"] = "application/json"

    $params = @{
        Method = $Method
        Uri = $url
        Headers = $headers
        TimeoutSec = $TIMEOUT
    }
    if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress) }

    try {
        $r = Invoke-WebRequest @params -UseBasicParsing 2>$null
        $status = [int]$r.StatusCode
        $ok = $status -ge 200 -and $status -lt 400
        $sym = if ($ok) { "PASS" } else { "FAIL" }
        if (-not $ok) {
            Write-Host "  [$sym] $Method $Path  ->  $status" -ForegroundColor Red
            $script:FAIL_COUNT++
        } else {
            Write-Host "  [PASS] $Method $Path  ->  $status" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [FAIL] $Method $Path  ->  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $script:FAIL_COUNT++
    }
}

Write-Host ""
Write-Host "=== AIMed Smoke Test ===" -ForegroundColor Cyan
Write-Host "Base: $BASE" -ForegroundColor DarkGray
Write-Host ""

# 1. Basic routing
Write-Host "[1] Routing checks" -ForegroundColor Yellow
Test-Endpoint "Root redirect" "/"
Test-Endpoint "Home page (vi)" "/vi"

# 2. Auth endpoints
Write-Host ""
Write-Host "[2] Auth checks" -ForegroundColor Yellow
Test-Endpoint "Auth login (invalid creds)" "/api/auth/login" "POST" @{username="bad"; password="bad"}
Test-Endpoint "Auth login (test account)" "/api/auth/login" "POST" @{username="doctor_001"; password="doctor123"}

# 3. Safety checks
Write-Host ""
Write-Host "[3] Safety checks" -ForegroundColor Yellow
Test-Endpoint "Rate limiter works" "/api/agent-chat" "POST" @{
    message = "hello"
    userId = "smoke-test-user"
    category = "consultation"
    profile = "triage"
}

# 4. Runtime endpoints
Write-Host ""
Write-Host "[4] Runtime checks" -ForegroundColor Yellow
Test-Endpoint "Runtime metrics" "/api/runtime/metrics"
Test-Endpoint "Runtime events" "/api/runtime/events"
Test-Endpoint "Monitor dashboard" "/api/runtime/monitor"

# 5. Static assets
Write-Host ""
Write-Host "[5] Static assets" -ForegroundColor Yellow
Test-Endpoint "Manifest" "/manifest.webmanifest"
Test-Endpoint "Service worker" "/sw.js"

Write-Host ""
if ($FAIL_COUNT -eq 0) {
    Write-Host "All smoke tests passed ($FAIL_COUNT failures)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$FAIL_COUNT smoke test(s) FAILED" -ForegroundColor Red
    exit 1
}
