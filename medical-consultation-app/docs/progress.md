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
- Runtime quick-switch sync fix: header đổi sang 3 lựa chọn rõ ràng `GPU | Gemini | Foza`; các component phụ không còn làm `foza` rơi ngầm về `server` khi đọc `llm_provider`.
- Vercel/backend sync: `/api/runtime/mode` ưu tiên đọc persisted mode từ CPU backend `/v1/runtime/mode`; `cpu_server/server.py` lưu thêm `provider` trong runtime mode/state để refresh UI không lệch với backend branch đang dùng.
- Verification: VS Code diagnostics sạch cho `compute-toggle.tsx`, `app/api/runtime/mode/route.ts`, `friend-chat-interface.tsx`, `health-lookup.tsx`, `tam-su-minimal.tsx`, `app/speech-chat/page.tsx`; `python -m py_compile cpu_server/server.py` pass.
- Local DB restore: dựng lại `postgres-platform/docker-compose.yml` + `postgres-platform/init.sql`, khởi động `aimed-postgres`, và xác nhận hai bảng `conversations`/`conversation_messages` có mặt trong DB `aimed`.
- Local env wiring: `medical-consultation-app/.env.local` được trỏ về `postgresql://postgres:postgres@127.0.0.1:5432/aimed?sslmode=disable` để `DATABASE_URL`/`POSTGRES_URL`/`POSTGRES_URL_NO_SSL` dùng cùng một source local.

## 2026-06-18

