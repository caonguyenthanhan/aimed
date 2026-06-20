# Phác thảo triển khai: Đăng nhập/Đăng ký, RBAC Patient/Doctor & Deploy Vercel + CPU/GPU

Tài liệu này là bản phác thảo triển khai theo định hướng trong `Todo List Triển khai KLTN(B2B2C).md`: có đăng nhập/đăng ký, phân quyền Patient/Doctor, Doctor Workspace, và cơ chế tách tải giữa Vercel (nhẹ) và CPU/GPU server (nặng).  
Mục tiêu là phù hợp cho đề tài nhạy cảm: người dùng kiểm soát dữ liệu cá nhân, có consent, có cơ chế xóa/xuất dữ liệu, và có giới hạn truy cập cho bác sĩ.

## 1) Mục tiêu & nguyên tắc

- Tách hệ thống thành 3 lớp: Vercel (UI + API nhẹ), CPU Server (dịch vụ nặng, lưu trữ dài hạn), GPU Server (LLM/TTS/STT/OCR tăng tốc).
- Bảo mật mặc định: không đưa key vào client; token ngắn hạn; log không chứa PII; xóa dữ liệu theo yêu cầu.
- RBAC rõ ràng: Patient vào vùng Chat; Doctor vào Doctor Workspace; Admin chỉ là vai trò vận hành (tuỳ chọn).
- Đồng bộ “mode chạy” giữa UI và runtime-mode SSOT.

## 2) Kiến trúc triển khai (B2B2C)

### 2.1. Vercel (Next.js)

Vai trò chính:
- Render UI, routing, SEO, static assets.
- Xử lý tác vụ nhẹ, ngắn, phù hợp serverless:
  - Gateway gọi LLM cloud (Gemini) cho fallback và tác vụ nhỏ.
  - Proxy/gateway tới CPU server và GPU server.
  - Lưu “runtime events/metrics” mức hệ thống (không chứa dữ liệu nhạy cảm).
- Auth UI: trang login/register, guard route theo role (client + server component).

Không làm trên Vercel:
- TTS/STT streaming lâu.
- OCR đọc ảnh, xử lý file lớn.
- LLM inference nặng hoặc streaming dài.
- Lưu log hội thoại nhạy cảm dài hạn.

### 2.2. CPU Server (FastAPI)

Vai trò chính:
- Dịch vụ nặng, ổn định, xử lý background/cron.
- Chủ đạo cho: TTS, STT, OCR, xử lý ảnh, tool calling, lưu long-term memory (Zep), truy xuất đồ thị (Neo4j), scoring PHQ-9/GAD-7 ngầm.
- Có thể làm “Auth Authority” nếu chọn mô hình token do backend phát hành.

### 2.3. GPU Server (Colab/vLLM)

Vai trò chính:
- Inference LLM / TTS / STT tốc độ cao.
- CPU server hoặc Next.js gateway gọi GPU server theo runtime-mode và fallback.

## 3) Mô hình Auth & Session (chọn 1 trong 2 hướng)

### Hướng A (khuyến nghị): Auth tập trung tại Next.js (Vercel) + DB Neon

Tổng quan:
- Next.js chịu trách nhiệm login/register (Credentials + Google).
- Session quản lý tại Next.js (cookie httpOnly) để bảo vệ khỏi XSS.
- Role và consent lưu trong Neon Postgres.
- Khi gọi CPU/GPU server: Next.js cấp “service token” hoặc “signed JWT” ngắn hạn làm vé truy cập.

Ưu điểm:
- Tối ưu cho Vercel, ít phụ thuộc CPU server để đăng nhập.
- Session cookie httpOnly an toàn hơn localStorage token.
- Phù hợp mở rộng B2B2C (nhiều bác sĩ/đơn vị).

Ràng buộc:
- Cần cơ chế để CPU server xác minh “vé truy cập” do Next.js cấp, hoặc CPU server chỉ nhận request đi qua Next.js gateway.

### Hướng B: Auth tập trung tại CPU Server (FastAPI) phát JWT

Tổng quan:
- CPU server phát hành JWT thật (access/refresh).
- Next.js chỉ là UI + proxy, lưu token an toàn (ưu tiên cookie httpOnly).
- CPU server tự xác minh JWT cho toàn bộ API nặng.

Ưu điểm:
- Đơn giản hoá xác minh ở CPU server (tự phát tự verify).
- Hợp với kiến trúc hiện tại đang có login/register ở FastAPI (nhưng đang là mock token).

Ràng buộc:
- Cần triển khai refresh token, CSRF protection, cookie config chuẩn khi dùng qua Vercel domain.

## 4) Thiết kế RBAC (Patient/Doctor/Admin)

### 4.1. Quy ước role

- Patient: sử dụng Chat, xem hồ sơ cá nhân, quản lý consent.
- Doctor: truy cập Doctor Workspace, xem danh sách bệnh nhân (chỉ khi có consent), cấu hình “Stepped Care Setup”, nhận cảnh báo.
- Admin (tuỳ chọn): quản trị server registry, xem metrics hệ thống, không truy cập nội dung nhạy cảm nếu không có chính sách riêng.

### 4.2. Guard tuyến đường (routes)

- Patient:
  - `/chat` (hoặc map từ luồng hiện có) là điểm vào chính.
- Doctor:
  - `/doctor-workspace` là điểm vào chính.
- Public:
  - `/login`, `/register`, landing.

Yêu cầu:
- Guard ở cả client (UX) và server (thực thi quyền).
- Backend endpoints nặng bắt buộc xác minh quyền; không dựa vào UI.

## 5) Thiết kế dữ liệu nhạy cảm & quyền kiểm soát của người dùng

