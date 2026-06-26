# PowerShell test script for all 6 AI Agent profiles on the live Vercel domain

$Url = "https://aimed-one.vercel.app/api/agent-chat"
$AccessPass = "kltn2026"
$UserId = "test_user_ps"
$ConvId = "test_conv_ps_" + (Get-Random)

$TestCases = @(
    @{
        Name = "Default Profile"
        Query = "Xin chào trợ lý y tế"
        ExpectedProfile = "default"
    },
    @{
        Name = "Therapy Profile"
        Query = "Tôi cảm thấy lo âu và mất ngủ kéo dài"
        ExpectedProfile = "therapy"
    },
    @{
        Name = "Triage Profile"
        Query = "Tôi bị đau ngực dữ dội và khó thở"
        ExpectedProfile = "triage"
    },
    @{
        Name = "Medication Profile"
        Query = "Nhức đầu nên uống thuốc gì và liều lượng bao nhiêu?"
        ExpectedProfile = "medication"
    },
    @{
        Name = "Doctor Referral Profile"
        Query = "Tôi muốn tìm một bác sĩ tim mạch giỏi"
        ExpectedProfile = "doctor_referral"
    },
    @{
        Name = "Care Plan Profile"
        Query = "Tôi muốn lên kế hoạch ăn uống giảm cân an toàn"
        ExpectedProfile = "care_plan"
    }
)

Write-Host "=========================================================="
Write-Host "Starting Agent Profile Tests on: $Url"
Write-Host "=========================================================="

foreach ($case in $TestCases) {
    Write-Host "`n[Testing] $($case.Name) with query: '$($case.Query)'"
    
    $Body = @{
        message = $case.Query
        access_pass = $AccessPass
        user_id = $UserId
        conversation_id = $ConvId
        messages = @()
    } | ConvertTo-Json

    $Headers = @{
        "Content-Type" = "application/json"
    }

    $StartTime = Get-Date
    try {
        $Response = Invoke-RestMethod -Uri $Url -Method Post -Body $Body -Headers $Headers -TimeoutSec 45
        $Duration = ((Get-Date) - $StartTime).TotalMilliseconds
        
        $Profile = $Response.metadata.profile
        if ($null -eq $Profile) {
            $Profile = $Response.profile
        }
        
        Write-Host "Status: Success (in $($Duration)ms)"
        Write-Host "Profile Detected: $Profile"
        Write-Host "Response preview: $($Response.response.Substring(0, [Math]::Min(150, $Response.response.Length)))..."
        
        if ($Response.actions) {
            Write-Host "Actions: $($Response.actions | ConvertTo-Json -Compress)"
        } else {
            Write-Host "Actions: None"
        }
        
        # Verify
        if ($Profile -eq $case.ExpectedProfile -or ($case.ExpectedProfile -eq "default" -and ($Profile -eq "default" -or $null -eq $Profile))) {
            Write-Host "RESULT: PASS" -ForegroundColor Green
        } else {
            Write-Host "RESULT: WARNING (Expected: $($case.ExpectedProfile), Got: $Profile)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Status: FAILED" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
    }
}
Write-Host "`n=========================================================="
Write-Host "All agent profile tests completed."
Write-Host "=========================================================="
