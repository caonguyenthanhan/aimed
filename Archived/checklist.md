# Checklist (Definition of Done) — Medical Consulting System

## EPIC 0 — Deploy & Environment “chạy là được”
- [ ] Vercel có đủ biến môi trường; deploy không lỗi build/runtime.
- [ ] `.env.sample` phản ánh đúng biến cần thiết; `.env.local` chỉ chứa giá trị, không thiếu key quan trọng.
- [ ] `/api/runtime/mode` phản ánh đúng SSOT; agent/chat luôn trả `metadata.mode` và `metadata.provider`.
- [ ] Có log: `runtime-events.jsonl` và `runtime-metrics.jsonl` có dòng mới sau khi chat/agent chạy.

**Biến DB cần thiết (ít nhất 1 URL)**
- [ ] `DATABASE_URL` hoặc `POSTGRES_URL`
- [ ] (Tuỳ chọn) `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`
- [ ] (Tuỳ chọn) `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` (+ `PGHOST_UNPOOLED`)
- [ ] Pool tuning: `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONN_TIMEOUT_MS`

**Biến Graph / CPU server**
- [ ] `CPU_SERVER_URL` trỏ đúng FastAPI (local/ngrok/vps)
- [ ] `GRAPH_API_KEY` khớp với CPU server

**Biến LLM**
- [ ] FOZA: `FOZA_BASE_URL`, `FOZA_TOKEN`, `LLM_MODEL_NAME`
- [ ] Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`

## EPIC 1 — DB ổn định + Hội thoại “không mất”
- [ ] Tạo hội thoại → refresh trang → danh sách hội thoại vẫn hiện.
- [ ] Load hội thoại cũ không 404/500; nếu DB down thì fallback localStorage không crash UI.
- [ ] Sau 1 lượt chat đầu tiên, title hội thoại tự sinh (không còn “Hội thoại/Hội thoại mới”) và sidebar cập nhật.
- [ ] Save/load/list không bị “lúc có lúc không” trong 20 lượt liên tiếp (không cần reload server).

## EPIC 2 — UI/FE “cố định & không nhảy”
- [ ] Khung nhập dính đáy màn hình (mobile/desktop), không bị trôi khi mở dialog/tools.
- [ ] Khi composer tăng/giảm chiều cao (suggestions/tools/preview), nếu đang ở cuối thì vẫn giữ ở cuối (không giật lên).
- [ ] Khi danh sách dài, scroll không giật mạnh khi render markdown/actions/special messages.
- [ ] Không có layout shift ngang rõ rệt khi mở/đóng dialog.

## EPIC 3 — Agent “trợ lý y tế thật”
- [ ] Khi bật Agent mode, có 1 tin nhắn intro/preamble (mỗi hội thoại) giải thích vai trò + câu hỏi follow-up.
- [ ] Có banner trạng thái hiển thị: profile/mode/provider/graph/tools.
- [ ] Khi graph/tool lỗi: agent vẫn trả lời bình thường và banner phản ánh trạng thái (graph tắt/lỗi).
- [ ] Agent tự suy luận profile đúng trong 4 nhóm câu hỏi mẫu:
  - [ ] “đau ngực/khó thở…” → triage
  - [ ] “thuốc/liều/tương tác…” → medication
  - [ ] “lập kế hoạch/chế độ/tập luyện…” → care_plan
  - [ ] “lo âu/mất ngủ/thở…” → therapy

## EPIC 4 — Trang giới thiệu Agent + Kịch bản demo
- [ ] Có trang Agent Hub giới thiệu profiles + năng lực + tool + nút chạy demo.
- [ ] Có tối thiểu 5 kịch bản demo 1-click (tạo prompt + chạy + hiển thị context).
- [ ] Kịch bản demo có thể chạy trên Vercel chỉ với cấu hình env (không phụ thuộc local).

## EPIC 5 — Bác sĩ & Phân quyền
- [ ] Role SSOT lấy từ backend `/v1/user` (hoặc gateway tương đương); không dựa vào `localStorage.userRole`.
- [ ] Có danh bạ bác sĩ (list) + trang public profile.
- [ ] Luồng đặt lịch: patient tạo request → doctor xem danh sách → doctor duyệt/cập nhật trạng thái.
- [ ] Doctor chỉ xem/duyệt appointment của chính mình.

## EPIC 6 — Graph “hoạt động tốt & ổn định”
- [ ] `graph.status` báo connected khi graph up; UI có indicator.
- [ ] `graph.evidence` trả được kết quả trong ngưỡng chấp nhận (không timeout liên tục).
- [ ] Khi graph down: hệ thống degrade gracefully (agent trả lời không crash; UI báo down).
- [ ] Có retry/backoff ở gateway và reconnect ở CPU server (không “rụng” vĩnh viễn sau 1 lỗi).

