## 2026-03-19

- Hoàn thiện demo agent function calling: /api/agent-chat trả actions allowlist, frontend có thể điều hướng tự động (ví dụ /sang-loc).
- Ổn định demo bằng metadata mode/provider nhất quán và fallback rule-based khi Gemini lỗi/thiếu key.

## 2026-03-20

- Thêm agent provider local (OpenAI-compatible): ép output JSON `{response, actions}` và parse/lọc allowlist trước khi điều hướng.
- Mở rộng agent action/tool: `speak` để kích hoạt TTS (tool nặng) từ agent.
- Thêm Gemini STT/TTS server-side để chạy ổn trên Vercel và Live mode demo trong /tu-van.

## 2026-05-04

- Ổn định module patient-scenarios: cải thiện detectPatientScenario (ưu tiên theo mức rủi ro) và getConsultationStylePrompt (tạo prompt đầy đủ kèm tools + follow-up).
- Sửa test suite để chạy ổn trên Vitest (không phụ thuộc alias `@/` trong unit tests).

## 2026-05-08

- Chuẩn hoá allowlist điều hướng theo 1 nguồn SSOT (`ALLOWED_PATH_PREFIXES`) và dùng chung cho local-agent prompt + server enforcement.
- Tắt forced-actions theo mặc định (bật qua env) để tránh agent tự ý đẩy action gây nhiễu.
- Sửa bug `/api/youtube/video` (static method) và thêm cache TTL trong YouTube service; hỗ trợ hydrate `recommend_music` từ YouTube results.
- Sửa các module DB (agent-registry/device-sync/appointments/content-recommendations) để không throw khi thiếu `DATABASE_URL` trong build; `next build` chạy được.

## 2026-05-11

- Chuẩn hoá `conversationId` về UUID (client + stub backend) và chặn save nếu `conversationId` không phải UUID để tránh lỗi 500 trên production.
- Thêm script purge dữ liệu hội thoại legacy (non-UUID) theo mặc định; có tuỳ chọn xoá toàn bộ nếu cần reset.

## 2026-05-13

- Chuẩn hoá /api/agent-chat theo hybrid auto: đọc `data/runtime-mode.json` để ưu tiên GPU/CPU, fallback Gemini khi cần, và cập nhật SSOT khi GPU→CPU.
- Bổ sung tool calling server-side theo pattern mcp-lite (web/youtube) và ghi runtime events/metrics cho agent.

## 2026-05-18

- Thêm Agent Profiles (default/thuốc/kế hoạch): UI gửi `agent_id`, backend inject persona cho Gemini + local provider, và trả `metadata.agent_profile`.
- Nâng cấp local OpenAI-compatible agent provider hỗ trợ persona để chuẩn bị swap GPU endpoint sang vLLM self-host.
- Bổ sung profiles triage (red flags) và tâm lý trị liệu theo cùng cơ chế `agent_id` để mở rộng multi-agent theo vai trò.
- Thêm LLM provider `foza` (OpenAI-compatible) cho `/api/llm-chat` và UI provider toggle (server/gemini/foza).
- Thêm FOZA “tool + JSON” cho `/api/agent-chat`: tool_calls chỉ dùng cho MCP tools (web/youtube), sau đó luôn finalize bằng JSON-in-content `{response, actions}` để parse actions ổn định.

## 2026-05-22

