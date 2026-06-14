# Current Logic (SSOT)

## Agent Chat Routing (/api/agent-chat)

### Inputs
- `AGENT_PROVIDER` (or request body `provider`): `foza` | `gemini` | `local` (fallback chain applies)
- `AGENT_GRAPH_EVIDENCE`: enables Graph evidence injection into agent system prompt
- `CPU_SERVER_URL`, `GPU_SERVER_URL` / `DEFAULT_GPU_URL`: runtime routing bases

### Graph Evidence
- When enabled, the route calls `graph.evidence` via `/api/mcp/call`.
- Evidence is embedded into the agent system persona as `GRAPH_EVIDENCE`.

### Provider Chain (High-Level) — updated 2026-06-12
Priority: **FOZA → Gemini → CPU(openai_like) → GPU**

1) **FOZA** (if `agentProvider === "foza"` OR `agentProvider === "auto"` AND `FOZA_TOKEN` + `LLM_MODEL_NAME` set)
   - Runs in **Simple Mode** when `AGENT_FORCE_ACTIONS=0`.
   - Runs in **Tool Mode** when `AGENT_FORCE_ACTIONS=1`.
   - Circuit breaker prevents repeated timeouts cascading.
   - On fail: sets `root_cause = foza_error:<msg>`, pushes `foza_fail:<msg>` into `fallback_chain`.
2) **Gemini** (if key/pass available)
   - On fail (non-429): returns safety fallback content for triage/medication intent.
3) **CPU/OpenAI-like** (depending on `data/runtime-mode.json` + registry)
4) **GPU** (final fallback)

### Fallback Transparency — updated 2026-06-12
- Response `metadata` carries:
  - `requested_provider`, `root_cause`, `fallback`, `fallback_chain`
  - `cpu_proxy_error` (if CPU proxy `/v1/agent-chat` failed)
  - `gemini_error` (if Gemini call failed)
  - `llm_context.graph_reason` — one of: `graph_disabled_no_cpu_url | graph_404 | graph_timeout | graph_down | graph_empty`
  - `llm_context.graph_status_code`, `llm_context.graph_endpoint`

### Graph Degrade Policy — updated 2026-06-14
- `/api/mcp/call` reads `CPU_SERVER_URL` dynamically from env and never hardcodes a CPU fallback URL.
- If `CPU_SERVER_URL` is empty, both `graph.status` and `graph.evidence` return `graph_disabled_no_cpu_url` immediately with `graph_connected=false`, `status_code=0`, `reason`, and latency metadata instead of attempting localhost.
- Fetch-level status mapping in Next.js gateway is strict: `404 → graph_404`, abort/timeout/deadline → `graph_timeout`, any other upstream/network failure → `graph_down`, empty evidence result → `graph_empty`.
- Gateway responses always keep app-safe JSON for UI/Context Viewer: `result.ok=false` plus `metadata.reason/status_code/upstream/error_kind`, never crash the route on graph failure.

### Graph Contract — updated 2026-06-14
- CPU graph endpoints now expose a stable Pydantic v2 contract with aliases for backward compatibility:
  - `/v1/graph/status` returns `graph_connected`, `status_code`, `reason`, `latency` and legacy aliases `connected`, `latency_ms`, `ok`.
  - `/v1/graph/evidence` returns `graph_connected`, `status_code`, `reason`, `latency` and legacy aliases `elapsed_ms`, `ok`.
- CPU graph timeouts/down states are converted into payload responses (`graph_timeout | graph_404 | graph_down`) instead of surfacing as unhandled 500s.

### FOZA Circuit Breaker
- In-memory circuit state (per runtime instance).
- Config:
  - `FOZA_CIRCUIT_FAIL_THRESHOLD` (default: 3)
  - `FOZA_CIRCUIT_OPEN_MS` (default: 600000)

## P0 Demo Runtime Sync (2026-06-13)

### Internal Demo Access
- Shared helper: `medical-consultation-app/lib/runtime-sync.ts`.
- Internal demo pass resolution:
  1. `INTERNAL_DEMO_PASS`
  2. fallback `AGENT_KEY_PASS`
  3. fallback default `1234567`
