# Current Logic (SSOT)

## UI Upgrade — admin runtime (2026-06-19)

### Admin server operations
- `/admin/server` remains the runtime operations workspace for admin-only server control.
- Auth gate is unchanged:
  - read `localStorage.authToken`
  - call `/api/backend/v1/user`
  - only allow role `ADMIN`
  - non-admin redirects to `/`, missing/invalid token redirects to `/login`
- Data load contract is unchanged:
  - `/api/servers` for registry
  - `/api/servers/logs` for add/update history
  - `/api/runtime/events` for runtime transitions/fallback history
- GPU URL update behavior is unchanged:
  - save/update server via `POST /api/servers`
  - then sync runtime target via `POST /api/runtime/mode` with `{ target: "gpu", gpu_url }`
- Health check behavior is unchanged:
  - `POST /api/servers/check` probes a server URL
  - result is persisted back into `/api/servers` as `active|inactive`
- Colab sync behavior is unchanged:
  - `POST /api/servers/colab-update` updates the `colab-ngrok` entry without changing page flow
- Cleanup actions are unchanged:
  - `DELETE /api/runtime/events` clears runtime history
  - conversation purge deletes backend conversations from `/api/backend/v1/conversations/*`
  - local cache purge removes `conv_messages_*` and `conv_title_*` from localStorage
- UI shell has changed only at the presentation layer:
  - `PortalShell` provides the admin page frame
  - `StatCard` summarizes server count, active count, and runtime event count
  - `SectionCard` groups GPU URL update, danger zone, registry table, logs table, and runtime events table

### Admin management hub
- `/quan-ly` remains the root admin entry page protected by `RoleGuard roles=["ADMIN"]`.
- The page does not own operational data yet; it acts as a visual workspace router to:
  - `/quan-ly/user`
  - `/quan-ly/data`
  - `/quan-ly/config`
  - `/admin/server`
- UI shell now follows the shared admin dashboard pattern:
  - `PortalShell` for header + aside layout
  - `StatCard` for high-level admin workspace summary
  - `SectionCard` for operating priorities and navigation grid
- Navigation behavior is unchanged:
  - each card still routes directly to the target workspace
  - no new API calls were introduced at `/quan-ly`

### Admin child workspaces
- `/quan-ly/user`, `/quan-ly/data`, and `/quan-ly/config` remain admin-only pages behind `RoleGuard roles=["ADMIN"]`.
- Current implementation is intentionally presentation-only:
  - no new fetch calls
  - no save/update/delete behavior
  - no fake backend state introduced
- `/quan-ly/user` now acts as a readiness view for:
  - user list and filters
  - role assignment and account updates
  - future audit/activity notes
- `/quan-ly/data` now acts as a readiness view for:
  - medical taxonomy/disease/drug/symptom datasets
  - import/export pipelines
  - normalization and revision-aware data handling
- `/quan-ly/config` now acts as a readiness view for:
  - secrets/environment groups
  - runtime/endpoints overview
  - notification/guardrail settings
- All three pages now share the same shell invariants:
  - `PortalShell` page frame
  - `StatCard` summary strip
  - `SectionCard` grouped operational notes and structured placeholders

### Agent Hub
- `/agent-hub` remains the product/demo showcase page for agent profiles and guided scenarios.
- Data source is unchanged:
  - profiles come from `getAllAgentProfiles()`
  - demo scenarios are defined inline in the route component
- Interaction logic is unchanged:
  - copy uses `navigator.clipboard.writeText`
  - opening a scenario still stores `mcs_agent_mode_v1=1`
  - the prompt is still stored in `mcs_demo_prompt_v1`
  - then the page routes to `/tu-van`
- UI shell now follows the shared dashboard pattern:
  - `PortalShell` for the main frame
  - `StatCard` for profile/scenario/feature summary
  - `SectionCard` for profile overview, demo scenarios, and operator guidance

### Account page constraint
- `/account` has been refactored from an oversized single file into:
  - route orchestrator: `app/account/page.tsx`
  - controller hook: `components/account/use-account-page-controller.ts`
  - presentation/helpers: `components/account/*`
- Route behavior is unchanged:
  - loads user profile from `/api/backend/v1/user` when token exists
  - falls back to local `profile` store when backend data is unavailable
  - loads/saves consent through `/api/backend/v1/consent`
  - saves profile with multipart form when avatar file exists, JSON otherwise
  - changes password through `/api/backend/v1/user/password`
  - logs out all sessions through `/api/backend/v1/user/sessions/logout-all`
  - runs offboarding through `/api/backend/v1/offboarding`
  - shows account switcher only when `searchParams.get("tab") === "accounts"`
- Avatar processing is unchanged:
  - still uses `app/account/avatar-worker.ts`
  - still compresses before upload and stores object URL preview
