📋 BẢNG KẾ HOẠCH TỔNG THỂ (MASTER TODO LIST)

Dự án: Hệ thống Can thiệp Sức khỏe Tâm thần Kỹ thuật số Đa tác tử
Quy hoạch: 5 Epic (Giai đoạn) cốt lõi

🎯 EPIC 1: HOÀN THIỆN UI/UX & TRẢI NGHIỆM NGƯỜI DÙNG

Mục tiêu: Giải quyết các lỗi giao diện gây đứt gãy Liên minh Trị liệu.

[ ] 🤖 [AI IDE] Header/Công cụ: Thêm logic tự động đóng Menu khi nhảy trang (sử dụng hook usePathname).

[ ] 🤖 [AI IDE] Trang /tam-su: Sửa lỗi không tự cuộn trang với hội thoại dài (Thêm messagesEndRef auto-scroll để mạch tâm sự không bị gián đoạn).

🔄 EPIC 2: LUỒNG DỮ LIỆU LÂM SÀNG & CHĂM SÓC BẬC THANG

Mục tiêu: Đảm bảo luân chuyển dữ liệu người dùng mượt mà, ghi nhận lộ trình điều trị.

[ ] 🤝 [Hybrid] Trang /tu-van: Xử lý triệt để lỗi kết nối database (Tối ưu Connection Pool cho Serverless).

[ ] 🤖 [AI IDE] Sàng lọc (1/3): Viết API lưu lại lịch sử làm bài kiểm tra vào hồ sơ bệnh nhân để ghi nhận tiến trình điều trị.

[ ] 🤖 [AI IDE] Sàng lọc (2/3): Truyền kết quả bài kiểm tra vào LLM Context khi user nhảy sang trang /tam-su để AI chủ động dùng làm câu mở đầu.

[ ] 🤖 [AI IDE] Sàng lọc (3/3) - Hệ sinh thái chéo: Lấy kết quả kiểm tra để tự động đề xuất bài viết (tin tức y khoa), đề xuất hoạt động trị liệu và nhắc nhở.

[ ] 🤖 [AI IDE] Tính năng Trị liệu: Nâng cấp giao diện và luồng tương tác (tái cấu trúc UI hiện tại đang thô sơ).

[ ] 🤖 [AI IDE] Tính năng Nhắc nhở: Lập trình chức năng thêm/sửa/xóa và module chạy ngầm kích hoạt thông báo nhắc nhở.

👨‍⚕️ EPIC 3: KHÔNG GIAN BÁC SĨ & CÁ NHÂN HÓA

Mục tiêu: Cung cấp công cụ mạnh mẽ cho Bác sĩ và hỗ trợ sức khỏe tinh thần cho y bác sĩ.

[ ] 🤖 [AI IDE] Trang giới thiệu Bác sĩ: Tạo phân hệ thông tin Public/Private. Thêm chế độ "Preview" để bác sĩ xem trước UI hiển thị cho bệnh nhân.

[ ] 🤖 [AI IDE] Hẹn lịch: Xây dựng chức năng cho phép bệnh nhân đặt lịch hẹn trực tiếp với bác sĩ.

[ ] 🤝 [Hybrid] Prompt Cá nhân hóa: Thêm form để bác sĩ tự nhập Prompt, giúp Trợ lý AI phụ trách đón bệnh nhân mang văn phong riêng của bác sĩ đó.

[ ] 🤖 [AI IDE] Chăm sóc Bác sĩ: Bổ sung chức năng "Tư vấn" và "Tâm sự" vào header của trang Doctor (Bác sĩ cũng cần được hỗ trợ tâm lý).

🛡️ EPIC 4: ĐẠO ĐỨC LÂM SÀNG & QUẢN LÝ DỮ LIỆU

Mục tiêu: Hoàn thiện Dashboard, quản lý hồ sơ và bảo mật thông tin PII (HIPAA).

[ ] 🤖 [AI IDE] Doctor Dashboard: Kích hoạt và kết nối API cho các nút "Hành động nhanh".

[ ] 🤖 [AI IDE] Doctor Dashboard: Xử lý sự kiện click mục "Tư vấn gần đây" để mở modal/trang xem lại toàn bộ lịch sử tư vấn.

[ ] 🤖 [AI IDE] Quản lý Bệnh nhân (/doctor/patients): Bổ sung dữ liệu demo chuẩn y khoa để test giao diện xem chi tiết hồ sơ.

[ ] 🤖 [AI IDE] Quản lý Báo cáo (/doctor/reports): Xây dựng form và logic cho phép bác sĩ tạo báo cáo y khoa mới.

[ ] 🤝 [Hybrid] Diễn đàn Y khoa: Tạo không gian ẩn danh để bác sĩ hỏi/chia sẻ chuyên môn. Cài đặt thuật toán (AI/Regex) tự động quét và che mờ thông tin cá nhân (PII) của bệnh nhân.

🌱 EPIC 5: TỰ CHĂM SÓC, GAME HÓA & AN TOÀN LÂM SÀNG

Mục tiêu: Tăng cường tương tác bằng tâm lý học thực chứng và bảo vệ an toàn sinh mạng.

[ ] 🚨 [Hybrid] Khủng hoảng khẩn cấp (SOS Mode): Thiết lập Agent phân tích từ khóa tự sát/xâm hại (từ text/audio). Kích hoạt màn hình đỏ cảnh báo và hiển thị Hotline (VD: 111) ngay lập tức.

[ ] 🤖 [AI IDE] Thẻ Trị liệu (Therapeutic Cards): Xây dựng module "Rút thẻ mỗi ngày" với các thông điệp Chánh niệm/CBT (Thay thế cho Tarot).

[ ] 🤖 [AI IDE] Bánh xe Cuộc đời (Wheel of Life): Xây dựng module radar chart để bệnh nhân tự đánh giá đa chiều (Sự nghiệp, Tình cảm, Sức khỏe).

[ ] 🤝 [Hybrid] Hành trình Tâm trí (Patient Insight): Xây dựng Dashboard riêng cho bệnh nhân chứa biểu đồ diễn biến điểm số PHQ-9/GAD-7 qua các tuần.

Chú thích:
🤖 [AI IDE]: Dùng công cụ AI Code (Cursor, Windsurf) để sinh code tự động phần lớn.
🤝 [Hybrid]: Kết hợp AI viết nháp và tinh chỉnh kiến trúc logic kỹ bằng tay.