- Routes using the shared pass resolver:
  - `/api/agent-chat`
  - `/api/llm-chat`
  - `/api/live/access`

### UI Runtime State
- Frontend runtime sync uses shared event `runtime_mode_changed`.
- `chat-interface.tsx` now pushes provider/mode derived from backend `metadata` back into UI storage/event bus after each response.
- `compute-toggle.tsx` reads the same event/storage instead of relying only on localStorage heuristics.
- `/api/runtime/mode` now returns `provider` with the mode payload so initial UI state can start from backend truth.

## Runtime Quick Switch (2026-06-14)

### Quick Modes
- Header quick switch uses exactly 3 explicit states:
  - `GPU` => `target="gpu"`, `provider="server"`
  - `Gemini` => `target="gpu"`, `provider="gemini"`
  - `Foza` => `target="gpu"`, `provider="foza"`
- UI must not infer a different branch than the selected quick state.

### SSOT Rules
- Vercel `/api/runtime/mode` must first read persisted upstream state from CPU backend `/v1/runtime/mode`.
- Only when upstream state is unavailable may Vercel fall back to env-derived defaults.
- CPU backend stores `provider` together with `target/gpu_url/updated_at` in both `/v1/runtime/mode` and `/v1/runtime/state`.

### Client Provider Normalization
- Any component reading `localStorage.llm_provider` must use `normalizeRuntimeProvider()`.
- Anti-pattern banned: local whitelists like `p === "gemini" || p === "server"`.
- Reason: that pattern silently downgrades `foza` to `server`, causing UI and actual runtime branch to diverge.

## Local Postgres Demo (2026-06-14)

### Stack Layout
- Local chat persistence DB lives in `postgres-platform/`.
- Compose target:
  - container: `aimed-postgres`
  - db: `aimed`
  - user/pass: `postgres/postgres`
  - port: `5432`
- When `memgraph-lab` is on `3000`, frontend local test must use `3001`.

### Minimum Schema
- Required tables for `/api/conversations/*`:
  - `conversations(id, user_id, title, created_at, last_active)`
  - `conversation_messages(id, conv_id, role, content, created_at)`
- Required indexes:
  - `idx_conversations_user_last_active`
  - `idx_conversation_messages_conv_created`

### Env Contract
- Local Next.js reads DB connection from `.env.local`.
- Canonical local URL:
  - `postgresql://postgres:postgres@127.0.0.1:5432/aimed?sslmode=disable`
- Keep `DATABASE_URL`, `POSTGRES_URL`, and `POSTGRES_URL_NO_SSL` aligned to the same local URL during local DB tests.

### Verification Path
- Shell smoke:
  - `GET /api/db/ping`
  - `POST /api/conversations/save`
  - `GET /api/conversations/list`
  - `GET /api/conversations/load`
- Browser verification must repeat the same calls from the local web origin to confirm the app uses the same DB config as the shell.

## LangGraph Prompt Safety (2026-06-14)

### Triage Router Prompt
- File: `cpu_server/langgraph_agent/triage_router.py`
- `ChatPromptTemplate.from_messages(...)` uses LangChain template formatting semantics.
- Any literal JSON schema example embedded in a prompt message must escape braces:
  - `{{` instead of `{`
  - `}}` instead of `}`

### Failure Mode
- If raw JSON braces are left unescaped inside the prompt template, semantic-router render can fail before the LLM call with:
  - `Invalid format specifier in f-string template. Nested replacement fields are not allowed.`
- Observable effect in app:
  - `/api/agent-chat` falls back to `langgraph_failed`
  - UI shows `Xin lỗi, hiện agent đang gặp sự cố khi chạy LangGraph. Bạn thử lại giúp mình nhé.`

