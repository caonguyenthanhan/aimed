import urllib.request, json

URL = "https://uneliminated-lavenia-playfully.ngrok-free.dev/v1/agent-chat"
body = json.dumps({
    "message": "sot nhe dau hong met 2 ngay",
    "agent_id": "auto",
    "provider": "auto",
}).encode()
req = urllib.request.Request(
    URL,
    data=body,
    headers={"Content-Type": "application/json", "ngrok-skip-browser-warning": "true"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    md = data.get("metadata", {})
    print("HTTP OK")
    print("provider:", md.get("provider"))
    print("fallback:", md.get("fallback"))
    print("error:", md.get("error"))
    print("error_type:", md.get("error_type"))
    ctx = md.get("llm_context", {})
    print("graph_injected:", ctx.get("graph_injected"))
    print("response[:200]:", data.get("response", "")[:200])
except urllib.error.HTTPError as e:
    print("HTTPError", e.code)
    print(e.read().decode("utf-8")[:500])
except Exception as e:
    print("EXC", type(e).__name__, str(e)[:300])
