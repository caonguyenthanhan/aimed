param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$UserId = "demo_user",
  [string]$ConversationId = "",
  [string]$AuthToken = ""
)

$ErrorActionPreference = "Stop"

function Join-Url([string]$Base, [string]$Path) {
  $b = $Base.TrimEnd("/")
  $p = $Path.TrimStart("/")
  return "$b/$p"
}

function Invoke-Json([string]$Method, [string]$Url, $Body = $null, [hashtable]$Headers = @{}) {
  $h = @{}
  foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] }
  $h["Accept"] = "application/json"
  try {
    if ($Body -ne $null) {
      return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 20)
    }
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $h
  } catch {
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch { }
    $bodyText = $null
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $bodyText = $reader.ReadToEnd()
      }
    } catch { }
    return @{
      ok = $false
      status = $status
      error = $_.Exception.Message
      body = $bodyText
      url = $Url
      method = $Method
    }
  }
}

$headers = @{}
if ($AuthToken.Trim()) { $headers["Authorization"] = "Bearer $AuthToken" }

Write-Host "BASE=$BaseUrl"

Write-Host "`n[1/5] GET /api/db/ping"
$db = Invoke-Json "GET" (Join-Url $BaseUrl "/api/db/ping") $null $headers
$db | ConvertTo-Json -Depth 20 | Write-Host

if (-not $ConversationId.Trim()) { $ConversationId = [guid]::NewGuid().ToString() }

Write-Host "`n[2/5] POST /api/conversations/save"
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

Write-Host "`n[3/5] GET /api/conversations/list"
$listUrl = (Join-Url $BaseUrl "/api/conversations/list") + "?userId=$([uri]::EscapeDataString($UserId))&limit=10&offset=0"
$list = Invoke-Json "GET" $listUrl $null $headers
$list | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`n[4/5] POST /api/mcp/call (graph.status)"
$graph = Invoke-Json "POST" (Join-Url $BaseUrl "/api/mcp/call") @{ name = "graph.status"; args = @{} } $headers
$graph | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`n[5/5] POST /api/agent-chat"
$agent = Invoke-Json "POST" (Join-Url $BaseUrl "/api/agent-chat") @{
  message = "Xin chào. Trả lời 1 câu ngắn."
  conversation_id = $ConversationId
  user_id = $UserId
  agent_id = "auto"
  include_tools = $false
} $headers
$agent | ConvertTo-Json -Depth 20 | Write-Host

Write-Host "`nOK"