- Thêm vitest config resolve alias `@/*` để unit tests import trực tiếp Next route không lỗi.
- Bổ sung/ổn định test fallback rule-based cho agent tư vấn (default) và agent tâm lý (therapy); đảm bảo actions điều hướng đúng feature.
- Thêm integration tests gọi LLM thật (Gemini/Foza) cho `/api/agent-chat`, mặc định skip và bật bằng env `RUN_LLM_INTEGRATION_TESTS=1`.
- Sửa lỗi UI scroll/composer ở /tu-van và /tam-su: chuẩn hoá ScrollArea bắt ref/onScroll đúng viewport, sửa overflow của messages container, và cố định chiều cao ChatInterface theo padding RootLayout để đóng popup không làm mất thanh chat.
- CPU server launcher tự bật Memgraph (docker compose) và thêm Graph Gateway `/v1/graph/status`, `/v1/graph/evidence` để cung cấp “truth context” cho agent/FOZA qua proxy `/api/backend/*`.
- Agent mode tự gọi graph evidence và trả `metadata.llm_context`; UI thêm nút xem context để demo hội đồng.
- Ổn định hội thoại DB: client dùng `userId` ổn định (không phụ thuộc authToken), API list/save chấp nhận userId dạng UUID hoặc token-hash; list/load hỗ trợ GET để tương thích; script lint dùng ESLint.
- UI chat /tu-van: bỏ height calc cứng, chuyển ChatInterface sang `flex-1/min-h-0`; composer “sticky bottom” và thêm scroll anchoring theo ResizeObserver để giảm nhảy khi composer đổi chiều cao; tăng ngưỡng virtual list để giảm giật khi message cao thấp không đều.
- UI Agent: thêm intro/preamble (tách thành 1 message riêng, 1 lần mỗi hội thoại khi bật Agent mode) và banner trạng thái (profile/mode/provider/graph/tools) lấy từ `metadata` để giảm cảm giác “agent nói 1 khối khó hiểu”.
- Graph stability: gateway `mcp/call` có timeout + retry/backoff cho graph tools; CPU server tự reset/reconnect graph driver; UI hiển thị graph indicator (connected/latency) khi bật Agent mode.
- EPIC demo: thêm trang `/agent-hub` (Agent Hub) để giới thiệu profiles và kịch bản demo 1-click (copy prompt, mở /tu-van bật Agent mode).
- DB stability: chuẩn hoá `/api/db/ping` dùng cùng pool (pg) như conversations, có retry nhẹ; UI hiển thị badge DB (ok/down + latency) trong sidebar khi đăng nhập.
- Doctor flow + RBAC: thêm auth server-side cho `test_token_*`, chuẩn hoá doctor APIs dùng pg pool/POSTGRES_URL; `/bac-si` có directory từ API; appointments GET/PATCH enforce doctor role.
- Agent semantics: thêm profile `doctor_referral`, rules intent detection và ép `response` luôn có nội dung + follow-up; metadata bổ sung `intent` để debug/demo.
- Tạo `todo.md` và `lessons.md` ở repo root để bám quy trình và làm checklist demo.

## 2026-05-24

- Đồng bộ checklist deploy: mở rộng `DEPLOY.md` để cover routing GPU/CPU, speech integrations, external integrations và biến bật integration tests.
- Bổ sung env còn thiếu vào `.env.sample`: `POSTGRES_URL_NO_SSL`, `RUN_LLM_INTEGRATION_TESTS`.
- Thêm smoke script PowerShell `medical-consultation-app/smoke.ps1` để test nhanh `/api/db/ping`, `/api/conversations/*`, `/api/mcp/call (graph.status)` cho local/Vercel.
- UI ổn định khung chat: `scrollToBottom` dùng `messagesContainer.scrollTo` (tránh body scroll gây nhảy), bỏ `sticky` ở composer và thêm padding-bottom bù MobileBottomNav + safe-area để tránh bị che khi focus input.

## 2026-05-25

- CPU server: scaffold LangGraph agent (`cpu_server/langgraph_agent/`) và endpoint `/v1/agent-chat` trả `{response, actions, metadata}` để chuẩn bị thay thế hoàn toàn `/api/agent-chat` trên Next.js.
- CPU server: bổ sung deps Python cho LangGraph (`langgraph`, `langchain-core`, `langchain-community`) vào `cpu_server/requirements.txt`.
- Next.js: `/api/agent-chat` ưu tiên proxy 100% sang CPU server `/v1/agent-chat` khi có `CPU_SERVER_URL`, và sanitize actions theo allowlist trước khi trả về UI.
- Sửa hiển thị tiếng Việt khi test bằng PowerShell: ép `Content-Type: application/json; charset=utf-8` cho `/api/agent-chat` và `/v1/agent-chat`.
- Bổ sung biến môi trường LangGraph (`LG_*`) vào `.env.sample` và `DEPLOY.md` để deploy/local không thiếu cấu hình tool budget/timeout.

## 2026-05-26

- TTS: tích hợp Supertonic local vào `/api/text-to-speech` và `/api/text-to-speech-stream` (ưu tiên local khi cấu hình), fallback Gemini rồi CPU server; thêm env `TTS_PROVIDER` và nhóm `SUPERTONIC_TTS_*` vào `.env.sample`.
- Observability: mọi lượt gọi TTS ghi `runtime-events.jsonl` và `runtime-metrics.jsonl` để theo dõi provider/latency.
- CPU server: TTS endpoints ưu tiên Supertonic local qua `CPU_TTS_PROVIDER`/`TTS_PROVIDER` + `SUPERTONIC_TTS_URL`, fallback gTTS/GPU.
- TTS: chuẩn hoá text tiếng Việt cho ngữ cảnh y tế (mmHg, mg/dL, mmol/L, bpm, °C, liều mg/mL...) trước khi synth để đọc tự nhiên hơn.

## 2026-06-12

