# **TODO LIST - TRIỂN KHAI KLTN MULTI-AGENT Y TẾ & TÂM LÝ**

*(Chiến lược: Phát triển nhanh với Gemini API -> Tích hợp Fine-tuned GPU LLM sau)*

**Bảng chú giải:**

- 🤖 **\[AI IDE]**: Dùng AI (Cursor, Windsurf, Copilot) để sinh code tự động (80-100%).
- 🧑‍💻 **\[Manual]**: Cấu hình hệ thống, click chuột, hoặc công việc bắt buộc con người tự làm.
- 🤝 **\[Hybrid]**: AI làm nháp, Con người (bạn) review, tinh chỉnh logic/kiến thức chuyên môn.

## **SPRINT 1: Tái cấu trúc & Chuẩn bị Môi trường (Tuần 1-2)**

*Mục tiêu: Setup base project và cấu hình Gemini API làm bộ não tạm thời.*

- \[ x] 🧑‍💻 **\[Manual]**  Tạo repo Github mới, clone code từ dự án tiền thân Medical-Consulting-System.
- \[ x] 🤖 **\[AI IDE]**  Thiết kế & Code Unified Composer trên Next.js (gom Text/Voice/Image vào 1 input duy nhất). *(Prompt AI: "Tạo một React component chat input có nút upload file và voice record giống ChatGPT")*
- \[ x] 🤖 **\[AI IDE]**  Chuẩn hóa Result Schema và Message Schema để UI Next.js render thống nhất. *(Dùng AI sinh TypeScript Interfaces/Zod schemas).*
- \[ x] 🤖 **\[AI IDE]**  Refactor FastAPI: Tích hợp thư viện google-generativeai hoặc dùng LangChain/LangGraph với ChatGoogleGenerativeAI. Cấu hình .env chứa GEMINI\_API\_KEY.
- \[ ] 🧑‍💻 **\[Manual]**  Dùng **Neon Postgres (Cloud)** (phù hợp Vercel) và cấu hình biến môi trường trên Vercel: `DATABASE_URL` (pooler). *(Nếu dùng migration/ORM cần direct connection thì thêm `DIRECT_URL`.)*
- \[ ] 🤝 **\[Hybrid]**  Định nghĩa Ontology (Cấu trúc đồ thị) cho Y tế: (Triệu chứng) - \[Báo hiệu] -> (Bệnh) - \[Điều trị] -> (Thuốc). *(Bạn chốt cấu trúc, nhờ AI kiểm tra tính hợp lý).*
- \[ ] 🧑‍💻 **\[Manual]**  Cài đặt Zep (Long-term memory) qua command Docker.

## **SPRINT 2: Xây dựng Não bộ Y khoa - GraphRAG (Tuần 3-5)**

*Mục tiêu: Dùng khả năng xử lý context dài của Gemini để bóc tách Graph và truy xuất.*

- \[ ] 🤝 **\[Hybrid]**  Thu thập & Làm sạch dữ liệu Y tế (từ điển bệnh, thuốc nội địa Việt Nam). *(Dùng AI viết script cào dữ liệu, nhưng bạn phải duyệt xem nguồn có uy tín không).*
- \[ ] 🤖 **\[AI IDE]**  Viết script Python dùng **Gemini API** để trích xuất Thực thể (Entities) và Mối quan hệ (Relationships) từ text -> Import vào Neo4j.
- \[ ] 🤖 **\[AI IDE]**  Viết các câu lệnh Cypher Query mẫu để truy xuất chéo.
- \[ ] 🤖 **\[AI IDE]**  Tích hợp Vector Search (ChromaDB) + Graph Search (Neo4j) -> Tạo thành Tool Python search\_medical\_graph.
- \[ ] 🤖 **\[AI IDE]**  Viết Node "Agent Y khoa" trong LangGraph (sử dụng model LLM là Gemini), cấp quyền gọi tool search\_medical\_graph.

## **SPRINT 3: Tác tử Tâm lý & Đánh giá Ẩn (Tuần 6-8)**

*Mục tiêu: Xây dựng "Bạn tâm giao" và cơ chế Stealth Assessment bằng Gemini.*

- \[ ] 🤝 **\[Hybrid]**  Viết System Prompt cho Tác tử Tâm lý: Định hình Persona hài hước, áp dụng kỹ thuật khơi gợi (CurioScope). *(Nhờ AI viết nháp, nhưng bạn phải mài giũa văn phong tiếng Việt cho tự nhiên, giống GenZ).*
- \[ ] 🤖 **\[AI IDE]**  Xây dựng luồng Logic "Đánh giá ẩn": Dùng 1 LLM chain (Gemini 1.5 Flash cho nhanh/rẻ) chạy ngầm để chấm điểm PHQ-9/GAD-7 dựa trên log chat.
- \[ ] 🤖 **\[AI IDE]**  Tích hợp Zep API để lưu trữ Điểm số Tâm lý này theo thời gian.
- \[ ] 🤖 **\[AI IDE]**  Cập nhật UI Next.js: Render câu đùa, hiệu ứng "đang gõ" (streaming) từ API Gemini trả về.
- \[ ] 🤖 **\[AI IDE]**  Code Node "Agent Tâm lý" và "Node Chấm điểm ngầm" vào luồng Python LangGraph.