### 5.1. Phân loại dữ liệu

- PII: họ tên, email, số điện thoại (nếu có), địa chỉ.
- Dữ liệu nhạy cảm: nội dung chat, chẩn đoán, điểm sàng lọc, lịch sử cảm xúc, file âm thanh/ảnh.
- Dữ liệu vận hành: runtime-mode, metrics tổng hợp, error logs (không PII).

### 5.2. Nguyên tắc lưu trữ

- Mặc định chỉ lưu tối thiểu trên Vercel; ưu tiên lưu dữ liệu nhạy cảm ở CPU server (hoặc DB tách riêng) với chính sách retention rõ ràng.
- Không ghi nội dung chat thô vào log hệ thống; chỉ lưu event/metric đã ẩn danh hoá.
- Token và secret chỉ ở server-side env.

### 5.3. Consent (bệnh nhân kiểm soát dữ liệu)

Các trạng thái cơ bản:
- Không consent: Doctor Workspace không xem được dữ liệu bệnh nhân (ẩn toàn bộ dashboard).
- Consent giới hạn: chỉ cho xem điểm số/tổng quan, không xem chat thô.
- Consent đầy đủ (tuỳ chính sách): cho xem lịch sử liên quan phục vụ điều trị.

Tính năng tối thiểu:
- Màn “Quản lý consent” phía bệnh nhân: bật/tắt cho từng bác sĩ hoặc theo nhóm.
- Audit log: bệnh nhân thấy “ai truy cập dữ liệu gì, khi nào”.

### 5.4. Quyền xoá/xuất dữ liệu

- Export: tải về dữ liệu cá nhân ở định dạng chuẩn.
- Delete: xoá dữ liệu nhạy cảm (chat/memory/Zep/voice/image) và vô hiệu hoá liên kết bác sĩ.
- Offboarding: khi user ngắt kết nối, CPU server xoá lịch sử long-term memory theo chính sách.

## 6) Phân chia API theo mức tải (Vercel vs CPU/GPU)

### 6.1. Nhẹ (Vercel)

- Auth API (nếu chọn Hướng A).
- Gateway LLM cloud (Gemini) cho:
  - Chat “nhẹ”, prompt ngắn, không cần tool nặng.
  - Fallback khi CPU/GPU không sẵn sàng.
- Server registry + runtime-mode đọc/ghi cấu hình (SSOT).

### 6.2. Nặng (CPU/GPU)

- Speech-to-text, text-to-speech, speech-to-speech.
- OCR / phân tích ảnh, upload file.
- LLM inference (GPU-first), tool calling (GraphRAG), scoring ngầm.
- Cronjob chủ động nhắn tin, cảnh báo cờ đỏ cho bác sĩ.

## 7) Luồng người dùng (end-to-end)

### 7.1. Patient onboarding

- Register/Login.
- Chọn/được gán bác sĩ (tuỳ mô hình B2B2C).
- Thiết lập consent mặc định.
- Vào `/chat` để trò chuyện; dữ liệu nhạy cảm lưu theo chính sách.

### 7.2. Doctor workflow

- Login.
- Vào `/doctor-workspace`:
  - Patient list (chỉ hiển thị bệnh nhân đã consent).
  - Emotion dashboard (chỉ số PHQ-9 mock -> real dần).
  - Stepped care setup (ngưỡng cảnh báo, video, message).
  - Alerts/appointments (sprint sau).

## 8) Cấu hình môi trường (env) mức cao

Vercel:
- Gemini API key (server-side).
- Database URL (Neon) nếu dùng lưu user/role/consent tại Postgres.
- CPU server base URL và GPU server registry/mode.

CPU server:
- JWT secret (nếu dùng Hướng B).
- Kết nối Zep/Neo4j và storage path.
- Thông tin truy cập GPU server (nội bộ).

## 9) Lộ trình triển khai bám theo sprint

### Sprint 1 (Auth & RBAC + chuẩn hoá gateway)

- Chuẩn hoá mô hình auth (chọn A hoặc B).
- Implement roles Patient/Doctor và guard route:
  - Patient vào `/chat`
  - Doctor vào `/doctor-workspace`
- Loại bỏ “mock token/localStorage-only” và thống nhất cơ chế session an toàn.
- Chuẩn hoá proxy/gateway: Vercel làm nhẹ, CPU/GPU làm nặng.

### Sprint 2 (Doctor Workspace phần 1)

- Patient list + emotion dashboard (mock -> real dần).
- Data model tối thiểu: user, role, doctor-patient mapping, consent.

### Sprint 3 (Stepped Care Setup + scoring ngầm)

- Form cấu hình điều trị theo bệnh nhân.
- CPU server chấm điểm ngầm từ log chat và lưu theo chính sách.
- Prompt động tự fetch config bác sĩ để điều chỉnh phản hồi.

### Sprint 4 (Thư ký & lịch hẹn)

- Tool book_appointment, alerts, notifications.
- Nhánh logic cảnh báo theo ngưỡng.

### Sprint 5 (GPU LLM + routing)

- GPU-first, fallback Gemini/CPU.
- Consent UI phía bệnh nhân để che dashboard khi không cho phép.
- Offboarding xoá lịch sử (Zep).

### Sprint 6 (Testing & báo cáo)

- Role-play testing, đo độ trễ, hoàn thiện docker-compose.

## 10) Checklist yêu cầu nhạy cảm (tối thiểu)

- Session không nằm trong localStorage; ưu tiên cookie httpOnly.
- Không log PII/chat thô ở runtime metrics.
- Có consent rõ ràng và audit truy cập.
- Có export/delete dữ liệu người dùng.
- RBAC enforced ở backend endpoints nặng.

