# Sơ đồ & Luồng điều hướng các Trang (Pages Flow & Navigation)

Tài liệu này ghi nhận tổng hợp tất cả các trang (pages) hiện có trong hệ thống (dựa trên Next.js App Router), chức năng của từng trang và luồng điều hướng (nhảy trang) để đội ngũ FE dễ dàng nắm bắt và phát triển.

## 1. Cấu trúc Điều hướng chung (Global Navigation)
Mọi trang trong hệ thống đều được bọc bởi `app/layout.tsx`, bao gồm các thành phần điều hướng cố định:
- **SiteHeader (Thanh điều hướng trên cùng):** Chứa Logo (về trang chủ), Menu chính, nút Đổi ngôn ngữ, và Avatar người dùng (Menu xổ xuống: Profile, Dashboard, Logout).
- **MobileBottomNav (Thanh điều hướng dưới cùng trên Mobile):** Hiển thị trên màn hình nhỏ, chứa các icon truy cập nhanh: Home, Tư vấn, Tâm sự, Tài khoản.
- **FloatingQuickMenu (Nút nổi nhanh):** Cho phép người dùng gọi nhanh các tiện ích hệ thống từ bất kỳ trang nào.

---

## 2. Danh sách Trang & Chức năng (Pages List)

Hệ thống có khoảng **~40 trang** (route), được chia thành các nhóm sau:

### 2.1. Public & Landing (Trang công khai)
- `/` (`app/page.tsx`): Tự động redirect người dùng sang `/vi` (Ngôn ngữ mặc định).
- `/[locale]` (`app/[locale]/page.tsx`): **Landing Page** - Trang chủ giới thiệu tính năng hệ thống. Gồm các Grid Card nhảy trực tiếp vào các tính năng chính.
- `/gioi-thieu`: Trang thông tin chi tiết về dự án và đội ngũ.

### 2.2. Auth & Account (Tài khoản & Xác thực)
- `/login`: Trang đăng nhập.
- `/register`: Trang đăng ký tài khoản.
- `/account`: Trang quản lý hồ sơ cá nhân của người dùng, xem lịch sử tư vấn, thiết bị kết nối.

### 2.3. User Features (Tính năng chính cho Người bệnh)
- `/tu-van`: Giao diện Chatbot Y tế AI (hỗ trợ chẩn đoán, hỏi đáp sức khỏe).
- `/tam-su`: Giao diện Chatbot Tâm sự (AI Companion - giải tỏa căng thẳng).
- `/speech-chat`: Giao diện Chat bằng giọng nói trực tiếp với AI.
- `/tra-cuu`: Tra cứu từ điển Bệnh lý và Thuốc.
- `/sang-loc`: Làm các bài Test tâm lý (PHQ-9, GAD-7, ASRS...).
- `/tri-lieu`: Theo dõi cảm xúc (Mood tracking) và nhật ký trị liệu.
- `/nhac-nho`: Quản lý thói quen sức khỏe, nhắc nhở uống thuốc.
- `/tin-tuc-y-khoa`: Danh sách các bài viết, tin tức y khoa.
- `/thong-ke`: Biểu đồ thống kê tình trạng sức khỏe cá nhân.
- `/ke-hoach`: Xem các lộ trình/kế hoạch sức khỏe đang theo dõi.
- `/ke-hoach/[trackId]`: Chi tiết một kế hoạch cụ thể.

### 2.4. Doctor Directory (Tìm kiếm Bác sĩ)
- `/bac-si`: Danh sách các bác sĩ chuyên khoa trên hệ thống.
- `/bac-si/[doctorId]`: Hồ sơ công khai của một bác sĩ.
- `/bac-si/[doctorId]/hen`: Đặt lịch hẹn khám với bác sĩ đó.

### 2.5. Doctor Portal (Dành riêng cho Bác sĩ)
- `/doctor`: Dashboard tổng quan (thống kê, lịch hẹn hôm nay).
- `/doctor/patients`: Danh sách bệnh nhân đang quản lý.
- `/doctor/patients/[id]`: Chi tiết bệnh án của một bệnh nhân.
- `/doctor/appointments`: Quản lý tất cả lịch hẹn.
- `/doctor/profile`: Chỉnh sửa hồ sơ cá nhân của bác sĩ.
- `/doctor/reports`: Quản lý các báo cáo y tế.
- `/doctor/reports/new`: Giao diện tạo báo cáo mới.
- `/doctor/forum`: Diễn đàn nội bộ để các bác sĩ hội chẩn.
- `/doctor/forum/[id]`: Chi tiết bài đăng hội chẩn.

### 2.6. Admin & System (Quản trị hệ thống)
- `/quan-ly`: Dashboard dành cho Admin.
- `/quan-ly/user`: Quản lý danh sách người dùng toàn hệ thống.
- `/quan-ly/data`: Quản lý dữ liệu hệ thống (vector db, seed data).
- `/quan-ly/config`: Thay đổi các cấu hình hệ thống.
- `/admin/server`: Giao diện quản lý và theo dõi trạng thái các Server AI (Local CPU / Colab GPU).
- `/agent-hub`: Nơi quản lý các Agent, xem ma trận Agent đang hoạt động.
- `/api/runtime/monitor/page.tsx`: Giao diện Monitor theo dõi Log và Event runtime theo thời gian thực.

---

## 3. Quy luật nhảy trang (Routing Rules)

- **Từ Landing Page:** Các thẻ `FeatureCard` và `QuickAccessCard` sẽ đẩy (push) thẳng người dùng vào `/tu-van`, `/tam-su`, `/tra-cuu`, v.v.
- **Từ Tư vấn/Tâm sự:** AI có khả năng trả về các "Action Cards" (Inline Embeds) gợi ý người dùng nhảy sang `/sang-loc` (làm test) hoặc `/bac-si` (tìm bác sĩ).
- **Xác thực (Auth Guard):** Các trang thuộc nhóm `/doctor/*`, `/quan-ly/*`, `/admin/*` và `/account` sẽ yêu cầu đăng nhập. Nếu chưa có phiên, hệ thống sẽ tự động redirect về `/login`.
- **Hệ thống đa ngôn ngữ (i18n):** Hệ thống có hỗ trợ route `/[locale]/...` (VD: `/vi/tu-van` hoặc `/en/tu-van`). Các trang không có prefix locale vẫn hoạt động nhờ middleware hoặc context xử lý ngầm.