- UI shell invariants for `/account` are now:
  - `PortalShell` page frame
  - `StatCard` summary strip
  - `SectionCard` per major functional section
  - sticky-like section navigation delegated to `components/account/account-section-nav.tsx`

### Medical news
- `/tin-tuc-y-khoa` has been refactored into:
  - route orchestrator: `app/tin-tuc-y-khoa/page.tsx`
  - controller hook: `components/medical-news/use-medical-news-controller.ts`
  - presentation/helpers:
    - `components/medical-news/medical-news-search-panel.tsx`
    - `components/medical-news/medical-news-workspace.tsx`
    - `components/medical-news/medical-news-types.ts`
- Route behavior is unchanged:
  - web search still calls `/api/web-search`
  - knowledge references still call `/api/backend/v1/knowledge/search`
  - panel ratio still persists under `mcs_news_right_ratio_v1`
  - topic suggestions still derive from `getCarePlan()` and `getLastScreening()`
- UI shell invariants for `/tin-tuc-y-khoa` are now:
  - `PortalShell` page frame
  - `StatCard` summary strip
  - `SectionCard` for notice, search controls, and the reading workspace
- Loading-state invariant for `/tin-tuc-y-khoa`:
  - `useMedicalNewsController()` still auto-runs `runSearch(...)` on mount
  - the workspace must therefore provide visible loading placeholders for:
    - search results list
    - embed/article area
    - knowledge reference panel
  - when route-level loading is needed, use `app/tin-tuc-y-khoa/loading.tsx` with the same shell language instead of changing controller behavior or adding artificial delays
- Empty-state invariant for `/tin-tuc-y-khoa`:
  - no-result and no-reference cases should render structured dashed placeholders
  - empty states must guide the user to retry or pick suggested topics, not leave plain near-blank text blocks

### Health lookup route
- `/tra-cuu` now uses a route-level shell:
  - `PortalShell` page frame
  - `StatCard` summary strip
  - `SectionCard` wrapping the lookup workspace
- Core lookup behavior is unchanged because the page still dynamically imports `components/health-lookup.tsx`.
- `components/health-lookup.tsx` has now been refactored into:
  - thin wrapper: `components/health-lookup.tsx`
  - controller hook: `components/health-lookup/use-health-lookup-controller.ts`
  - presentation panels:
    - `components/health-lookup/health-lookup-search-panel.tsx`
    - `components/health-lookup/health-lookup-results-panel.tsx`
  - helpers:
    - `components/health-lookup/health-lookup-utils.tsx`
    - `components/health-lookup/health-lookup-types.ts`
- Lookup behavior is unchanged:
  - main answer still comes from `/api/health-lookup`
  - suggestions still come from `/api/health-db/benh` and `/api/health-db/thuoc`
  - knowledge references still come from `/api/backend/v1/knowledge/search`
  - history still persists in localStorage under `healthLookupHistory`
  - result actions still support copy/share
  - `PageAiInsight` still receives `pageContext="health_knowledge"`

### Shared header
- `components/site-header.tsx` is now confirmed as a critical shared-shell component affecting patient/content/admin routes.
- Hook-order invariant:
  - all hooks (`useState`, `useEffect`, `useMemo`) must be declared before any early return branch
  - conditions like `!mounted` or `pathname === '/'` may return `null`, but only after hook declaration is complete
- This invariant was validated during QA after a runtime regression on `/tin-tuc-y-khoa` and `/agent-hub` caused by an early return placed before `useMemo`.

### Theme system
- The project theme stack now has two required pieces:
  - provider: `app/layout.tsx` mounts `components/theme-provider.tsx`
  - control: `components/site-header.tsx` renders `components/theme-toggle.tsx`
- Theme provider config:
  - `attribute="class"`
  - `defaultTheme="system"`
  - `enableSystem`
  - `disableTransitionOnChange`
- QA-verified behavior:
  - clicking the header toggle changes `document.documentElement.className` between `dark` and `light`
  - routes using shared shell inherit the theme state without extra per-page logic
- Architectural note:
  - `dark:*` Tailwind classes across pages/components are effective only after the provider is mounted
  - before GĐ6.2 the provider file existed but was not mounted in `app/layout.tsx`, so dark mode was not truly wired end-to-end

### Role guard behavior
- `components/role-guard.tsx` enforces access in this order:
  - no `authToken` => redirect to `/login`
  - `test_token_*` with disallowed `userRole` => redirect to `/`
  - real token + `/api/backend/v1/user` returns disallowed role => redirect to `/`
  - fetch failure falls back to local `userRole`; missing role => `/login`, disallowed role => `/`
- QA implication:
  - browser smoke tests for `/quan-ly`, `/admin/server`, `/doctor` may land on `/` or localized home when the current session is not admin/doctor
  - this is expected guard behavior, not automatically a route regression