- UI upgrade phase 1: chuẩn hoá tokens `primary/accent/teal`, `outline`, `radius`, `header/mobile-nav safe zone` trong `app/globals.css` theo design spec Clinical Clarity.
- Refactor shared shell: làm mới `components/site-header.tsx`, `components/mobile-bottom-nav.tsx`, `components/floating-quick-menu.tsx` theo glassmorphic/app-like shell thống nhất hơn nhưng giữ nguyên routing và logic auth/runtime hiện có.
- Tạo reusable primitives `components/ui/section-card.tsx`, `components/ui/stat-card.tsx`, `components/portal-shell.tsx` để dùng cho các phase doctor/admin tiếp theo.
- Verification: VS Code diagnostics sạch cho các file mới/sửa; `npm run lint` pass với warning-only từ thư mục `coverage/`; `next build` hoàn tất và sinh đủ route app hiện tại.
- UI upgrade phase 2.1: nâng cấp `components/landing-page.tsx` theo mockup FE mới với hero mới, feature cards, quick access, tech highlight, CTA/footer và chuyển một phần trình bày sang `SectionCard` + `StatCard`.
- Verification phase 2.1: `landing-page.tsx` diagnostics sạch; `npm run lint` pass (warning-only cũ từ `coverage/`); `next build` pass, vẫn còn warning nền sẵn có `@sentry/nextjs` là optional dependency ngoài phạm vi sửa giao diện.
- UI upgrade phase 2.2: nâng cấp `/tu-van` theo design FE mới nhưng không chạm logic chat lõi. `components/chat-interface.tsx` được làm mới shell ngoài cùng, tách `components/consultation/conversation-history-panel.tsx` và `components/consultation/agent-runtime-banner.tsx` để giảm độ phình file và tái sử dụng tốt hơn.
- Verification phase 2.2: diagnostics sạch cho `chat-interface.tsx` và hai component consultation mới; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` vẫn là nền sẵn có ngoài scope.
- UI upgrade phase 2.3: polish `components/tam-su-minimal.tsx` theo mockup MindCare với glass shell, blob background, sidebar/history mềm hơn, header therapeutic và composer mới; giữ nguyên conversation store local/remote, voice mode, music recommendations và SOS flow.
- UI upgrade phase 2.4: nâng `components/dtx-tri-lieu.tsx` sang layout dashboard bằng `PortalShell` + `StatCard`, thêm overview stats và shell tab/card thống nhất nhưng không đổi nghiệp vụ mood/journal/therapy plan/wheel/reminders.
- Verification phase 2.3-2.4: diagnostics sạch cho `tam-su-minimal.tsx` và `dtx-tri-lieu.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` và `baseline-browser-mapping` là nền sẵn có ngoài scope giao diện.
- UI upgrade phase 2.5: restyle `components/psychological-screening.tsx` theo FE mới cho cả selection view, in-progress view và result view bằng `PortalShell`, `SectionCard`, `StatCard`; tách metadata/card renderer sang `components/screening/screening-ui.tsx` để giảm phần trình bày nhồi trong file logic.
- Verification phase 2.5: diagnostics sạch cho `psychological-screening.tsx` và `screening-ui.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` và `baseline-browser-mapping` tiếp tục là warning nền ngoài scope.
- UI upgrade phase 2.6: nâng `app/speech-chat/page.tsx` về shell patient chung theo mockup FE mới, bỏ header hardcode cũ và thay bằng glass layout có support panels, voice status canvas, message section và floating control dock đồng bộ design system.
- Refactor phase 2.6: tách `components/speech/voice-wave-visualizer.tsx` và `components/speech/speech-control-dock.tsx` để tránh tiếp tục phình file `speech-chat/page.tsx` vượt chuẩn và giúp tái dùng các block trình bày voice sau này.
- Verification phase 2.6: diagnostics sạch cho `speech-chat/page.tsx` và hai component speech mới; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` và `baseline-browser-mapping` tiếp tục là warning nền ngoài scope.
- UI upgrade phase 3.1: nâng flow public `bac-si` theo mockup FE mới bằng `PortalShell`/`SectionCard`/`StatCard`: directory tại `app/bac-si/page.tsx`, public profile tại `app/bac-si/[doctorId]/page.tsx`, booking workspace tại `app/bac-si/[doctorId]/hen/page.tsx`.
- Verification phase 3.1: diagnostics sạch cho cả 3 route `bac-si`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` và `baseline-browser-mapping` vẫn là warning nền ngoài scope.
- UI upgrade phase 3.2: làm mới `app/doctor/appointments/page.tsx` để khớp luồng booking public mới, thêm stats, trạng thái dữ liệu và danh sách booking kiểu dashboard nhưng không đổi auth/refresh/PATCH status/offline fallback logic.
- Verification phase 3.2: diagnostics sạch cho `doctor/appointments/page.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning optional `@sentry/nextjs` và `baseline-browser-mapping` tiếp tục là nền sẵn có ngoài phạm vi giao diện.
- UI upgrade phase 3.3: nâng `app/doctor/page.tsx` theo mockup doctor dashboard bằng `PortalShell`, `SectionCard`, `StatCard` với khối metrics, consultations, AI alerts, upcoming schedule và quick routes; giữ nguyên auth gate localStorage và dataset demo `doctor-demo`.
- UI upgrade phase 3.4: nâng `app/doctor/patients/page.tsx` sang patient directory shell có search/filter/stats/cards nhưng vẫn giữ dataset demo và route chi tiết `/doctor/patients/[id]`.
- Verification phase 3.3-3.4: diagnostics sạch cho `doctor/page.tsx` và `doctor/patients/page.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning optional `@sentry/nextjs` và `baseline-browser-mapping` tiếp tục là nền sẵn có ngoài phạm vi giao diện.
- UI upgrade phase 3.5: nâng `app/doctor/patients/[id]/page.tsx` sang detail shell đồng bộ với patient directory, thêm stats/tóm tắt/contact/data-state nhưng vẫn giữ `getDemoPatient()`, auth gate localStorage và route mở tư vấn/báo cáo cũ.
- UI upgrade phase 3.6: nâng `app/doctor/reports/page.tsx` và `app/doctor/reports/new/page.tsx` theo mockup FE mới bằng `PortalShell`, `SectionCard`, `StatCard`, giữ nguyên merge local+demo reports, download `.txt`, save local report vào `mcs_doctor_reports_v1`, và redirect về danh sách sau khi tạo.
- Verification phase 3.5-3.6: diagnostics sạch cho `doctor/patients/[id]/page.tsx`, `doctor/reports/page.tsx`, `doctor/reports/new/page.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning optional `@sentry/nextjs` và `baseline-browser-mapping` tiếp tục là nền sẵn có ngoài phạm vi giao diện.
- UI upgrade phase 3.7: nâng `app/doctor/forum/page.tsx` và `app/doctor/forum/[id]/page.tsx` sang doctor portal shell với forum stats/search/trending sidebar, composer mới và detail thread page; giữ nguyên auth gate, API `/api/doctor-forum/posts`, PII scan và fallback local `mcs_doctor_forum_posts_v1`.
- UI upgrade phase 3.8: nâng `app/doctor/profile/page.tsx` thành editor workspace dùng `PortalShell` + `SectionCard`, giữ nguyên cơ chế load/save profile qua `/api/doctor-profile/me`, fallback local, share URL và preview public profile bằng `DoctorProfileView`.
- Verification phase 3.7-3.8: diagnostics sạch cho `doctor/forum/page.tsx`, `doctor/forum/[id]/page.tsx`, `doctor/profile/page.tsx`; `npm run lint` pass với 3 warning cũ từ `coverage/`; `next build` pass, warning optional `@sentry/nextjs`, `baseline-browser-mapping` và `MODULE_TYPELESS_PACKAGE_JSON` tiếp tục là nền sẵn có ngoài phạm vi giao diện.
- UI upgrade phase 4.1 (done sớm): thay `app/thong-ke/page.tsx` từ placeholder bằng dashboard hoàn chỉnh theo style FE mới, dùng `PortalShell`, `SectionCard`, `StatCard` và các khối mood/activity/sleep/AI insight với dữ liệu demo tĩnh.
- Verification phase 4.1: diagnostics sạch cho `app/thong-ke/page.tsx`; `npm run lint` pass với warning-only cũ từ `coverage/`; `next build` pass, warning `@sentry/nextjs` vẫn là nền sẵn có ngoài scope.
- Verification: local frontend chạy tại `http://127.0.0.1:3001`, smoke script pass cho `/api/db/ping`, `/api/conversations/save`, `/api/conversations/list`, `/api/conversations/load`, và browser fetch same-origin cũng pass với dữ liệu thật từ Postgres local.
- LangGraph local fix: sửa `cpu_server/langgraph_agent/triage_router.py` để escape JSON schema literal trong `ChatPromptTemplate` (`{{`/`}}` thay cho raw braces), loại bỏ lỗi `Invalid format specifier in f-string template. Nested replacement fields are not allowed.`
- Regression: thêm test ở `cpu_server/tests/test_langgraph_triage.py` để bảo đảm semantic router render prompt thành công và gọi được fake LLM caller.
- Verification: sau khi restart CPU server local, smoke `/api/agent-chat` không còn trả fallback `langgraph_failed`; browser local với prompt `Tôi bị đau đầu, có phải cảm cúm không?` trả follow-up triage bình thường.
- FOZA local env: cập nhật `medical-consultation-app/.env` với `FOZA_TOKEN`/`FOZA_TOKEN_2`; verify lại `POST /api/llm-chat` provider `foza` trả `200`, không còn lỗi thiếu token.
- Vercel env: sync `FOZA_TOKEN`, `LLM_MODEL_NAME`, `FOZA_BASE_URL` cho `Development`; `Production` đã có đủ bộ FOZA; `Preview` đã remove typo `FOZA_BASE_UR`.
- Vercel CLI caveat: `vercel env add <NAME> preview --value ... --yes` vẫn bị chặn bởi prompt `git branch required` trên CLI hiện tại; workaround đã dùng là gọi REST API `POST /v10/projects/{idOrName}/env?upsert=true&slug=...` bằng chính auth token của Vercel CLI để add `FOZA_BASE_URL` cho `Preview`.
- Redeploy production: deploy trực tiếp từ monorepo fail do Vercel CLI detect repo root và đụng file >2 GiB trong `_models/`; workaround bằng workspace tạm ngoài repo giữ nguyên cấu trúc `medical-consultation-app/` rồi `vercel --prod --yes` đã pass.
- Verification: production deployment mới `aimed-298ead202-caonguyenthanhanaaa-gmailcoms-projects.vercel.app` aliased thành `https://aimed-one.vercel.app` và trạng thái `Ready`.
- Cleanup: verify lại `preview` env cho thấy `FOZA_BASE_URL` đã `set`, `FOZA_BASE_UR` đã `missing`, và project phụ `aimed-vercel-deploy` đã bị xoá qua Vercel REST API `DELETE /v9/projects/{idOrName}`.
- System QA run: `npm run lint` pass với `3` warnings từ `coverage/`; `npm run build` pass nhưng còn warning optional dependency `@sentry/nextjs`; `python -m pytest cpu_server/tests/test_langgraph_triage.py -q` pass `3/3`.
- Frontend fallback regression đã fix: `buildGatewayFallbackActions()` giờ trả `ask_navigation -> bac-si` cho red-flag triage intent ngay cả khi `triageMeta` chưa active; `npm test` hiện pass `199/199` với `4` skipped.
- Local smoke runtime pass cho `GET /api/db/ping`, `POST /api/conversations/save`, `GET /api/conversations/list`, `GET /api/conversations/load`, `POST /api/mcp/call` (`graph.status`), `POST /api/agent-chat`, và direct `POST /v1/agent-chat`.
- Detailed QA artifact: `_workspace/SYSTEM_TEST_REPORT_2026-06-14_DETAILED.md`.

