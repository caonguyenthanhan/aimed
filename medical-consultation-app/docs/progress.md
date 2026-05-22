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
