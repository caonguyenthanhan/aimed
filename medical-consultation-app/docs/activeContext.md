## Trạng thái hiện tại

- UI có chế độ Agent (toggle) ở trang /tu-van, gọi /api/agent-chat khi bật.
- UI có chọn Agent Profile (tư vấn tổng quát / triage / thuốc / kế hoạch / trị liệu) và gửi `agent_id` vào /api/agent-chat.
- /api/agent-chat hỗ trợ Gemini function calling và trả về contract {response, actions, metadata} để frontend thực thi điều hướng.
- /api/agent-chat đọc `data/runtime-mode.json` để chọn chạy GPU/CPU theo SSOT (hybrid auto). Ưu tiên OpenAI-compatible JSON agent (GPU/CPU) và fallback sang Gemini khi cần.
- Agent có thể gọi tool “mcp-lite” (web/youtube) qua /api/mcp/call rồi dùng kết quả để trả lời.
- Allowlist điều hướng được chuẩn hoá theo 1 nguồn SSOT (ALLOWED_PATH_PREFIXES) và dùng chung cho local agent prompt + server enforcement.
- Gợi ý nhạc có thể được “hydrate” từ YouTube service (kèm cache TTL) để tránh hardcode ID và tăng độ rõ ràng khi đề xuất.
- Đã có Gemini STT/TTS server-side cho Vercel qua /api/speech-to-text và /api/text-to-speech (kèm stream).
- Có Live mode demo ở /tu-van (AudioLines), dùng API key từ user hoặc pass để lấy key.
- UI /tu-van: ChatInterface cố định chiều cao theo padding top/bottom của RootLayout để không cần scroll body và không bị “mất” composer sau khi đóng popup.
- Patient scenario prompting đã có module riêng (patient-scenarios) nhưng hiện đang tạm tắt trong /api/agent-chat để cô lập lỗi runtime.
- `conversationId` đã chuyển sang UUID; API save chặn các ID legacy để tránh lỗi DB trên production.
- Có unit test cho fallback rule-based của agent profiles (tư vấn tổng quát + tâm lý trị liệu) qua Vitest.
- Có integration test gọi LLM thật (Gemini/Foza) cho `/api/agent-chat`, mặc định skip và bật bằng `RUN_LLM_INTEGRATION_TESTS=1`.
- CPU server launcher (`cpu_server/launcher/run_menu.bat`) tự khởi động Memgraph (docker compose) và cung cấp Graph Gateway qua `/v1/graph/status`, `/v1/graph/evidence` để làm “truth context”.
- Agent mode tự gọi `graph.evidence` và nhét evidence vào prompt; UI có nút xem “context gửi cho LLM” để demo (hiển thị từ `metadata.llm_context`).

## Next steps

- Import graph data vào Memgraph (nếu chưa) và thử query `/api/backend/v1/graph/evidence` từ UI/agent để lấy evidence subgraph.
- Demo thực tế: bật Agent mode, gửi “mở sàng lọc” để điều hướng /sang-loc.
- Demo agent profiles: chọn “Thuốc & Tương tác” rồi hỏi về liều/tương tác để agent gợi ý mở tra-cuu; chọn “Kế hoạch chăm sóc” rồi yêu cầu lập lộ trình để agent gợi ý mở ke-hoach.
- Demo triage: chọn “Triage + Red flags” rồi mô tả triệu chứng nguy hiểm để agent ưu tiên hướng dẫn an toàn và gợi ý mở bac-si.
- Demo trị liệu: chọn “Tâm lý trị liệu” rồi yêu cầu bài tập giảm lo âu để agent gợi ý mở tri-lieu/sang-loc.
- Demo hybrid: đổi `data/runtime-mode.json` sang `target=gpu` hoặc `target=cpu` và quan sát `metadata.mode` + runtime events/metrics.
- Demo tool calling: hỏi “tìm giúp mình vài nguồn về …” để agent gọi `web.search`, hoặc “gợi ý nhạc thư giãn” để gọi `youtube.recommend_music`.
- Chạy purge dữ liệu legacy (non-UUID) trên DB mục tiêu để dọn sạch dữ liệu cũ.
- Kiểm tra quota: 5 lượt dùng key hệ thống, sau đó yêu cầu user nhập API key hoặc pass.
- Mở rộng actions cho 2-3 luồng demo khác (tin tức/trị liệu/nhắc nhở) theo cùng allowlist.
- Chuẩn hoá tool-flow: chuyển từ “tool agents rời rạc” sang 1 entrypoint và 1 schema tool-result (hướng tới MCP).
- Khi xác nhận runtime ổn định: bật lại patient scenario prompting trong /api/agent-chat để cá nhân hoá hướng tư vấn theo tình huống.