- FOZA Agent: thêm circuit breaker in-memory để tránh FOZA timeout lặp lại gây cascade fallback khó debug (`FOZA_CIRCUIT_FAIL_THRESHOLD`, `FOZA_CIRCUIT_OPEN_MS`).
- Agent metadata: bổ sung `requested_provider`, `root_cause`, `fallback`, `fallback_chain` để làm rõ lỗi gốc khi failover FOZA/GPU/CPU/Gemini.
- DB: chuẩn hoá `DATABASE_URL` để tự nâng `sslmode=require|prefer|verify-ca` → `sslmode=verify-full` (giữ semantics an toàn và tránh cảnh báo `pg-connection-string`).
- **Agent bugfix (2026-06-12T12:36):** sửa 4 bug gốc xác nhận từ code:
  - BUG-1: bỏ `catch {}` rỗng ở proxy CPU `/v1/agent-chat` → thêm `cpu_proxy_error` vào metadata.
  - BUG-2: Gemini fail (non-429) → trả safety fallback y tế an toàn cho triage/medication; `gemini_error` rõ ràng trong metadata.
  - BUG-3: `graph.evidence` không còn gọi localhost trên Vercel khi thiếu `CPU_SERVER_URL` → trả `graph_disabled_no_cpu_url` ngay lập tức.
  - BUG-4: thêm `graph_reason/status_code/endpoint` vào mọi nhánh `llm_context`; phân loại `graph_404|graph_timeout|graph_down|graph_empty`.
  - Provider chain: FOZA giờ được thử tự động khi `agentProvider === "auto"` nếu có `FOZA_TOKEN` + `LLM_MODEL_NAME`.
  - UI: badge graph hiển thị reason chi tiết; context panel có diagnostic block cho `gemini_error`/`cpu_proxy_error`.
  - Build: `npm run build` pass hoàn toàn, 0 lỗi mới.

## 2026-06-13

- P0 demo starter: nâng cấp `start_demo_ngrok.bat` thành entry 1-click, chờ CPU `/health`, đọc ngrok public URL, rồi mở frontend trên cổng trống.
- CPU launcher: `run_cpu_server_ngrok.py` chờ health trước khi báo ready và in graph status summary để debug demo nhanh hơn.
- Runtime/UI sync: thêm `lib/runtime-sync.ts`; `chat-interface.tsx` sync provider/mode từ backend metadata sang event bus/storage, `compute-toggle.tsx` đọc cùng nguồn truth.
- Internal demo pass: thống nhất resolver `INTERNAL_DEMO_PASS -> AGENT_KEY_PASS -> 1234567` cho `/api/agent-chat`, `/api/llm-chat`, `/api/live/access`.
- UI degrade: sidebar conversations đổi từ lỗi cứng sang trạng thái "Đang dùng local cache" khi DB/list backend lỗi nhưng local history vẫn dùng được.
- Verification: VS Code diagnostics sạch cho các file TS/TSX vừa sửa; `python -m py_compile cpu_server/launcher/run_cpu_server_ngrok.py` pass.

## 2026-06-14

- Hotfix graph contract: `cpu_server/server.py` chuẩn hóa `/v1/graph/status` và `/v1/graph/evidence` theo Pydantic v2 với `graph_connected/status_code/reason/latency`, đồng thời giữ alias cũ để UI không gãy.
- Next.js gateway: `app/api/mcp/call/route.ts` bỏ fallback localhost, chỉ đọc `CPU_SERVER_URL`, thêm strict typing cho graph payloads và phân loại rõ `graph_404 | graph_timeout | graph_down`.
- Degrade path: graph failure luôn trả JSON chẩn đoán cho UI/Context Viewer (`reason/status_code/upstream/error_kind`), không làm app crash khi Vercel gọi vào ngrok 404 hoặc timeout.
- Verification: VS Code diagnostics sạch; `python -m py_compile cpu_server/server.py` pass; `npm exec eslint app/api/mcp/call/route.ts` pass (chỉ còn warning `MODULE_TYPELESS_PACKAGE_JSON` từ Node, không phải lỗi lint).
- UI/runtime auth sync: thêm `SystemState` vào `lib/runtime-sync.ts`, chuẩn hoá resolver `INTERNAL_DEMO_PASS` cho `/api/agent-chat`, `/api/llm-chat`, `/api/live/access`.
- Runtime bootstrap: `/api/runtime/mode` giờ probe DB + graph và trả `system_state` để UI khởi tạo từ backend truth.
- Chat UI: `chat-interface.tsx` poll `/api/runtime/mode`, context dialog luôn mở được kể cả graph fail và hiển thị `graph_reason` + `fallback_chain`, popup API/pass không còn tự chặn khi `demo_mode` đã hợp lệ.
- Header toggle: `compute-toggle.tsx` đọc `system_state` từ backend thay cho local heuristics.
- Verification: VS Code diagnostics sạch trên toàn bộ file đã sửa. `npm exec tsc -- --noEmit` vẫn fail do lỗi nền sẵn có ngoài scope hiện tại (test typings, missing ambient types cho `pg`/`uuid`/`@sentry/nextjs`, và vài lỗi lib cũ chưa liên quan).