## 2026-06-19

- UI upgrade phase 5.1: refactor `app/admin/server/page-client.tsx` sang admin runtime dashboard dùng `PortalShell`, `SectionCard`, `StatCard`; bổ sung các khối stats, GPU URL update, danger zone, server registry table, logs table và runtime events table nhưng không đổi contract hay action vận hành hiện có.
- Logic giữ nguyên cho toàn bộ flow `admin/server`: auth gate qua `/api/backend/v1/user`; đọc `/api/servers`, `/api/servers/logs`, `/api/runtime/events`; ghi `/api/servers`, `/api/runtime/mode`, `/api/servers/check`, `/api/servers/colab-update`; dọn `/api/runtime/events` và purge hội thoại backend + localStorage.
- Verification phase 5.1: VS Code diagnostics sạch cho `app/admin/server/page-client.tsx`; `npm run lint` pass với warning-only nền từ `coverage/`; `next build` pass, warning `@sentry/nextjs`/`baseline-browser-mapping`/`MODULE_TYPELESS_PACKAGE_JSON` tiếp tục là nền sẵn có ngoài phạm vi giao diện.
- UI upgrade phase 5.2: refactor `app/quan-ly/page.tsx` thành admin hub theo shell `PortalShell` với các `StatCard` tổng quan và nhóm `SectionCard` cho điều hướng workspace; thêm entry trực tiếp sang `/admin/server` để nối liền cụm admin vừa nâng cấp.
- Verification phase 5.2: diagnostics sạch cho `app/quan-ly/page.tsx`; `npm exec eslint app/quan-ly/page.tsx` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON` ngoài scope.
- UI upgrade phase 5.3: refactor `app/quan-ly/user/page.tsx`, `app/quan-ly/data/page.tsx`, `app/quan-ly/config/page.tsx` sang cùng admin shell `PortalShell` + `SectionCard` + `StatCard`; biến các placeholder card thô thành workspace dashboard/readiness views rõ hơn nhưng chưa thêm logic API mới.
- Logic giữ nguyên cho cụm `quan-ly/*`: tất cả các route vẫn đi qua `RoleGuard roles=["ADMIN"]`; `user/data/config` vẫn là workspace tĩnh định hướng, chưa sở hữu fetch/save state riêng và không thay đổi route navigation hiện có.
- Verification phase 5.3: diagnostics sạch cho cả 3 file `quan-ly/user`, `quan-ly/data`, `quan-ly/config`; `npm exec eslint app/quan-ly/user/page.tsx app/quan-ly/data/page.tsx app/quan-ly/config/page.tsx` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON` ngoài scope.
- UI upgrade phase 5.4: refactor `app/agent-hub/page.tsx` sang shell `PortalShell` với `StatCard` tổng quan, profile cards và demo scenario sections rõ hơn; giữ nguyên `getAllAgentProfiles()`, copy prompt, localStorage flags `mcs_agent_mode_v1` / `mcs_demo_prompt_v1`, và điều hướng sang `/tu-van`.
- Verification phase 5.4: diagnostics sạch cho `app/agent-hub/page.tsx`; `npm exec eslint app/agent-hub/page.tsx` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON` ngoài scope.
- UI upgrade phase 5.5: refactor `app/account/page.tsx` thành orchestrator gọn hơn và tách presentation sang `components/account/*` (`account-profile-section`, `account-security-section`, `account-settings-section`, `account-special-section`, `account-switcher-section`, `account-section-nav`, `account-messages`, `account-page-types`).
- Refactor phase 5.5.1: tiếp tục tách state/effects/handlers của `account` sang `components/account/use-account-page-controller.ts`, đưa `app/account/page.tsx` về `131` dòng để gỡ blocker hard limit của dự án.
- Logic giữ nguyên cho `account`: load profile từ `/api/backend/v1/user` hoặc fallback localStorage; load/save consent qua `/api/backend/v1/consent`; avatar upload tiếp tục dùng `avatar-worker.ts`; save profile, password change, logout all, logout cục bộ, offboarding và query `?tab=accounts` đều hoạt động theo contract cũ.
- UI phase 5.5: `account` hiện dùng `PortalShell`, `SectionCard`, `StatCard`, có aside navigation và action bar nhưng không thêm API mới hay đổi route đích.
- Verification phase 5.5: diagnostics sạch cho `app/account/page.tsx` và toàn bộ `components/account/*`; `npm exec eslint app/account/page.tsx components/account/*.ts* components/account/use-account-page-controller.ts` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON` ngoài scope.
- UI upgrade phase 5.6: refactor `app/tin-tuc-y-khoa/page.tsx` thành page orchestrator dùng `PortalShell`; tách logic/state sang `components/medical-news/use-medical-news-controller.ts` và tách presentation sang `medical-news-search-panel.tsx`, `medical-news-workspace.tsx`, `medical-news-types.ts`.
- Logic giữ nguyên cho `tin-tuc-y-khoa`: web-search qua `/api/web-search`, knowledge references qua `/api/backend/v1/knowledge/search`, panel ratio persisted ở `mcs_news_right_ratio_v1`, và gợi ý chủ đề vẫn dựa vào `getCarePlan()` / `getLastScreening()`.
- UI upgrade phase 5.7: refactor `app/tra-cuu/page.tsx` sang route shell `PortalShell` + `SectionCard` + `StatCard`; tiếp tục giữ nguyên `HealthLookup` component và hành vi dynamic import hiện tại.
- Verification phase 5.6/5.7: diagnostics sạch cho `app/tin-tuc-y-khoa/page.tsx`, `app/tra-cuu/page.tsx` và toàn bộ `components/medical-news/*`; `npm exec eslint app/tin-tuc-y-khoa/page.tsx app/tra-cuu/page.tsx components/medical-news/*.ts*` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON` ngoài scope.
- Structural note: `app/tin-tuc-y-khoa/page.tsx` hiện còn `92` dòng; `components/health-lookup.tsx` vẫn là component lớn cần cân nhắc tách nếu muốn đồng bộ pattern kiến trúc sâu hơn ở lượt sau.
- Structural refactor post phase 5: tách `components/health-lookup.tsx` thành `components/health-lookup/use-health-lookup-controller.ts`, `health-lookup-search-panel.tsx`, `health-lookup-results-panel.tsx`, `health-lookup-utils.tsx`, `health-lookup-types.ts`; route-level behavior ở `/tra-cuu` không đổi.
- Logic giữ nguyên cho `health-lookup`: classify query, gọi `/api/health-lookup`, gọi suggestion endpoints `/api/health-db/benh|thuoc`, lưu `healthLookupHistory`, mở category modal, copy/share kết quả, render markdown và load knowledge references qua `/api/backend/v1/knowledge/search`.
- Verification post phase 5: diagnostics sạch cho toàn bộ `components/health-lookup*`; `npm exec eslint components/health-lookup.tsx components/health-lookup/*.ts* app/tra-cuu/page.tsx` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON`.
- Structural status: `components/health-lookup.tsx` hiện còn `81` dòng, controller `use-health-lookup-controller.ts` còn `274` dòng; blocker hard limit đã được gỡ.
- QA phase 6.1: `npm run build` pass, `npm run test` pass (`20` files pass, `1` skipped; `199` tests pass, `4` skipped). `npm run lint` không có error nhưng còn `3` warning nền trong `coverage/*`, nên chưa thể coi là “lint xanh hoàn toàn”.
- Browser smoke QA phase 6.1: xác nhận `tra-cuu`, `tin-tuc-y-khoa`, `agent-hub`, `account` render được trên local preview sau refactor; snapshot cho thấy shell chung, nội dung chính và interactive controls đều xuất hiện.
- Regression found/fixed during QA: `components/site-header.tsx` từng gây client-side exception do hook order mismatch (`useMemo` nằm sau early return `if (!mounted || pathname === '/') return null`). Đã sửa bằng cách đưa toàn bộ hooks lên trước nhánh return, sau đó `tin-tuc-y-khoa` và `agent-hub` render ổn định trở lại.
- QA limitation: `admin/server` trên local preview hiện redirect về `/` do trạng thái auth ở browser hiện tại, nên chưa smoke test được đúng màn admin trong context có phiên admin.
- Regression found/fixed during QA 6.2: dark mode trước đó chưa có state manager thật dù project đã có `components/theme-provider.tsx`; nguyên nhân là `app/layout.tsx` không mount `ThemeProvider`, đồng thời shared shell không có control đổi theme rõ ràng.
- UI hardening phase 6.2: thêm `components/theme-toggle.tsx`, mount `ThemeProvider` ở `app/layout.tsx`, và nối toggle vào `components/site-header.tsx` để toàn bộ app dùng chung cùng theme state.
- Verification phase 6.2: diagnostics sạch cho `app/layout.tsx`, `components/site-header.tsx`, `components/theme-toggle.tsx`; `npm exec eslint app/layout.tsx components/site-header.tsx components/theme-toggle.tsx` pass; `npm run build` pass sau khi nối provider.
- Browser verification phase 6.2: local preview xác nhận `document.documentElement.className` đổi từ `dark` sang `light` khi bấm theme toggle trên `/account`, và `/tin-tuc-y-khoa` hiển thị đúng trạng thái toggle sau khi theme đổi.
- QA phase 6.3: side-panel browser smoke test cho `/account`, `/tra-cuu`, `/tin-tuc-y-khoa` xác nhận shell co gọn đúng, header compact hoạt động và các action chính vẫn hiện trong viewport hẹp.
- Overflow verification phase 6.3: `/account`, `/tra-cuu`, `/tin-tuc-y-khoa` đều có `window.scrollY` tăng bình thường khi scroll; dù `body` đặt `overflow: hidden`, phần tử scroll thực tế là `HTML`, nên chưa ghi nhận bug khóa cuộn ở các route public chính.
- Auth guard verification phase 6.3: `/quan-ly`, `/admin/server`, `/doctor` redirect về `/vi` trong browser session hiện tại; đọc `components/role-guard.tsx` cho thấy đây là hành vi đúng khi token/role không hợp lệ hoặc không đủ quyền, chưa phải regression UI riêng của các route portal.
- QA hardening phase 6.4: vá `components/medical-news/medical-news-workspace.tsx` để route `tin-tuc-y-khoa` có loading/empty states rõ hơn ở cả cột kết quả, vùng nhúng bài viết và panel dữ liệu tham khảo; thay đổi chỉ nằm ở presentation, không đổi controller/search contracts.
- Route-level loading phase 6.4: thêm `app/tin-tuc-y-khoa/loading.tsx` với shell skeleton cùng ngôn ngữ thiết kế `PortalShell` + `SectionCard`, nhờ đó khi chuyển route hoặc chờ hydrate không còn phụ thuộc vào `app/loading.tsx` đang `return null`.
- Verification phase 6.4: diagnostics sạch cho `medical-news-workspace.tsx` và `app/tin-tuc-y-khoa/loading.tsx`; `npx eslint components/medical-news/medical-news-workspace.tsx app/tin-tuc-y-khoa/loading.tsx` pass, chỉ còn warning nền `MODULE_TYPELESS_PACKAGE_JSON`; local preview `/tin-tuc-y-khoa` tiếp tục render đủ shell và controls sau patch.
- QA portal phase 6.5: logout patient session rồi đăng nhập lại bằng test account `doctor.tuan / Demo123!`; xác nhận `http://localhost:3000/doctor` và `http://localhost:3000/doctor/patients` đều render đúng doctor shell, heading, navigation và actions nội bộ.
- Guard verification phase 6.5: với session doctor, `http://localhost:3000/admin/server` vẫn bị chặn và trả về `/vi`; điều này phù hợp với `RoleGuard`/admin gate hiện tại, không phải regression route riêng của admin pages.
- Admin unblock phase 6.5: thêm admin demo account `admin.aleian / Demo123!`, cập nhật `app/login/page.tsx` để dev login route `admin -> /quan-ly`, và mở được `http://localhost:3000/quan-ly` lẫn `http://localhost:3000/admin/server` bằng browser automation.
- Stub auth contract phase 6.5: sửa `app/api/backend/[...path]/route.ts` để `/api/backend/v1/user` trong demo mode suy ra `user_id/role/username/full_name` từ bearer token (`test_token_*` hoặc JWT local) thay vì chỉ trả profile stub; nhờ đó admin page client và shared header nhận đúng `role` khi chạy local không có backend thật.
- Admin shell polish phase 6.5: `components/site-header.tsx` và `components/account-menu.tsx` nay hỗ trợ `admin`, hiển thị `Admin Console`, nav admin routes và badge `Quản trị viên` thay vì dùng shell patient mặc định.
- Responsive role-shell phase 6.5: `components/mobile-bottom-nav.tsx` và `components/floating-quick-menu.tsx` được chuyển sang render item theo `userRole`; `lib/account-manager.ts` và `components/account-switcher.tsx` cũng route về đúng dashboard của `patient/doctor/admin` khi phục hồi phiên hoặc đổi tài khoản.
- Verification phase 6.5b: diagnostics sạch và `npx eslint lib/account-manager.ts components/account-switcher.tsx components/mobile-bottom-nav.tsx components/floating-quick-menu.tsx` pass; browser snapshot trên session admin xác nhận header/brand đã là `AI Med Admin Console` và quick-menu trigger tiếp tục hiện đúng trong admin shell.
- Hydration hardening phase 6.5c: sửa `components/account/use-account-page-controller.ts` để token/session chỉ hydrate sau mount (`sessionReady`), đồng thời `components/account/account-settings-section.tsx` và `account-special-section.tsx` dùng trạng thái này cho các nút `Lưu đồng ý` / `Xóa và Offboarding`; browser console không còn warning hydration mismatch `disabled={false}` vs `disabled=""` ở `/account`.
- Demo stub isolation phase 6.5c: `app/api/backend/[...path]/route.ts` nay giữ `profile` và `consent` theo `user_id`; verify với session admin cho thấy `nickname=admin.aleian` và bio admin riêng, không còn bị lẫn `patient.minh` từ session patient trước đó.
- Verification phase 6.5d: `npm run build` pass toàn app; warning nền vẫn giữ nguyên ở optional import `@sentry/nextjs` trong `lib/error-tracker.ts` và `baseline-browser-mapping` outdated, chưa xử lý trong scope UI/QA này.
- Test alignment phase 6.5d: `npm run test` ban đầu fail 2 test ở `app/api/backend/[...path]/route.test.ts` vì test cũ vẫn giả định `/api/backend/v1/user` là public trong demo mode; sau khi cập nhật test để gửi bearer `test_token_patient_001` và thêm case `401 Unauthorized`, toàn bộ suite xanh lại (`200 passed`, `4 skipped`).
- Smoke phase 6.5d: local preview sau build/test vẫn render ổn cho `/account`, `/quan-ly`, `/admin/server` trên session `admin`; warning hydration duy nhất còn thấy trong automation snapshot của `/quan-ly` là mismatch `data-trae-ref`, được xác định là do tooling browser chứ không phải code ứng dụng.
- Optional dependency phase 6.5e: sửa `lib/error-tracker.ts` để tải Sentry qua loader gián tiếp thay vì `import("@sentry/nextjs")` tĩnh; `npm run build` sau patch không còn warning `Can't resolve '@sentry/nextjs'`, chỉ còn warning nền `baseline-browser-mapping` outdated.
- Responsive limitation phase 6.5: browser automation đang cố định ở viewport desktop trung bình khoảng `1022px`, nên checklist breakpoint chuẩn `360 / 768 / 1024 / 1440` vẫn chưa thể tick hoàn toàn dù shell public và doctor portal đều đã render ổn ở kích thước đang có.

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


## 2026-06-19 - UI Upgrade Plan GĐ6.6 (nhac-nho polish)

**What was done:**
- Refactored components/dtx-reminders.tsx để align với design system
- Loại bỏ hard-code colors (bg-blue-600, text-slate-800, border-slate-200)
- Thêm dark mode support với dark:bg-card/50, dark:bg-card/60
- Thay custom toggle button bằng shadcn/ui Switch component
- Thay raw textarea bằng Textarea component
- Chuẩn hóa card styling với bg-card/80 backdrop-blur-xl

**Verification:**
- npm run build:  pass
- Browser render /nhac-nho:  ok
- Dark mode toggle:  works
- Reminder CRUD logic:  maintained

**Remaining GĐ6 items:**
- Responsive QA với viewport thật (360/768/1024/1440)
- Lint warning cleanup (baseline-browser-mapping outdated)
- Module registry update

## 2026-06-19 16:44 - UI Upgrade GĐ2.7 (speech-chat polish)

**What was done:**
- Refactored app/speech-chat/page.tsx camera modal
- Loại bỏ 8 hard-code colors
- Thay bằng design tokens

**Verification:**
- npm run build: pass
- /speech-chat route: compiled
