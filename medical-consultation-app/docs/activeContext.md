## Trạng thái hiện tại

- Đã có kế hoạch phát triển toàn vẹn + checklist xây dựng theo phase (P0→P4) tại `_workspace/DEVELOPMENT_PLAN.md` và `_workspace/BUILD_CHECKLIST.md`, dựa trên kết quả audit hệ thống (auth không an toàn là điểm chặn production hàng đầu).
- UI có chế độ Agent (toggle) ở trang /tu-van, gọi /api/agent-chat khi bật (Next.js proxy sang CPU `/v1/agent-chat` nếu CPU_SERVER_URL được cấu hình).
- UI không còn dropdown chọn Agent Profile; client luôn gửi `agent_id=auto` và backend tự suy luận profile theo ngữ nghĩa.
- /api/agent-chat hoạt động như gateway/proxy, trả về contract {response, actions, metadata} để frontend thực thi điều hướng.
- SSOT orchestrator chuyển dần sang CPU server LangGraph `/v1/agent-chat`; Next.js giữ vai trò proxy + fallback khi CPU server down.
- Agent có thể gọi tool “mcp-lite” (web/youtube) qua /api/mcp/call rồi dùng kết quả để trả lời.
- Allowlist điều hướng được chuẩn hoá theo 1 nguồn SSOT (ALLOWED_PATH_PREFIXES) và dùng chung cho local agent prompt + server enforcement.
- Gợi ý nhạc có thể được “hydrate” từ YouTube service (kèm cache TTL) để tránh hardcode ID và tăng độ rõ ràng khi đề xuất.
- Đã có STT/TTS server-side: STT qua Gemini ở `/api/speech-to-text`; TTS ở `/api/text-to-speech` và `/api/text-to-speech-stream` hỗ trợ Gemini và Supertonic local (fallback về CPU server). CPU server TTS cũng hỗ trợ ưu tiên Supertonic local khi cấu hình env.
- Có Live mode demo ở /tu-van (AudioLines), dùng API key từ user hoặc pass để lấy key.
- UI /tu-van: ChatInterface dùng layout `flex-1/min-h-0` theo RootLayout; composer là footer trong flow (không sticky) và có padding-bottom bù MobileBottomNav + safe-area để tránh bị che/nhảy khi focus input; scrollToBottom ưu tiên `messagesContainer.scrollTo(...)` để không làm body scroll.
- UI chat stability: ChatInterface auto-scroll chỉ khi at-bottom hoặc khi vừa thêm user message; VirtualChatList auto-scroll dùng requestAnimationFrame để giảm jump frame.
- Patient scenario prompting đã có module riêng (patient-scenarios) nhưng hiện đang tạm tắt trong /api/agent-chat để cô lập lỗi runtime.
- `conversationId` đã chuyển sang UUID; API save chặn các ID legacy để tránh lỗi DB trên production.
- Có unit test cho fallback rule-based của agent profiles (tư vấn tổng quát + tâm lý trị liệu) qua Vitest.
- Có integration test gọi LLM thật (Gemini/Foza) cho `/api/agent-chat`, mặc định skip và bật bằng `RUN_LLM_INTEGRATION_TESTS=1`.
- CPU server launcher (`cpu_server/launcher/run_menu.bat`) tự khởi động Memgraph (docker compose) và cung cấp Graph Gateway qua `/v1/graph/status`, `/v1/graph/evidence` để làm “truth context”.
- Agent mode tự gọi `graph.evidence` và nhét evidence vào prompt; UI có nút xem “context gửi cho LLM” để demo (hiển thị từ `metadata.llm_context`).
- UI /tu-van: khi Agent mode bật, hiển thị banner trạng thái (profile/mode/provider/graph/tools) từ `metadata` và tự chèn 1 tin nhắn intro/preamble (1 lần mỗi hội thoại) để giải thích vai trò + hỏi follow-up.
- UI /tu-van: khi Agent mode bật, poll `graph.status` và hiển thị indicator graph (connected/latency) để chẩn đoán nhanh.
- UI /tu-van: khi đăng nhập, poll `/api/db/ping` và hiển thị badge DB (ok/down + latency) trong sidebar để chẩn đoán DB chập chờn.
- DB degrade gracefully: `/api/db/ping` không trả 5xx khi DB down; `/api/conversations/*` trả `skipped=true` với `reason=db_unavailable` để UI fallback localStorage.
- Có trang `/agent-hub` để giới thiệu agent profiles + kịch bản demo 1-click (copy prompt, mở /tu-van và tự bật Agent mode).
- Bác sĩ: `/bac-si` hiển thị danh sách bác sĩ từ `/api/doctor-profile/list` (fallback offline theo test accounts); đặt lịch tại `/bac-si/[doctorId]/hen`; bác sĩ xem yêu cầu tại `/doctor/appointments`.
- RBAC ownership: `/api/appointments` hỗ trợ `GET ?id=` và enforce doctor chỉ xem/đổi trạng thái appointment thuộc `doctor_id = user_id`.
- Booking validation: `POST /api/appointments` bắt buộc `doctor_id` tồn tại trong `doctor_profiles` trước khi tạo lịch hẹn; API auto-seed demo doctor_profiles từ TEST_ACCOUNTS khi DB bật.
- Agent: thêm profile `doctor_referral` và intent detection (doctor/triage/medication/plan/therapy); metadata trả `intent` và response luôn có nội dung + follow-up (không để trống).
- Có smoke script PowerShell `medical-consultation-app/smoke.ps1` để test nhanh các endpoint cốt lõi (db ping, conversations, graph.status) cho local/Vercel.
- CPU server đã scaffold LangGraph agent và expose endpoint `/v1/agent-chat` (orchestrator=langgraph) trả `{response, actions, metadata}` để chuẩn bị thay thế hoàn toàn `/api/agent-chat` trên Vercel.
- CPU server FOZA timeout dùng `FOZA_REQUEST_TIMEOUT_MS` (ms; tự quy đổi sang giây) và reuse HTTP session để giảm overhead kết nối.
- Agent FOZA (Next.js `/api/agent-chat`): thêm circuit breaker in-memory để tránh FOZA timeout lặp lại gây cascade fallback khó hiểu (`FOZA_CIRCUIT_FAIL_THRESHOLD`, `FOZA_CIRCUIT_OPEN_MS`).
- Agent metadata: luôn trả `requested_provider`, `root_cause`, `fallback`, `fallback_chain` để debug nhanh khi FOZA/GPU/CPU/Gemini failover.
- Khi test bằng PowerShell, các endpoint chat trả `Content-Type: application/json; charset=utf-8` để tránh lỗi mojibake tiếng Việt.
- SSOT runtime files (`data/runtime-mode.json`, `data/server-registry.json`) được tự tạo khi thiếu để tránh lệch mode (lần chạy đầu không cần gọi /api/runtime/mode trước).
- Các endpoint `/api/runtime/mode` và `/api/llm-chat` cũng ép `application/json; charset=utf-8` để PowerShell decode tiếng Việt ổn định.
- i18n: thêm catch-all route `/[locale]/*` để tránh 404 cho các trang chưa được nhân bản dưới `[locale]` (tự điều hướng về route gốc tương ứng).
- Có checklist + smoke test cho demo Vercel → CPU public (ngrok): `docs/DEFENSE_PACKAGE_VERCEL_CPU.md` và `scripts/demo-smoke-vercel.ps1`.
- Có script sinh phụ lục luận văn từ report matrix: `thesis/scripts/generate_agent_evaluation_appendix.py` (output `thesis/APPENDIX_AGENT_EVALUATION.md` + CSV).
- **GÓI BẢO VỆ HOÀN THIỆN:**
  - LLMOps-lite protocol + artefact: `thesis/LLMOPS_LITE_PROTOCOL.md`
  - Script 1-lệnh kiểm thử toàn hệ thống: `scripts/llmops-run.ps1`
  - Script sinh phụ lục LLMOps: `thesis/scripts/generate_llmops_lite_appendix.py` (output `thesis/APPENDIX_LLMOPS_LITE.md` + CSV)
  - Hướng dẫn hội đồng: `thesis/MANUAL_HOI_DONG.md`
  - Tổng quan thesis: `thesis/README.md`
