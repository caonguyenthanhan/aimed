## Trạng thái hiện tại

- UI có chế độ Agent (toggle) ở trang /tu-van, gọi /api/agent-chat khi bật (Next.js proxy sang CPU `/v1/agent-chat` nếu CPU_SERVER_URL được cấu hình).
- UI không còn dropdown chọn Agent Profile; client luôn gửi `agent_id=auto` và backend tự suy luận profile theo ngữ nghĩa.
- /api/agent-chat hoạt động như gateway/proxy, trả về contract {response, actions, metadata} để frontend thực thi điều hướng.
- SSOT orchestrator chuyển dần sang CPU server LangGraph `/v1/agent-chat`; Next.js giữ vai trò proxy + fallback khi CPU server down.
- Agent có thể gọi tool “mcp-lite” (web/youtube) qua /api/mcp/call rồi dùng kết quả để trả lời.
- Allowlist điều hướng được chuẩn hoá theo 1 nguồn SSOT (ALLOWED_PATH_PREFIXES) và dùng chung cho local agent prompt + server enforcement.
- Gợi ý nhạc có thể được “hydrate” từ YouTube service (kèm cache TTL) để tránh hardcode ID và tăng độ rõ ràng khi đề xuất.
- Đã có Gemini STT/TTS server-side cho Vercel qua /api/speech-to-text và /api/text-to-speech (kèm stream).
- Có Live mode demo ở /tu-van (AudioLines), dùng API key từ user hoặc pass để lấy key.
- UI /tu-van: ChatInterface dùng layout `flex-1/min-h-0` theo RootLayout; composer là footer trong flow (không sticky) và có padding-bottom bù MobileBottomNav + safe-area để tránh bị che/nhảy khi focus input; scrollToBottom ưu tiên `messagesContainer.scrollTo(...)` để không làm body scroll.
- Patient scenario prompting đã có module riêng (patient-scenarios) nhưng hiện đang tạm tắt trong /api/agent-chat để cô lập lỗi runtime.
- `conversationId` đã chuyển sang UUID; API save chặn các ID legacy để tránh lỗi DB trên production.
- Có unit test cho fallback rule-based của agent profiles (tư vấn tổng quát + tâm lý trị liệu) qua Vitest.
- Có integration test gọi LLM thật (Gemini/Foza) cho `/api/agent-chat`, mặc định skip và bật bằng `RUN_LLM_INTEGRATION_TESTS=1`.
- CPU server launcher (`cpu_server/launcher/run_menu.bat`) tự khởi động Memgraph (docker compose) và cung cấp Graph Gateway qua `/v1/graph/status`, `/v1/graph/evidence` để làm “truth context”.
- Agent mode tự gọi `graph.evidence` và nhét evidence vào prompt; UI có nút xem “context gửi cho LLM” để demo (hiển thị từ `metadata.llm_context`).
- UI /tu-van: khi Agent mode bật, hiển thị banner trạng thái (profile/mode/provider/graph/tools) từ `metadata` và tự chèn 1 tin nhắn intro/preamble (1 lần mỗi hội thoại) để giải thích vai trò + hỏi follow-up.
- UI /tu-van: khi Agent mode bật, poll `graph.status` và hiển thị indicator graph (connected/latency) để chẩn đoán nhanh.
- UI /tu-van: khi đăng nhập, poll `/api/db/ping` và hiển thị badge DB (ok/down + latency) trong sidebar để chẩn đoán DB chập chờn.
- Có trang `/agent-hub` để giới thiệu agent profiles + kịch bản demo 1-click (copy prompt, mở /tu-van và tự bật Agent mode).
- Bác sĩ: `/bac-si` hiển thị danh sách bác sĩ từ `/api/doctor-profile/list` (fallback offline theo test accounts); đặt lịch tại `/bac-si/[doctorId]/hen`; bác sĩ xem yêu cầu tại `/doctor/appointments`.
- Agent: thêm profile `doctor_referral` và intent detection (doctor/triage/medication/plan/therapy); metadata trả `intent` và response luôn có nội dung + follow-up (không để trống).
- Có smoke script PowerShell `medical-consultation-app/smoke.ps1` để test nhanh các endpoint cốt lõi (db ping, conversations, graph.status) cho local/Vercel.
- CPU server đã scaffold LangGraph agent và expose endpoint `/v1/agent-chat` (orchestrator=langgraph) trả `{response, actions, metadata}` để chuẩn bị thay thế hoàn toàn `/api/agent-chat` trên Vercel.
- Khi test bằng PowerShell, các endpoint chat trả `Content-Type: application/json; charset=utf-8` để tránh lỗi mojibake tiếng Việt.

## Next steps

- Chuẩn hoá nội dung intro/preamble theo từng agent profile (triage/thuốc/kế hoạch/trị liệu) và bổ sung “câu hỏi tối thiểu” theo từng nhóm.
- Import graph data vào Memgraph (nếu chưa) và thử query `/api/backend/v1/graph/evidence` từ UI/agent để lấy evidence subgraph.
- Demo thực tế: bật Agent mode, gửi “mở sàng lọc” để điều hướng /sang-loc.
- Demo agent profiles (auto): hỏi về “thuốc/tương tác” để agent gợi ý mở tra-cuu; hỏi “lập kế hoạch chăm sóc” để agent gợi ý mở ke-hoach; mô tả “triệu chứng nguy hiểm” để agent ưu tiên an toàn và gợi ý mở bac-si; yêu cầu bài tập giảm lo âu để agent gợi ý mở tri-lieu/sang-loc.
- Demo hybrid: đổi `data/runtime-mode.json` sang `target=gpu` hoặc `target=cpu` và quan sát `metadata.mode` + runtime events/metrics.
- Demo tool calling: hỏi “tìm giúp mình vài nguồn về …” để agent gọi `web.search`, hoặc “gợi ý nhạc thư giãn” để gọi `youtube.recommend_music`.
- Deploy smoke: chạy `medical-consultation-app/smoke.ps1 -BaseUrl <url>` để kiểm tra nhanh DB/conversations/graph trước khi demo.
- Chạy purge dữ liệu legacy (non-UUID) trên DB mục tiêu để dọn sạch dữ liệu cũ.
- Kiểm tra quota: 5 lượt dùng key hệ thống, sau đó yêu cầu user nhập API key hoặc pass.
- Mở rộng actions cho 2-3 luồng demo khác (tin tức/trị liệu/nhắc nhở) theo cùng allowlist.
- Chuẩn hoá tool-flow: chuyển từ “tool agents rời rạc” sang 1 entrypoint và 1 schema tool-result (hướng tới MCP).
- Khi xác nhận runtime ổn định: bật lại patient scenario prompting trong /api/agent-chat để cá nhân hoá hướng tư vấn theo tình huống.
- Chuẩn hoá deploy CPU server: tách môi trường Python sạch và pin versions nếu cần để tránh conflict khi cài deps LangGraph.
