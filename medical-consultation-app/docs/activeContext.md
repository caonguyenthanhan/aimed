## Trạng thái hiện tại

- UI có chế độ Agent (toggle) ở trang /tu-van, gọi /api/agent-chat khi bật.
- /api/agent-chat hỗ trợ Gemini function calling và trả về contract {response, actions, metadata} để frontend thực thi điều hướng.
- Agent hỗ trợ Gemini (tools) và Local (OpenAI-compatible JSON), có fallback rule-based khi thiếu cấu hình hoặc lỗi, đảm bảo demo không “rơi”.
- Đã có Gemini STT/TTS server-side cho Vercel qua /api/speech-to-text và /api/text-to-speech (kèm stream).
- Có Live mode demo ở /tu-van (AudioLines), dùng API key từ user hoặc pass để lấy key.

## Next steps

- Demo thực tế: bật Agent mode, gửi “mở sàng lọc” để điều hướng /sang-loc.
- Demo local: set `AGENT_PROVIDER=local` và trỏ `LOCAL_AGENT_URL` tới `/v1/chat/completions`.
- Kiểm tra quota: 5 lượt dùng key hệ thống, sau đó yêu cầu user nhập API key hoặc pass.
- Mở rộng actions cho 2-3 luồng demo khác (tin tức/trị liệu/nhắc nhở) theo cùng allowlist.
