# **TODO LIST - TRIỂN KHAI KLTN MULTI-AGENT Y TẾ & TÂM LÝ**

*(Chiến lược: Phát triển nhanh với Gemini API -> Tích hợp Fine-tuned GPU LLM sau)*

**Bảng chú giải:**

* 🤖 **\[AI IDE]**: Dùng AI (Cursor, Windsurf, Copilot) để sinh code tự động (80-100%).  
* 🧑‍💻 **\[Manual]**: Cấu hình hệ thống, click chuột, thiết kế kiến trúc.  
* 🤝 **\[Hybrid]**: AI làm nháp, Con người (bạn) review, tinh chỉnh logic.

**Thời gian dự kiến:** 16 Tuần

**Team:** - Thành An (AI/Data/Prompt/GraphRAG)

* Phú Thịnh (System/LangGraph/NextJS/FastAPI)

## **SPRINT 1: Tái cấu trúc, Phân quyền (RBAC) & Chuẩn bị Môi trường (Tuần 1-2)**

*Mục tiêu: Setup base project, cấu hình Gemini API và tạo ranh giới Bác sĩ - Bệnh nhân.*

* [ ] 🧑‍💻 **\[Manual]** Tạo repo Github mới, clone code từ dự án tiền thân.  
* [ ] 🤖 **\[AI IDE]** Tích hợp Auth & Phân quyền (Role-Based Access Control): Tạo 2 role Patient và Doctor. Bệnh nhân vào /chat, Bác sĩ vào /doctor-workspace.  
* [ ] 🤖 **\[AI IDE]** Thiết kế & Code Unified Composer trên Next.js (cho Bệnh nhân).  
* [ ] 🤖 **\[AI IDE]** Refactor FastAPI: Tích hợp google-generativeai. Cấu hình .env chứa GEMINI_API_KEY.  
* [ ] 🧑‍💻 **\[Manual]** Cài đặt và cấu hình Neo4j (AuraDB) và Zep (Long-term memory).  
* [ ] 🤝 **\[Hybrid]** Định nghĩa Ontology (Cấu trúc đồ thị) cho Y tế.

## **SPRINT 2: Doctor Workspace & Xây dựng Não bộ Y khoa (Tuần 3-5)**

*Mục tiêu: Bác sĩ có chỗ làm việc, AI có khả năng truy xuất đồ thị.*

* [ ] 🤖 **\[AI IDE]** Code UI Doctor Workspace - Phần 1: Màn hình **Patient List** và **Emotion Dashboard** (Hiển thị biểu đồ điểm số PHQ-9 mock data).  
* [ ] 🤝 **\[Hybrid]** Thu thập & Làm sạch dữ liệu Y tế (bệnh, thuốc).  
* [ ] 🤖 **\[AI IDE]** Viết script dùng Gemini API trích xuất Thực thể/Quan hệ từ text -> Import vào Neo4j.  
* [ ] 🤖 **\[AI IDE]** Tích hợp Vector Search + Graph Search -> Tạo Tool Python search_medical_graph.  
* [ ] 🤖 **\[AI IDE]** Viết Node "Agent Y khoa" trong LangGraph (Gemini model), cấp quyền gọi tool.

## **SPRINT 3: Tác tử Tâm lý & Luồng Setup Level Điều trị (Tuần 6-8)**

*Mục tiêu: Đánh giá ẩn và cung cấp công cụ "Lập trình AI" cho Bác sĩ.*

* [ ] 🤖 **\[AI IDE]** Code UI Doctor Workspace - Phần 2: Màn hình **Stepped Care Setup**. Form cho phép Bác sĩ nhập: Ngưỡng điểm cảnh báo, Link Video YouTube xả stress, Thông điệp dặn dò.  
* [ ] 🤖 **\[AI IDE]** Viết API FastAPI lưu cấu hình Level Điều trị này vào Database theo từng ID Bệnh nhân.  
* [ ] 🤖 **\[AI IDE]** Xây dựng luồng Logic "Đánh giá ẩn": LLM chain chạy ngầm chấm điểm PHQ-9/GAD-7 từ log chat, lưu vào Zep.  
* [ ] 🤝 **\[Hybrid]** Viết System Prompt động cho Agent Tâm lý: *Prompt phải tự động fetch (kéo) Cấu hình Level Điều trị của Bác sĩ từ Database để quyết định có nên gửi link Video hay đổi giọng điệu hay không.*  
* [ ] 🤖 **\[AI IDE]** Code Node "Agent Tâm lý" và "Node Chấm điểm ngầm" vào LangGraph.

## **SPRINT 4: Tác tử Thư ký & Function Calling B2B (Tuần 9-11)**

*Mục tiêu: Kết nối hành động giữa Bệnh nhân và Bác sĩ.*

* [ ] 🤖 **\[AI IDE]** Cấu hình Google Calendar API làm Tool book_appointment.  
* [ ] 🤖 **\[AI IDE]** Code UI Doctor Workspace - Phần 3: Màn hình **Appointment & Alerts**. Nhận thông báo "Cờ đỏ" khi điểm Tâm lý bệnh nhân vượt ngưỡng. Có nút \[Duyệt lịch hẹn].  
* [ ] 🤖 **\[AI IDE]** Viết Cronjob kích hoạt Tác tử Tâm lý chủ động nhắn tin hỏi thăm bệnh nhân.  
* [ ] 🤖 **\[AI IDE]** Viết logic rẽ nhánh LangGraph: Nếu điểm > Ngưỡng -> Agent Thư ký bắn Notification/Email khẩn cấp cho Bác sĩ.

## **SPRINT 5: Tích hợp Fine-Tuned GPU LLM & Hybrid Routing (Tuần 12-13)**

*Mục tiêu: Ráp mô hình "nhà làm" và hoàn thiện cơ chế Fallback.*

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
