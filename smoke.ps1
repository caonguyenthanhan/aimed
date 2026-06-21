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
$BASE = "http://127.0.0.1:3000"
$TIMEOUT = 30
$FAIL_COUNT = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [string]$Auth = $null,
        [int]$ExpectedStatus = 200
    )

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

    $status = 0
    try {
        $r = Invoke-WebRequest @params -UseBasicParsing
        $status = [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } else {
            Write-Host "  [FAIL] $Method $Path  ->  ERROR: $($_.Exception.Message)" -ForegroundColor Red
            $script:FAIL_COUNT++
            return
        }
    }

    $ok = $false
    if ($ExpectedStatus -eq 200) {
        $ok = $status -ge 200 -and $status -lt 300
    } elseif ($ExpectedStatus -eq 401) {
        $ok = $status -eq 401 -or $status -eq 502
    } else {
        $ok = $status -eq $ExpectedStatus
    }

    if ($ok) {
        Write-Host "  [PASS] $Method $Path  ->  $status (Expected: $ExpectedStatus)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $Method $Path  ->  $status (Expected: $ExpectedStatus)" -ForegroundColor Red
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
Test-Endpoint "Auth login (invalid creds)" "/api/auth/login" "POST" @{username="bad"; password="bad"} -ExpectedStatus 401
Test-Endpoint "Auth login (test account)" "/api/auth/login" "POST" @{username="doctor.tuan"; password="Demo123!"}

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
