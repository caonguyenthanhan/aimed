## 2026-03-19

- Hoàn thiện demo agent function calling: /api/agent-chat trả actions allowlist, frontend có thể điều hướng tự động (ví dụ /sang-loc).
- Ổn định demo bằng metadata mode/provider nhất quán và fallback rule-based khi Gemini lỗi/thiếu key.

## 2026-03-20

- Thêm agent provider local (OpenAI-compatible): ép output JSON `{response, actions}` và parse/lọc allowlist trước khi điều hướng.
- Mở rộng agent action/tool: `speak` để kích hoạt TTS (tool nặng) từ agent.
- Thêm Gemini STT/TTS server-side để chạy ổn trên Vercel và Live mode demo trong /tu-van.
