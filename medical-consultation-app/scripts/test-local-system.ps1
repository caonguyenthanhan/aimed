# Test local system: Graph, Multi-agent, APIs

param(
    [string]$CpuUrl = "http://127.0.0.1:8000",
    [string]$NextUrl = "http://localhost:3000",
    [bool]$RunNextDev = $true
)

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "   TEST LOCAL SYSTEM" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

# 1. Test CPU health
Write-Host "1. Testing CPU server health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$CpuUrl/health" -TimeoutSec 10
    Write-Host "   ✅ CPU health: PASS" -ForegroundColor Green
    Write-Host "   Response:" -ForegroundColor Gray
    Write-Host "   $($health | ConvertTo-Json -Compress)`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ CPU health: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# 2. Test Graph status
Write-Host "2. Testing Graph status..." -ForegroundColor Yellow
try {
    $graphStatus = Invoke-RestMethod -Uri "$CpuUrl/v1/graph/status" -TimeoutSec 10
    Write-Host "   ✅ Graph status: PASS" -ForegroundColor Green
    Write-Host "   Connected: $($graphStatus.connected)" -ForegroundColor Gray
    Write-Host "   Nodes: $($graphStatus.nodes)" -ForegroundColor Gray
    Write-Host "   Latency: $($graphStatus.latency_ms)ms`n" -ForegroundColor Gray
    if (-not $graphStatus.connected -or $graphStatus.nodes -eq 0) {
        Write-Host "   ⚠️ Graph may not be fully operational!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Graph status: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# 3. Test Graph evidence
Write-Host "3. Testing Graph evidence..." -ForegroundColor Yellow
try {
    $evidenceReq = @{ query = "stress"; limit = 10; entity_limit = 5 } | ConvertTo-Json
    $evidence = Invoke-RestMethod -Uri "$CpuUrl/v1/graph/evidence" -Method Post -Body $evidenceReq -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✅ Graph evidence: PASS" -ForegroundColor Green
    Write-Host "   Entities found: $($evidence.entities.Count)" -ForegroundColor Gray
    Write-Host "   Edges found: $($evidence.edges.Count)" -ForegroundColor Gray
    Write-Host "   Elapsed: $($evidence.elapsed_ms)ms`n" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Graph evidence: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# 4. Test Multi-agent (6 cases)
Write-Host "4. Testing Multi-agent auto profile detection..." -ForegroundColor Yellow
$cases = @(
    @{ name = "default"; message = "Xin chào, tôi muốn hỏi về sức khỏe tổng quát"; expected = "default" },
    @{ name = "triage"; message = "Tôi đau ngực và khó thở từ 10 phút nay"; expected = "triage" },
    @{ name = "medication"; message = "Tôi đang uống ibuprofen và paracetamol, có tương tác không"; expected = "medication" },
    @{ name = "care_plan"; message = "Lập kế hoạch theo dõi huyết áp trong 2 tuần"; expected = "care_plan" },
    @{ name = "therapy"; message = "Tôi lo âu, mất ngủ, hướng dẫn bài thở đơn giản"; expected = "therapy" },
    @{ name = "doctor_referral"; message = "Tôi muốn đặt lịch hẹn bác sĩ tim mạch"; expected = "doctor_referral" }
)
$passCount = 0
foreach ($case in $cases) {
    Write-Host "   Testing $($case.name)..." -ForegroundColor Gray
    try {
        $reqBody = @{ message = $case.message; agent_id = "auto"; include_tools = $false; provider = "foza" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$CpuUrl/v1/agent-chat" -Method Post -Body $reqBody -ContentType "application/json" -TimeoutSec 60
        $gotProfile = $response.metadata.agent_profile
        if ($gotProfile -eq $case.expected) {
            Write-Host "   ✅ $($case.name): PASS (got: $gotProfile)" -ForegroundColor Green
            $passCount++
        } else {
            Write-Host "   ❌ $($case.name): FAILED (got: $gotProfile, expected: $($case.expected))" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ $($case.name): FAILED (error: $($_.Exception.Message))" -ForegroundColor Red
    }
}
Write-Host "`n   Agent profile test: $passCount/$($cases.Count) passed`n" -ForegroundColor Cyan

# 5. Test Next.js API if available
if ($RunNextDev) {
    Write-Host "5. Testing Next.js API (local: $NextUrl)..." -ForegroundColor Yellow
    try {
        $dbPing = Invoke-RestMethod -Uri "$NextUrl/api/db/ping" -TimeoutSec 10
        Write-Host "   ✅ Next DB ping: PASS" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️ Next DB ping: SKIPPED/FAILED (Next dev server may not be running)" -ForegroundColor Yellow
    }
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "   LOCAL TEST SUITE COMPLETE" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan
