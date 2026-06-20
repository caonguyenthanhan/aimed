## Agent providers

- Gemini API: dùng native tool/function calling (generateContent + functionDeclarations).
- Local LLM: dùng OpenAI-compatible `/v1/chat/completions`, ép output JSON `{response, actions}`; hỗ trợ inject persona theo `agent_id` để tái sử dụng cho vLLM self-host.
- Foza (OpenAI-compatible): Agent mode ưu tiên JSON-in-content `{response, actions}`; tool_calls chỉ dùng cho MCP tools (web/youtube), sau đó luôn “finalize” bằng JSON ổn định ở content.
- LangGraph (CPU server): chạy state machine + tool orchestration trên FastAPI endpoint `/v1/agent-chat`, trả cùng contract `{response, actions, metadata}`; Next.js có thể proxy 100% để “thay thế hoàn toàn” `/api/agent-chat`.

## LLM providers (chat)

- `LLM_PROVIDER=server|gemini|foza`:
  - `server`: gọi FastAPI (GPU/CPU) theo SSOT `runtime-mode.json`.
  - `gemini`: gọi Gemini REST.
  - `foza`: gọi OpenAI-compatible `/chat/completions` qua `FOZA_BASE_URL` + `FOZA_TOKEN`.
- `FOZA_BASE_URL`: base URL OpenAI-compatible (mặc định `https://api.foza.ai/v1`).
- `FOZA_TOKEN`: bearer token cho Foza.
- `LLM_MODEL_NAME`: model name cho Foza (ví dụ `cinb/gemini-3.1-flash-lite`).
- Vercel env trạng thái hiện tại:
  - `Production`: có `FOZA_BASE_URL`, `FOZA_TOKEN`, `LLM_MODEL_NAME`
  - `Development`: đã sync `FOZA_BASE_URL`, `FOZA_TOKEN`, `LLM_MODEL_NAME`
  - `Preview`: đã xoá typo `FOZA_BASE_UR` và đã set đúng `FOZA_BASE_URL`, `FOZA_TOKEN`, `LLM_MODEL_NAME`

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
- `FOZA_CIRCUIT_FAIL_THRESHOLD` (default 3): số lỗi FOZA liên tiếp trước khi “open circuit”.
- `FOZA_CIRCUIT_OPEN_MS` (default 600000): thời gian open circuit trước khi thử FOZA lại.
- `INTERNAL_DEMO_PASS`: pass demo nội bộ ưu tiên cho `/api/agent-chat`, `/api/llm-chat`, `/api/live/access`; nếu thiếu sẽ fallback sang `AGENT_KEY_PASS`, rồi `1234567`.

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

## DB local (Postgres)

- Docker compose: `postgres-platform/docker-compose.yml` (DB `aimed`, user/pass `postgres/postgres`).
- Env (Next.js): `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/aimed?sslmode=disable` (hoặc `POSTGRES_URL_NO_SSL`).
- Init schema tối thiểu: `postgres-platform/init.sql` tạo `conversations` + `conversation_messages` cùng index `idx_conversations_user_last_active` và `idx_conversation_messages_conv_created`.
- Nếu `memgraph-lab` đang dùng `3000`, chạy web local ở `127.0.0.1:3001` để tránh trùng cổng khi test full stack local.

## Audio (Vercel)

- STT: Gemini server-side bằng `@google/genai` cho `/api/speech-to-text`.
- TTS: `/api/text-to-speech` và `/api/text-to-speech-stream` hỗ trợ chọn provider bằng env:
  - `TTS_PROVIDER=auto|supertone|gemini|backend|off`
  - `SUPERTONIC_TTS_URL` (Supertonic `supertonic serve`)
  - `SUPERTONIC_TTS_MODEL`, `SUPERTONIC_TTS_VOICE`, `SUPERTONIC_TTS_SPEED`
  - Gemini TTS: `GEMINI_API_KEY`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`
- CPU server TTS: có thể override bằng `CPU_TTS_PROVIDER` (cùng enum như `TTS_PROVIDER`) để ép ưu tiên local Supertonic thay vì gTTS.
- TTS text normalization: `lib/tts-text.ts` có chuẩn hoá tiếng Việt cho bối cảnh y tế (mmHg, mg/dL, mmol/L, bpm, °C, liều mg/mL...), áp dụng trước khi gọi TTS để đọc tự nhiên hơn.

## Vercel Deploy Notes

- Project `aimed` trên Vercel đang dùng `rootDirectory=medical-consultation-app`.
- Nếu deploy bằng CLI ngay trong monorepo, `.vercel/repo.json` có thể làm CLI package cả repo root và đụng vào các file lớn ở `_models/`, `Archived/`, `DB_ALL/`.
- Workaround đã kiểm chứng:
  - tạo workspace tạm ngoài repo với cấu trúc `temp-root/medical-consultation-app/`
  - copy subtree app, bỏ `node_modules`, `.next`, `.vercel`, `.env`, `.env.local`
  - `vercel link --project aimed` tại `temp-root`
  - `vercel --prod --yes` tại `temp-root`
- Vercel CLI limitation hiện tại:
  - `vercel env add ... preview --value ... --yes` có thể trả `git_branch_required` dù command đã đúng.
  - Có thể bypass bằng REST API:
    - create/update env: `POST https://api.vercel.com/v10/projects/{idOrName}/env?upsert=true&slug={team-slug}`
    - delete project: `DELETE https://api.vercel.com/v9/projects/{idOrName}?slug={team-slug}`

## Integration tests (LLM thật)

- `RUN_LLM_INTEGRATION_TESTS=1`: bật test gọi LLM thật qua `/api/agent-chat` (mặc định auto-skip).
- Gemini (E2E): cần `GEMINI_API_KEY`.
- Foza (E2E): cần `FOZA_TOKEN` + `LLM_MODEL_NAME` (+ tuỳ chọn `FOZA_BASE_URL`).

## LangGraph deps (CPU server)

- `cpu_server/requirements.txt`: thêm `langgraph`, `langchain-core`, `langchain-community`.
- Env (LangGraph CPU orchestrator):
  - `FOZA_REQUEST_TIMEOUT_MS` (default 20000): CPU server dùng theo ms (nếu giá trị nhỏ ≤300 thì hiểu như giây để tiện debug).
  - `LG_MAX_TOOL_CALLS` (default 3, max 6)
  - `LG_TOOL_MAX_WORKERS` (default 3, max 6)
  - `LG_WEB_TIMEOUT_S` (default 10)
  - `LG_WEB_CACHE_TTL_S` (default 300)
  - `LG_YOUTUBE_TIMEOUT_S` (default 10)
  - `LG_YOUTUBE_CACHE_TTL_S` (default 300)
  - `LG_GRAPH_TIMEOUT_S` (default 12)
  - `LG_GRAPH_STATUS_CACHE_TTL_S` (default 2)
  - `LG_GRAPH_EVIDENCE_CACHE_TTL_S` (default 60)
