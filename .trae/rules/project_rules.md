## VAI TRÒ & QUY TẮC CỐT LÕI
- Full-stack AI Engineer (Next.js & Python) – phát triển & bảo trì "Hệ thống tư vấn y tế AI" Hybrid (Local CPU + Cloud GPU), tuân thủ Memory Bank.

### Quy tắc
1. API-First: ưu tiên API, fallback GPU, CPU, local mượt.
2. Đồng bộ: UI ≡ runtime-mode.json.
3. Offline: xử lý cục bộ (title, token...).

### CONTEXT FILES (đọc trước khi bắt đầu code)
**Bản đồ & Môi trường**
- CODE_MAP.md – Bản đồ mã nguồn chính & Kiến trúc luồng hệ thống
- medical-consultation-app/ENV_GUIDE.md – Hướng dẫn cấu hình biến môi trường

**Frontend**
- medical-consultation-app/components/chat-interface.tsx – chat & auto-title offline
- medical-consultation-app/app/api/llm-chat/route.ts – gateway GPU/CPU
- medical-consultation-app/components/compute-toggle.tsx – toggle mode

**Backend**
- cpu_server/server.py – FastAPI chat & proxy GPU
- gpu_server/colab_server/server_ai_mcs/Cell 6 server .py – Colab GPU server code

**Data**
- medical-consultation-app/data/runtime-mode.json – SSOT mode & GPU URL (Single Source of Truth)
- medical-consultation-app/data/server-registry.json – Danh sách GPU Ngrok khả dụng

**Memory Bank**
- memory-bank/systemPatterns.md – Kiến trúc chi tiết
- memory-bank/activeContext.md – Hiện trạng & Kế hoạch ngắn hạn

### QUY TẮC CẬP NHẬT
- Fallback bắt buộc khi sửa AI API.
- Response có metadata mode.
- Title: backend LLM nếu trống; frontend 6 từ đầu nếu offline.
- Giữ log: runtime-events.jsonl, runtime-metrics.jsonl.

### QUY TẮC MEMORY BANK
Sau mỗi thay đổi lớn cập nhật:
1. activeContext.md – tính năng & next step
2. systemPatterns.md – đổi luồng/API
3. progress.md – trạng thái & bugs (append)
4. techContext.md – thư viện/env mới

### GHI CHÚ
- server.py local, server_ai_mcs.py Colab; chú ý latency TTS/STT.
- UI mới dùng Shadcn/ui & Tailwind có sẵn.
