## Trạng thái hiện tại

- UI có chế độ Agent (toggle) ở trang /tu-van, gọi /api/agent-chat khi bật.
- /api/agent-chat hỗ trợ Gemini function calling và trả về contract {response, actions, metadata} để frontend thực thi điều hướng.
- Agent hỗ trợ Gemini (tools) và Local (OpenAI-compatible JSON), có fallback rule-based khi thiếu cấu hình hoặc lỗi, đảm bảo demo không “rơi”.
- Allowlist điều hướng được chuẩn hoá theo 1 nguồn SSOT (ALLOWED_PATH_PREFIXES) và dùng chung cho local agent prompt + server enforcement.
- Gợi ý nhạc có thể được “hydrate” từ YouTube service (kèm cache TTL) để tránh hardcode ID và tăng độ rõ ràng khi đề xuất.
- Đã có Gemini STT/TTS server-side cho Vercel qua /api/speech-to-text và /api/text-to-speech (kèm stream).
- Có Live mode demo ở /tu-van (AudioLines), dùng API key từ user hoặc pass để lấy key.
- Patient scenario prompting đã có module riêng (patient-scenarios) nhưng hiện đang tạm tắt trong /api/agent-chat để cô lập lỗi runtime.

## Next steps

- Demo thực tế: bật Agent mode, gửi “mở sàng lọc” để điều hướng /sang-loc.
- Demo local: set `AGENT_PROVIDER=local` và trỏ `LOCAL_AGENT_URL` tới `/v1/chat/completions`.
- Kiểm tra quota: 5 lượt dùng key hệ thống, sau đó yêu cầu user nhập API key hoặc pass.
- Mở rộng actions cho 2-3 luồng demo khác (tin tức/trị liệu/nhắc nhở) theo cùng allowlist.
- Chuẩn hoá tool-flow: chuyển từ “tool agents rời rạc” sang 1 entrypoint và 1 schema tool-result (hướng tới MCP).
- Khi xác nhận runtime ổn định: bật lại patient scenario prompting trong /api/agent-chat để cá nhân hoá hướng tư vấn theo tình huống.