- Demo admin auth invariant:
  - local demo credentials now include `admin.aleian / Demo123!`
  - `app/login/page.tsx` routes `admin -> /quan-ly`, `doctor -> /doctor`, remaining roles -> `/`
  - demo-mode `/api/backend/v1/user` must derive and return `user_id`, `role`, `username`, and `full_name` from the bearer token so role-gated UI can trust the same contract as real backend mode
- Admin shell invariant:
  - `components/site-header.tsx` must switch to admin navigation and `Admin Console` branding when `userRole=admin`
  - `components/account-menu.tsx` must render the `Quản trị viên` badge and an admin-hub shortcut for admin sessions
- Shared role-shell invariant:
  - `components/mobile-bottom-nav.tsx` and `components/floating-quick-menu.tsx` must also branch by `userRole`
  - admin sessions must not reuse patient quick actions on mobile/desktop floating navigation
  - session restore or account switching must redirect by role via `getRoleHomePath()` instead of always sending the user to `/`
- Account hydration invariant:
  - `components/account/use-account-page-controller.ts` must hydrate local session data after mount and expose `sessionReady`
  - account actions that depend on `authToken` (`saveConsent`, `offboard`) must not derive `disabled` directly from a render-time localStorage read
- Demo user isolation invariant:
  - demo backend proxy must isolate `/api/backend/v1/user` and `/api/backend/v1/consent` state per `user_id`
  - switching between patient/doctor/admin demo sessions must not leak `nickname`, `bio`, avatar, or consent flags across accounts
- Optional dependency invariant:
  - `lib/error-tracker.ts` must not statically import `@sentry/nextjs`
  - optional runtime SDKs must be loaded through an indirection layer so production build can stay green when the package is not installed

### Scroll behavior
- Public shell routes tested in GĐ6.3 (`/account`, `/tra-cuu`, `/tin-tuc-y-khoa`) use:
  - `body { overflow: hidden }`
  - `document.scrollingElement === HTML`
- Practical result verified in browser:
  - page scroll still works via `window.scrollY`
  - no scroll-lock regression has been observed yet on these routes

## UI Upgrade — doctor/public booking (2026-06-18)

### Public doctor discovery flow
- `/bac-si` is now the public directory shell for doctor discovery.
- Data source remains `/api/doctor-profile/list`.
- Search/filter behavior is still client-side over the fetched list; UI only changed to dashboard-style cards and quick specialty chips.

### Public doctor profile
- `/bac-si/[doctorId]` remains the public profile endpoint consumer.
- Data source priority:
  1. `/api/doctor-profile/public/[doctorId]`
  2. local fallback only when current logged-in doctor is viewing own profile and DB/public profile is unavailable
- UI changed to hero/profile/info-grid layout; no contract changes were introduced to `DoctorProfilePublic`.

### Public booking
- `/bac-si/[doctorId]/hen` still submits the same appointment payload to `/api/appointments`.
- Required fields are unchanged:
  - `doctor_id`
  - `patient_name`
  - `scheduled_at`
  - `reason`
- Contact fields remain optional:
  - `contact.phone`
  - `contact.email`
- Offline fallback remains mandatory:
  - if `/api/appointments` returns `503`, save booking into local key `mcs_appointments_local_v1`
  - if network/request fails, also save into the same local key

### Doctor appointment inbox
- `/doctor/appointments` is the doctor-facing inbox for bookings created from the public flow.
- Server truth remains `/api/appointments` with `Authorization: Bearer <authToken>`.
- Ownership/auth rule is unchanged:
  - user must have role `doctor`
  - server-side route enforces doctor ownership for GET/PATCH
- When DB/API is unavailable, UI still degrades to local appointments from `mcs_appointments_local_v1`.

### Doctor dashboard and patients
- `/doctor` remains a demo-backed doctor portal dashboard.
- Auth gate is still client-side and based on:
  - `localStorage.authToken`
  - `localStorage.userRole === "doctor"`
  - optional display name from `localStorage.userFullName`
- Dashboard data still comes from `lib/doctor-demo.ts`; the new glass/dashboard shell did not change data contracts.
- `/doctor/patients` also remains demo-backed from `lib/doctor-demo.ts`.
- Patient filtering logic is unchanged:
  - text search matches `name` or `email`
  - `activeOnly` limits rows to status `Hoạt động`
- Patient detail routing is unchanged:
  - row action still navigates to `/doctor/patients/[id]`

### Doctor patient detail
- `/doctor/patients/[id]` remains demo-backed and resolves the patient through `getDemoPatient(id)`.
- Conversation launch behavior is unchanged:
  - query param `conv` wins if present
  - otherwise conversation id falls back to `demo-consult-${patientId}`
- Report creation shortcut is unchanged:
  - still routes to `/doctor/reports/new?patientId=<id>`