## **SPRINT 4: Lộ trình Can thiệp (Stepped Care) & Function Calling (Tuần 9-11)**

*Mục tiêu: Tận dụng khả năng Function Calling native rất mạnh của Gemini.*

- \[ ] 🤖 **\[AI IDE]**  Thêm Tool Function Calling: search\_youtube\_video(query) và thiết lập UI Next.js render iframe video (Cấp độ can thiệp 1/2).
- \[ ] 🤖 **\[AI IDE]**  Cấu hình Google Calendar API và Email (SMTP) để làm Tool book\_appointment và send\_report.
- \[ ] 🤖 **\[AI IDE]**  Viết Cronjob/Background Task kích hoạt Tác tử Tâm lý chủ động nhắn tin hỏi thăm (Follow-up - Cấp độ 3).
- \[ ] 🤖 **\[AI IDE]**  Viết logic rẽ nhánh (Conditional Edges/State Routing) trong LangGraph: Nếu điểm > Ngưỡng -> Kích hoạt Tác tử Điều phối (Cấp độ 4).
- \[ ] 🤝 **\[Hybrid]**  Thiết kế Prompt sinh "Báo cáo Tóm tắt Lâm sàng" (Clinical Summary) từ lịch sử chat. *(Bạn phải canh chuẩn form báo cáo y khoa).*

## **SPRINT 5: Tích hợp Fine-Tuned GPU LLM & Hybrid Routing (Tuần 12-13)**

*Mục tiêu: Ráp mô hình "nhà làm" (Llama 3.1 fine-tuned) vào hệ thống đã chạy trơn tru.*

- \[ ] 🧑‍💻 **\[Manual]**  Xuất mô hình LLM đã fine-tuning cá nhân (ví dụ: định dạng GGUF chạy trên Llama.cpp hoặc deploy lên vLLM/Colab).
- \[ ] 🤖 **\[AI IDE]**  Cập nhật LangGraph: Đổi module LLM gọi từ API Gemini sang gọi API của Local GPU Server.
- \[ ] 🤖 **\[AI IDE]**  Thêm Giao diện Quản lý Đồng ý (Consent Management) trên UI: Thêm 2 nút \[Cho phép Bác sĩ xem dữ liệu] và \[Dừng theo dõi tâm lý].
- \[ ] 🤖 **\[AI IDE]**  Cài đặt luồng Clinical Offboarding: Viết hàm Python xóa lịch sử trong Zep khi User ngắt kết nối.
- \[ ] 🧑‍💻 **\[Manual]**  Kiểm thử & Hoàn thiện thuật toán Smart Routing: Chuyển đổi mượt mà giữa **GPU Server (Mô hình fine-tuned)** và **Gemini API / Local CPU** khi có sự cố. *(Phải tự ngắt mạng/tắt ngrok để test).*

## **SPRINT 6: Testing, Đo lường & Viết Báo cáo KLTN (Tuần 14-16)**

*Mục tiêu: Đóng gói dự án, so sánh hiệu năng và hoàn thiện luận văn.*

- \[ ] 🧑‍💻 **\[Manual]** **\[Joint]** A/B Testing: Gọi bạn bè vào chat thử để so sánh chất lượng câu trả lời, độ thấu cảm giữa **Gemini API** và **LLM Fine-tuned cá nhân**.
- \[ ] 🤝 **\[Hybrid]** **\[Joint]** Đo lường các chỉ số: TTFB, Tỷ lệ Fallback thành công, Độ trễ của GraphRAG. *(Dùng AI viết script đo, bạn thống kê số liệu).*
- \[ ] 🤝 **\[Hybrid]** **\[Joint]** Chia nhau viết Báo cáo KLTN theo Đề cương chi tiết:
  - *An viết Chương 1, Chương 2 (phần AI, Tâm lý, Neo4j, Fine-tuning LLM).*
  - *Thịnh viết Chương 2 (phần System, Hybrid), Chương 3, Chương 4.*
  - *(Dùng AI để trau chuốt câu từ (Proofread), nhưng nội dung lõi phải do các bạn tự viết).*
- \[ ] 🤖 **\[AI IDE]**  Đóng gói dự án (Docker Compose): *(Đưa toàn bộ project cho Cursor/Copilot bảo nó viết file docker-compose.yml chạy 1 click là xong).*
- \[ ] 🧑‍💻 **\[Manual]** **\[Joint]** Làm Slide thuyết trình và Quay sẵn 1 Video Demo 5 phút.