### Verification Rule
- After changing LangGraph CPU code, restart the local CPU server on `127.0.0.1:8000`; Next.js hot reload alone is not enough.
- Minimal regression path:
  - run `python -m pytest cpu_server/tests/test_langgraph_triage.py -q`
  - run local smoke on `/api/agent-chat`
  - verify in browser with a fresh conversation, not an old cached failed thread

## SystemState + Internal Demo Pass (2026-06-14)

### Internal Demo Pass
- Source of truth is now `INTERNAL_DEMO_PASS` only.
- Shared resolver lives in `medical-consultation-app/lib/runtime-sync.ts`.
- Routes using the shared resolver:
  - `/api/agent-chat`
  - `/api/llm-chat`
  - `/api/live/access`

### SystemState
- Shared interface `SystemState` is defined in `medical-consultation-app/lib/runtime-sync.ts`.
- Canonical fields:
  - `provider`, `mode`, `graph_connected`, `graph_injected`, `graph_reason`
  - `db_ok`, `fallback`, `error`, `demo_mode`
- Optional diagnostics kept inside the same object:
  - `fallback_chain`, `graph_endpoint`, `graph_status_code`, `graph_latency_ms`, `db_latency_ms`, `internal_pass_matched`

### UI Contract
- `/api/runtime/mode` probes DB + graph and returns `system_state` as the bootstrap source for client UI.
- `/api/agent-chat`, `/api/llm-chat`, `/api/live/access` attach `metadata.system_state` so client state stays aligned with the actual backend branch used.
- `chat-interface.tsx` now hydrates and refreshes UI from backend `SystemState` instead of polling `/api/db/ping` and inferring graph/runtime state separately.
- Context dialog can open even when graph fails and shows `graph_reason` plus `fallback_chain` from backend state.

### Demo Boot
- `start_demo_ngrok.bat` is the one-click demo entry:
  - starts CPU + graph + ngrok
  - waits for local `/health`
  - captures ngrok public URL when available
  - starts frontend on the first free port from 3000 upward
- `cpu_server/launcher/run_cpu_server_ngrok.py` now waits for CPU `/health` before declaring readiness and prints graph status summary.

## LangGraph Follow-up Triage (2026-06-14)

### State Schema
- `cpu_server/langgraph_agent/state.py` dùng **Pydantic v2** làm state schema cho LangGraph.
- State triage mới được track xuyên suốt graph:
  - `symptoms_collected`
  - `risk_level`
  - `ready_for_cta`
  - `triage_follow_up_questions`
  - `semantic_router_trace`

### Graph Flow
- Flow LangGraph hiện tại: `route -> tools -> reasoning -> llm`.
- `route`: guardrails + intent ban đầu + plan tool.
- `tools`: luôn ưu tiên `graph.evidence` để có grounding context.
- `reasoning`: dùng **LCEL semantic router** để đọc `user message + graph evidence` và cập nhật state triage.
- `llm`: sinh câu trả lời tự nhiên dựa trên triage state, đồng thời sanitize để không rò rỉ JSON keys/technical metadata.

### Triage Policy
- Ca nhẹ/chưa đủ dữ kiện (ví dụ `sốt nhẹ`, đau họng nhẹ): tiếp tục hỏi follow-up, `ready_for_cta = false`.
- Ca red-flag (ví dụ `đau ngực + khó thở`): route `risk_level = emergency`, `ready_for_cta = true`, khuyên gọi `115` ngay.
- Fallback action cho `triage` chỉ bật CTA khi risk đã đủ cao; không auto đẩy hẹn bác sĩ cho ca nhẹ.

### Runtime Metadata
- `cpu_server/langgraph_agent/runtime.py` đưa triage state vào `metadata.llm_context.triage`.
- Metadata này là nguồn truth cho debug live/demo khi cần xác định agent vì sao follow-up hay escalate.

### Regression Tests
- Python regression test mới: `cpu_server/tests/test_langgraph_triage.py`
- Covered cases:
  - `sốt nhẹ` -> tiếp tục follow-up, không rò rỉ `risk_level` / `ready_for_cta` ra hội thoại.
  - `đau ngực` -> route khẩn cấp, có khuyến nghị `115`.
