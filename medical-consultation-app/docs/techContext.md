## Agent providers

- Gemini API: dùng native tool/function calling (generateContent + functionDeclarations).
- Local LLM: dùng OpenAI-compatible `/v1/chat/completions`, ép output JSON `{response, actions}`; hỗ trợ inject persona theo `agent_id` để tái sử dụng cho vLLM self-host.
- Foza (OpenAI-compatible): Agent mode ưu tiên JSON-in-content `{response, actions}`; tool_calls chỉ dùng cho MCP tools (web/youtube), sau đó luôn “finalize” bằng JSON ổn định ở content.

## LLM providers (chat)

- `LLM_PROVIDER=server|gemini|foza`:
  - `server`: gọi FastAPI (GPU/CPU) theo SSOT `runtime-mode.json`.
  - `gemini`: gọi Gemini REST.
  - `foza`: gọi OpenAI-compatible `/chat/completions` qua `FOZA_BASE_URL` + `FOZA_TOKEN`.
- `FOZA_BASE_URL`: base URL OpenAI-compatible (mặc định `https://api.foza.ai/v1`).
- `FOZA_TOKEN`: bearer token cho Foza.
- `LLM_MODEL_NAME`: model name cho Foza (ví dụ `cinb/gemini-3.1-flash-lite`).

## Agent profiles

- Registry: `lib/agent-profiles.ts` (default / triage / medication / care_plan / therapy).
- UI gửi `agent_id` trong Agent mode; backend trả `metadata.agent_profile` để trace theo profile.

## Agent flags

- `AGENT_FORCE_ACTIONS=1`: bật heuristic forced-actions (mặc định tắt).
- `AGENT_HYDRATE_YOUTUBE=0`: tắt việc hydrate `recommend_music` từ YouTube service (mặc định bật).

## Agent budgets/timeouts (chung)

- `AGENT_CHAT_TIMEOUT_MS` (default 45000): deadline tổng cho 1 lượt `/api/agent-chat` (Gemini/OpenAI-like).
- `AGENT_CHAT_LOCAL_TIMEOUT_MS` (default 20000): timeout mỗi request OpenAI-compatible (local/vLLM/GPU/CPU) trong Agent mode.
- `AGENT_CHAT_GEMINI_TIMEOUT_MS` (default 20000): timeout mỗi request Gemini trong Agent mode.
- `AGENT_CHAT_MCP_TOOL_TIMEOUT_MS` (default 8000): timeout mỗi lần gọi `/api/mcp/call` trong Agent mode.
- `AGENT_CHAT_MCP_MAX_CALLS` (default 3): số tool calls tối đa mỗi lượt Gemini trước khi tổng hợp lại prompt.

## Foza budgets/timeouts (Agent)

- `FOZA_TOOL_MAX_ROUNDS` (default 3): số vòng tool-calling tối đa trước khi ép finalize JSON.
- `FOZA_TOOL_MAX_CALLS` (default 3): số tool calls tối đa mỗi vòng (chỉ áp dụng cho MCP tools).
- `FOZA_REQUEST_TIMEOUT_MS` (default 20000): timeout mỗi request gọi Foza.
- `FOZA_MCP_TOOL_TIMEOUT_MS` (default 8000): timeout mỗi lần gọi `/api/mcp/call`.
- `FOZA_AGENT_TIMEOUT_MS` (default 35000): deadline tổng cho 1 lượt `/api/agent-chat` khi dùng Foza.

## YouTube

- YouTube service có cache TTL in-memory (search/details/wellness) để giảm quota/latency và ổn định kết quả khi đề xuất.

## MCP-lite

- `/api/mcp/tools`: trả danh sách tools + JSON schema (web.search, youtube.search, youtube.video, youtube.recommend_music).
- `/api/mcp/call`: thực thi tool theo `{ name, args }` và trả `{ result, metadata }`.

## Graph Gateway (CPU server)

- CPU server cung cấp `/v1/graph/status`, `/v1/graph/evidence` để lấy evidence từ Memgraph/Neo4j qua Bolt.
- Env (CPU server): `GRAPH_BOLT_URL` (default `bolt://127.0.0.1:7687`), `GRAPH_USER`, `GRAPH_PASSWORD` (optional), `GRAPH_API_KEY` (optional).
- Launcher: `CPU_NO_GRAPH=1` để tắt tự khởi động graph; `GRAPH_FORCE_IMPORT=1` để import lại từ `graph/memgraph-export.cypherl`.
- Agent mode: `/api/agent-chat` tự gọi `graph.evidence` (MCP tool) và inject vào persona; UI có nút xem `metadata.llm_context`.

## Audio (Vercel)

- STT/TTS dùng Gemini server-side bằng `@google/genai` cho `/api/speech-to-text` và `/api/text-to-speech` (kèm stream).

## Integration tests (LLM thật)

- `RUN_LLM_INTEGRATION_TESTS=1`: bật test gọi LLM thật qua `/api/agent-chat` (mặc định auto-skip).
- Gemini (E2E): cần `GEMINI_API_KEY`.
- Foza (E2E): cần `FOZA_TOKEN` + `LLM_MODEL_NAME` (+ tuỳ chọn `FOZA_BASE_URL`).
