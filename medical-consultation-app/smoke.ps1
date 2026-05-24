$ErrorActionPreference = "Stop"

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$UserId = "demo_user",
  [string]$ConversationId = "",
  [string]$AuthToken = ""
)

function Join-Url([string]$Base, [string]$Path) {
  $b = $Base.TrimEnd("/")
  $p = $Path.TrimStart("/")
  return "$b/$p"
}

function Invoke-Json([string]$Method, [string]$Url, $Body = $null, [hashtable]$Headers = @{}) {
  $h = @{}
  foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] }
  $h["Accept"] = "application/json"
  if ($Body -ne $null) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 20)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h
}

$headers = @{}
if ($AuthToken.Trim()) { $headers["Authorization"] = "Bearer $AuthToken" }

Write-Host "BASE=$BaseUrl"

Write-Host "`n[1/4] GET /api/db/ping"
$db = Invoke-Json "GET" (Join-Url $BaseUrl "/api/db/ping") $null $headers
$db | ConvertTo-Json -Depth 20 | Write-Host

if (-not $ConversationId.Trim()) { $ConversationId = [guid]::NewGuid().ToString() }

Write-Host "`n[2/4] POST /api/conversations/save"
$saveBody = @{
  conversationId = $ConversationId
  userId = $UserId
  title = "Smoke test"
  messages = @(
    @{ isUser = $true; content = "Xin chào" },
    @{ isUser = $false; content = "Chào bạn, mình là trợ lý." }
  )
}
$save = Invoke-Json "POST" (Join-Url $BaseUrl "/api/conversations/save") $saveBody $headers
$save | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`n[3/4] GET /api/conversations/list"
$listUrl = (Join-Url $BaseUrl "/api/conversations/list") + "?userId=$([uri]::EscapeDataString($UserId))&limit=10&offset=0"
$list = Invoke-Json "GET" $listUrl $null $headers
$list | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`n[4/4] POST /api/mcp/call (graph.status)"
$graph = Invoke-Json "POST" (Join-Url $BaseUrl "/api/mcp/call") @{ name = "graph.status"; args = @{} } $headers
$graph | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`nOK"