### Doctor reports
- `/doctor/reports` still merges 2 sources:
  1. local reports from `mcs_doctor_reports_v1`
  2. demo reports from `lib/doctor-demo.ts`
- Merge order behavior is unchanged:
  - concatenate local first, then demo
  - sort descending by `date`
- Download behavior is unchanged:
  - generates a `.txt` file from `content` if present
  - otherwise synthesizes plain text from report metadata

### Doctor report creation
- `/doctor/reports/new` still auto-composes the title from:
  - `reportType`
  - optional selected patient name
  - `fromDate -> toDate`
- Save behavior is unchanged:
  - creates a local id `dr-*`
  - stores the report in `mcs_doctor_reports_v1`
  - redirects to `/doctor/reports?created=1`

### Doctor forum
- `/doctor/forum` still uses the same core behavior:
  - auth gate via `localStorage.authToken` and `userRole === "doctor"`
  - fetches `/api/doctor-forum/posts`
  - falls back to local key `mcs_doctor_forum_posts_v1` on `503` or request failure
  - blocks posting when `scanPii(title + content)` finds any PII
- Tag parsing behavior is unchanged:
  - comma-separated
  - trim
  - max 12 tags

### Doctor forum detail
- `/doctor/forum/[id]` still resolves a thread by reusing the same forum list source:
  - remote `/api/doctor-forum/posts` when available
  - local key `mcs_doctor_forum_posts_v1` as fallback
- Detail page remains read-only.

### Doctor profile manager
- `/doctor/profile` still keeps the same 3 editing modes:
  - `public`
  - `private`
  - `preview`
- Load order is unchanged:
  1. `/api/doctor-profile/me`
  2. local doctor profile store on failure / db disabled
- Save behavior is unchanged:
  - always save to local store first
  - then attempt `PUT /api/doctor-profile/me`
  - if remote save fails or returns `503`, UI still confirms offline save
- Public preview remains powered by `DoctorProfileView` and public share URL remains `/bac-si/[doctorId]`

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

## Vercel FOZA Env + Deploy (2026-06-14)

### Env Sync
- Local Next.js FOZA verification must cover both:
  - `POST /api/llm-chat` with `provider=foza`
  - `POST /api/agent-chat` with `provider=foza`
- Minimal FOZA env contract for Next.js routes:
  - `FOZA_TOKEN`
  - `LLM_MODEL_NAME`
  - optional `FOZA_BASE_URL` (code falls back to `https://api.foza.ai/v1`)
- Vercel `Development` had to be backfilled with `FOZA_TOKEN`, `LLM_MODEL_NAME`, and `FOZA_BASE_URL`.
- Preview typo cleanup:
  - remove wrong key `FOZA_BASE_UR`
  - current CLI may still block non-interactive `env add ... preview --value ... --yes`
  - workaround used: call Vercel REST API directly with CLI auth token and `upsert=true`
  - Preview now has the correct `FOZA_BASE_URL`.

### Deploy Workaround
- `vercel --prod` can mis-detect the monorepo root from `.vercel/repo.json` and try to package large files outside `medical-consultation-app/`.
- Observable failure:
  - `RangeError [ERR_FS_FILE_TOO_LARGE]: File size (...) is greater than 2 GiB`
- Safe workaround for this repo:
  - create a temp workspace root outside the monorepo
  - keep the same folder shape `temp-root/medical-consultation-app/`
  - copy only the app subtree (exclude `node_modules`, `.next`, `.vercel`, local env files)
  - run `vercel link --project aimed` at the temp root
  - deploy from the temp root so Vercel still resolves `rootDirectory=medical-consultation-app`
- Cleanup after deploy:
  - remove temporary Vercel project artifacts if any accidental project was created during experiments
  - `aimed-vercel-deploy` has been deleted from Vercel

## System QA Snapshot (2026-06-14)

### Automated Checks
- Frontend CI-like checks:
  - `npm run lint` => pass with warnings only
  - `npm run build` => pass with warnings only
  - `npm test` => still red because of one regression
- Backend focused regression:
  - `python -m pytest cpu_server/tests/test_langgraph_triage.py -q` => pass `3/3`

### Runtime Smoke
- Local runtime validated with Next on `127.0.0.1:3001` and CPU backend on `127.0.0.1:8000`
- Verified healthy paths:
  - DB ping
  - conversation save/list/load
  - graph status via MCP gateway
  - Next `/api/agent-chat`
  - CPU `/v1/agent-chat`

### Open Regression
- Fixed automated regression:
  - `medical-consultation-app/lib/__tests__/agent-profiles-fallback.test.ts`
- Fix detail:
  - message `Tôi bị đau ngực và khó thở` with `agent_id=default` now triggers fallback action `ask_navigation -> bac-si`
  - `buildGatewayFallbackActions()` now covers raw urgent triage intent even when `triageMeta` is not active yet

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