## 2026-06-04

- LLMOps production: thêm `core_lib/llmops/` (Pydantic v2 settings, JSONL logging sink, LangSmith tracing wrapper, guardrails prompt injection + anti-hallucination grounding, RAGAS evaluation runner).
- LangGraph CPU orchestrator: bọc node transitions bằng observer (events/metrics + LangSmith runs) và bật policy “context rỗng → fallback/search hoặc hỏi thêm”, không đoán cho các profile rủi ro (triage/thuốc).
- Evaluation: thêm pytest suite `tests/eval/` (blackbox HTTP + in-process) và script `scripts/llmops_eval.ps1`.

## 2026-05-27

- Runtime SSOT ổn định hơn: `/api/agent-chat` tự tạo `data/runtime-mode.json` + `data/server-registry.json` khi thiếu để tránh lệch mode ở lần chạy đầu.
- JSON charset: `/api/runtime/mode` và `/api/llm-chat` trả `application/json; charset=utf-8` để PowerShell không bị mojibake tiếng Việt.
- i18n không 404: thêm `/[locale]/*` catch-all để điều hướng về route gốc tương ứng khi chưa có page dưới `[locale]`.
- Local demo full green: thêm Postgres docker compose (`postgres-platform/`) + init schema tối thiểu (conversations/messages); bật Memgraph docker compose (`memgraph-platform/`) để `graph.status` connected.
- CPU server LangGraph: tối ưu latency tool bằng cache TTL (web/youtube/graph) + chạy song song tools; bổ sung đo thời gian tools (`metadata.tool_elapsed_ms`, `metadata.tool_durations`) và retry FOZA cho 408/429/5xx.
- CPU server FOZA: `FOZA_REQUEST_TIMEOUT_MS` được hiểu theo ms (tự quy đổi sang giây) và reuse HTTP session để giảm overhead kết nối.
- Demo bảo vệ: thêm checklist Vercel → CPU public và smoke script PowerShell `scripts/demo-smoke-vercel.ps1`.
- Luận văn: thêm script sinh phụ lục đánh giá agent từ report matrix (bảng + biểu đồ Mermaid) xuất `thesis/APPENDIX_AGENT_EVALUATION.md` + CSV.

## 2026-05-29

- **GÓI BẢO VỆ HOÀN THIỆN:**
  - LLMOps-lite: protocol (metric, gating, reproducibility), script sinh phụ lục runtime metrics/events (bảng + biểu đồ Mermaid), CSV artifacts.
  - Script 1-lệnh kiểm thử toàn hệ thống: `llmops-run.ps1` (smoke → agent-matrix → sinh appendices → gate pass/fail).
  - Hướng dẫn hội đồng: `thesis/MANUAL_HOI_DONG.md` (bước-by-bước, checklist, artefact paths).
  - Tổng quan thesis: `thesis/README.md` (mapping nội dung chương/phụ lục, artefact paths).
- **Todo cập nhật:** đánh dấu các phần hoàn thành (EPIC0,3,5,6; gói bảo vệ; LLMOps-lite).
- **Memory Bank cập nhật:** `activeContext.md` để phản ánh gói bảo vệ hoàn thiện.

## 2026-06-02

- Thiết lập SSOT quy trình repo: thêm `_workspace/00_logic.md`, `_workspace/01_module_registry.md`, `_workspace/02_change_log.md`.
- Thêm tài liệu/visuals: `_workspace/docs/ui_style_guide.md`, `_workspace/docs/project_overview.html`.
- Chuẩn hoá env docs cho Windows/PowerShell: cập nhật `medical-consultation-app/ENV_SETUP.md` và làm mới `medical-consultation-app/env.example` để bám `.env.sample`.
- DB stability (EPIC1): `/api/db/ping` không còn trả 5xx khi DB down; conversations routes trả JSON utf-8 và `reason=db_unavailable` khi DB lỗi để UI fallback localStorage.
- Tests: thêm unit tests cho DB stability contracts (`lib/__tests__/db-stability.test.ts`).
- UI chat stability (EPIC2): ChatInterface auto-scroll chỉ khi at-bottom/just-sent, key message ổn định; VirtualChatList đổi auto-scroll sang requestAnimationFrame.
- RBAC ownership (EPIC5): `/api/appointments` hỗ trợ `GET ?id=` và enforce ownership theo `doctor_id`; thêm unit tests `lib/__tests__/appointments-rbac.test.ts`.
- Booking validation: `POST /api/appointments` bắt buộc `doctor_id` tồn tại trong `doctor_profiles` trước khi insert; API auto-seed demo doctor_profiles từ TEST_ACCOUNTS khi DB bật.
- QA: chạy `npm run lint`, `npm test`, và `npm run build` đều pass.
