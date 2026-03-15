# TODO LIST - TRIỂN KHAI KLTN MULTI-AGENT Y TẾ & TÂM LÝ

SSOT: `data/team-todo.json`

File này là bản tham chiếu. Nội dung hiển thị trong hệ thống Team TODO được sinh từ JSON.

* [ ] 🧑‍💻 **\[Manual]** Xuất và Deploy mô hình Llama 3.1 fine-tuned (GGUF/vLLM).  
* [ ] 🤖 **\[AI IDE]** Cập nhật LangGraph: Đổi LLM từ Gemini sang Local GPU Server.  
* [ ] 🤖 **\[AI IDE]** Thêm Giao diện Quản lý Đồng ý (Consent) bên phía Bệnh nhân: Nút \[Cho phép Bác sĩ xem dữ liệu biểu đồ cảm xúc]. *(Nếu không cho phép, Doctor Dashboard sẽ bị che data bệnh nhân này).*  
* [ ] 🤖 **\[AI IDE]** Cài đặt luồng Offboarding: Viết hàm Python xóa lịch sử trong Zep khi User ngắt kết nối.  
* [ ] 🧑‍💻 **\[Manual]** Kiểm thử thuật toán Smart Routing: Chuyển đổi mượt mà giữa **GPU Server** và **Gemini API / Local CPU**.

## **SPRINT 6: Testing, Đo lường & Viết Báo cáo KLTN (Tuần 14-16)**

*Mục tiêu: Đóng gói dự án, đánh giá và viết luận văn.*

* [ ] 🧑‍💻 **\[Manual]** Đóng vai (Role-play) Testing: Đóng vai Bác sĩ setup level -> Đóng vai bệnh nhân chat để xem AI phản ứng có đúng theo cấu hình của Bác sĩ không.  
* [ ] 🤝 **\[Hybrid]** Đo lường các chỉ số: TTFB, Tỷ lệ Fallback, Độ trễ của GraphRAG.  
* [ ] 🤝 **\[Hybrid]** Viết Báo cáo KLTN theo Đề cương. Nhấn mạnh "Không gian Bác sĩ" và "Luồng Setup Level" ở Chương 2 & 3.  
* [ ] 🤖 **\[AI IDE]** Đóng gói dự án (Docker Compose).  
* [ ] 🧑‍💻 **\[Manual]** Làm Slide thuyết trình và Quay sẵn Video Demo (1 video đóng vai bệnh nhân, 1 video đóng vai bác sĩ).