- SSOT quy trình repo: thêm `_workspace/00_logic.md` (logic/invariants), `_workspace/01_module_registry.md` (index core_lib), và `_workspace/docs/project_overview.html` (overview).
- **LLMOps production (mới):**
  - Config SSOT: `configs/llmops.yaml` + env variables.
  - Shared module: `core_lib/llmops/` (Pydantic v2 settings, JSONL logging, LangSmith tracing, guardrails, RAGAS evaluation).
  - LangGraph agent đã bật guardrails anti-hallucination: nếu context không đủ cho profile rủi ro (triage/thuốc) thì fallback tool-search hoặc hỏi thêm thông tin thay vì đoán.
  - Pytest suite `tests/eval/` hỗ trợ RAGAS metrics (faithfulness, answer_relevance, context_precision, context_recall) cho cả blackbox HTTP và in-process.

## P3 — Hoàn thành (2026-06-10)

- **P3.1 RAGAS baseline:** Tạo `tests/eval/data/sample_eval_dataset.jsonl` (6 medical QA pairs: headache, tonsillitis, diarrhea, ibuprofen, hypertension, chest pain — phân theo difficulty). Tạo `configs/llmops_eval_baseline.yaml` (initial baseline, null scores — chờ first pytest run).
- **P3.2 Medical guardrails:** Tạo `lib/medical-disclaimer.ts` (disclaimer bắt buộc appended vào mọi AI response). Tích hợp `appendMedicalDisclaimer` vào agent-chat route. Safety checks (self-harm, violence) + prompt-injection defense đã có từ llmops.yaml.
- **P3.3 Observability:** `metadata.mode`/`provider` đã có trong agent-chat. `appendMetric` được gọi mỗi response. LangSmith tracing đã cấu hình trong `configs/llmops.yaml`.



- **P2.1 Mini components:** Thay stubs trong `embedded-component-renderer.tsx` bằng real imports từ `components/embeds/`. Tất cả 6 loại (sang-loc, tri-lieu, tra-cuu, bac-si, ke-hoach, thong-ke) giờ render thật.
- **P2.2 YouTube service:** API thật đã có — cần `YOUTUBE_API_KEY` trong env. Stub fallback khi không có key. Thêm vào `.env.sample`.
- **P2.3 Notifications:** `DtxReminders` + browser Notification API + `nhac-nho` page đã có đầy đủ.
- **P2.4 i18n:** Tạo `[locale]/layout.tsx`, `[locale]/page.tsx`, `[locale]/tu-van/page.tsx`. Root `/` redirect về `/vi`. Hỗ trợ 6 locales: vi/en/fr/zh/ru/hi.



- **P1.1 Tests:** Thêm 7 test files mới (jwt, api-schemas, safety, rate-limiter, appointments, auth-server, pii-scan). Tổng 194 tests pass. Coverage: 36.8% stmts / 26.2% branches.