- Demo runtime helper:
- UI foundation (2026-06-18):
  - CSS tokens mới trong `app/globals.css`: `--primary-deep`, `--teal-accent`, `--outline`, `--header-height`, `--mobile-nav-height`.
  - Utility classes mới: `.app-surface`, `.hover-lift`, `.gradient-heading`; giữ cùng hệ với `.glass-panel`, `.card-gradient`, `.input-glow`.
  - Reusable presentation primitives: `components/ui/section-card.tsx`, `components/ui/stat-card.tsx`, `components/portal-shell.tsx`.
  - Consultation shell components: `components/consultation/conversation-history-panel.tsx`, `components/consultation/agent-runtime-banner.tsx` cho khu chat `/tu-van`.
  - Screening presentation helpers: `components/screening/screening-ui.tsx` cho metadata card bài test và option card khi làm bài.
  - Speech presentation helpers: `components/speech/voice-wave-visualizer.tsx` và `components/speech/speech-control-dock.tsx` cho màn `/speech-chat`.
  - Doctor/public-booking flows `app/bac-si/*` và `app/doctor/appointments/page.tsx` đã chuyển sang dùng trực tiếp `PortalShell`, `SectionCard`, `StatCard` thay cho card layout cũ rời rạc.
  - Doctor demo dashboard/pages `app/doctor/page.tsx` và `app/doctor/patients/page.tsx` hiện cũng dùng cùng bộ `PortalShell`, `SectionCard`, `StatCard`; source data vẫn là `lib/doctor-demo.ts`.
  - Doctor detail/report pages `app/doctor/patients/[id]/page.tsx`, `app/doctor/reports/page.tsx`, `app/doctor/reports/new/page.tsx` cũng đã migrate sang cùng shell; storage key report vẫn là `mcs_doctor_reports_v1`.
  - Doctor forum/profile pages `app/doctor/forum/page.tsx`, `app/doctor/forum/[id]/page.tsx`, `app/doctor/profile/page.tsx` cũng đã migrate sang cùng shell; storage keys/flows vẫn là `mcs_doctor_forum_posts_v1` và local doctor profile store.
  - Admin runtime page `app/admin/server/page-client.tsx` cũng đã migrate sang cùng shell; vẫn giữ nguyên contract với `/api/servers`, `/api/servers/logs`, `/api/runtime/events`, `/api/runtime/mode` và các action admin purge/check/sync.
  - Admin hub `app/quan-ly/page.tsx` hiện cũng dùng `PortalShell`, `SectionCard`, `StatCard`; `RoleGuard` tiếp tục là cơ chế bảo vệ quyền truy cập cho root admin workspace.
  - Admin child pages `app/quan-ly/user/page.tsx`, `app/quan-ly/data/page.tsx`, `app/quan-ly/config/page.tsx` đã được đưa về cùng shell; hiện là static readiness dashboards, chưa có data source riêng và vẫn dựa vào `RoleGuard`.
  - `app/agent-hub/page.tsx` hiện cũng dùng `PortalShell`, `SectionCard`, `StatCard`; logic `getAllAgentProfiles()`, demo scenarios và localStorage handoff sang `/tu-van` vẫn giữ nguyên.
  - `app/account/page.tsx` đã được rút gọn thành page orchestrator; controller logic hiện nằm ở `components/account/use-account-page-controller.ts`, còn presentation helpers nằm trong `components/account/` gồm `account-page-types.ts`, `account-section-nav.tsx`, `account-profile-section.tsx`, `account-security-section.tsx`, `account-settings-section.tsx`, `account-special-section.tsx`, `account-messages.tsx`, `account-switcher-section.tsx`.
  - `account` tiếp tục dùng `avatar-worker.ts` cho nén ảnh và `components/account-switcher.tsx` cho multi-account switching; query `?tab=accounts` vẫn là trigger để mở section switcher trong trang tài khoản.
  - `app/tin-tuc-y-khoa/page.tsx` đã được rút gọn thành page orchestrator; controller logic nằm ở `components/medical-news/use-medical-news-controller.ts`, còn presentation helpers nằm ở `components/medical-news/medical-news-search-panel.tsx`, `medical-news-workspace.tsx`, `medical-news-types.ts`.
  - `components/medical-news/medical-news-workspace.tsx` hiện tái dùng `components/ui/skeleton.tsx` cho 3 loading zones (`results`, `embed`, `reference`) và giữ nguyên controller contract; route cũng có thêm `app/tin-tuc-y-khoa/loading.tsx` để che thời gian compile/hydrate bằng cùng shell primitives thay vì dùng global loading rỗng.
  - `app/tra-cuu/page.tsx` hiện dùng shell `PortalShell`, `SectionCard`, `StatCard` ở level route, nhưng vẫn giữ `components/health-lookup.tsx` làm dynamic core component cho toàn bộ logic lookup hiện tại.
  - `components/health-lookup.tsx` nay đã được rút gọn thành wrapper component; controller logic nằm ở `components/health-lookup/use-health-lookup-controller.ts`, còn presentation/helpers nằm ở `components/health-lookup/health-lookup-search-panel.tsx`, `health-lookup-results-panel.tsx`, `health-lookup-utils.tsx`, `health-lookup-types.ts`.
  - Shared shell note: `components/site-header.tsx` có các `useMemo` phụ thuộc role/navigation; mọi hook phải luôn được khai báo trước các nhánh `return null` để tránh hook-order mismatch trong dev hydration/Fast Refresh.
  - Demo auth note: `lib/test-accounts.ts` hiện có `doctor`, `patient`, và `admin` demo accounts; helper `getAllTestAccounts()` là nguồn gom chung cho auth helpers thay vì tự nối mảng ở nhiều nơi.
  - Backend proxy note: `app/api/backend/[...path]/route.ts` trong demo mode đã tự suy ra user từ bearer token và trả `role` trong `/api/backend/v1/user`, giúp `RoleGuard`, `site-header`, và `app/admin/server/page-client.tsx` hoạt động khi không có backend thật; route này hiện cũng cô lập `profile/consent` theo `user_id` để nhiều demo accounts không chia sẻ cùng dữ liệu người dùng.
  - Role-shell note: `components/mobile-bottom-nav.tsx` và `components/floating-quick-menu.tsx` hiện cũng phụ thuộc `userRole` trong localStorage để chọn item set; khi thêm role mới phải cập nhật cả hai để tránh mobile/desktop lệch navigation.
  - Account-session note: `lib/account-manager.ts` đã hỗ trợ `admin` trong `AccountSession`, role badge helpers, và `getRoleHomePath()`; `components/account-switcher.tsx` dùng helper này để route về dashboard đúng role sau khi switch.
  - Account hydration note: `components/account/use-account-page-controller.ts` đã thêm `sessionReady` thay cho việc đọc token trực tiếp trong render; các section action trong `app/account/page.tsx` phải dùng flag này nếu chúng điều khiển `disabled/visibility` dựa vào session local.
  - Error tracking note: `lib/error-tracker.ts` dùng loader gián tiếp để import Sentry optional ở runtime; cách này giữ `@sentry/nextjs` là dependency thật sự tùy chọn và tránh Turbopack build warning khi package chưa được cài.
  - Theme system note: `components/theme-provider.tsx` dùng `next-themes`; từ GĐ6.2 `app/layout.tsx` đã mount `ThemeProvider` với `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, và shared header dùng `components/theme-toggle.tsx` để đổi `light/dark`.
  - `medical-consultation-app/lib/runtime-sync.ts`: shared helper cho demo pass fallback, provider normalization, và browser event `runtime_mode_changed`.

## Production LLMOps (CPU server)

- Config SSOT:
  - `LLMOPS_CONFIG_PATH` (optional): override path to `configs/llmops.yaml`.
- LangSmith (Tracing):
  - `LANGSMITH_API_KEY` (required if tracing enabled)
  - `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`, `LANGSMITH_ENDPOINT` are set from `configs/llmops.yaml` via bootstrap.
- RAGAS (Evaluation judge models):
  - `LLMOPS_EVAL_LLM_BASE_URL`, `LLMOPS_EVAL_LLM_API_KEY` (OpenAI-compatible)
  - `LLMOPS_EVAL_EMBEDDINGS_BASE_URL`, `LLMOPS_EVAL_EMBEDDINGS_API_KEY` (OpenAI-compatible)
  - Enable tests via `LLMOPS_EVAL_ENABLED=1` or `pytest --llmops-eval`.
