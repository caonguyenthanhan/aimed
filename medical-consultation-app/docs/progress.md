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
