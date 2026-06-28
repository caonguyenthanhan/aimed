# CHƯƠNG 4: CÀI ĐẶT VÀ TRIỂN KHAI HỆ THỐNG
## 4.4. GIAO DIỆN SẢN PHẨM VÀ DEMO

Sự thành công của một hệ thống y tế số không chỉ phụ thuộc vào độ chính xác của thuật toán phía Backend mà còn chịu ảnh hưởng sâu sắc bởi khả năng thiết kế giao diện người dùng (UI) và trải nghiệm tương tác (UX). Nhận thức được tầm quan trọng này, nhóm nghiên cứu đã hiện thực hóa giao diện hệ thống AiMed trên môi trường sản xuất (deploy thực tế tại địa chỉ: `https://aimed-one.vercel.app/`), tuân thủ ngôn ngữ thiết kế **Glassmorphism** kết hợp tông màu tối (Neon Dark Aesthetic) nhằm mang lại cảm giác xoa dịu tâm lý và giảm thiểu áp lực tinh thần cho bệnh nhân.

---

### 4.4.1. Cổng thông tin cổng chào và Khung tương tác cốt lõi (Landing Page & Chat Interface)

#### 1. Giao diện Trang chủ (Landing Page)
Trang chủ đóng vai trò là điểm chạm đầu tiên (first touchpoint) để định hình niềm tin của người bệnh đối với hệ thống y tế số. Giao diện được thiết kế theo phong cách hiện đại với nền tối sâu, kết hợp các thẻ dịch vụ bo góc mềm mại phát ánh sáng neon mờ. 

Cổng thông tin phân bổ trực quan bốn tính năng cốt lõi: Tư vấn AI chuyên sâu, Sàng lọc nhanh sức khỏe, Trị liệu chánh niệm chắt lọc, và Tra cứu kết nối bác sĩ. Các hiệu ứng chuyển động vi mô (micro-animations) khi di chuột được nhúng vào các thẻ nhằm gia tăng tính định hướng hành vi.

![Giao diện Trang chủ](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/landing_page_1782496144886.png)
*Hình 4.4: Giao diện Trang chủ và Cổng chào của hệ thống AiMed (Landing Page)*

---

#### 2. Giao diện Khung trò chuyện đa tác tử (Chat Interaction)
Khung chat là trung tâm tương tác giữa bệnh nhân và hệ thống đa tác tử LangGraph. Giao diện được quy hoạch thành cấu trúc ba phân vùng độc lập (Tripartite Layout):
*   **Thanh biên trái:** Quản lý lịch sử các cuộc hội thoại, cho phép người bệnh nhanh chóng khôi phục bối cảnh trò chuyện cũ.
*   **Khung chat ở giữa:** Nơi diễn ra hội thoại trực tiếp. Phân hệ Frontend tự động biên dịch cấu trúc JSON trả về từ backend để hiển thị các dạng bong bóng chat khác nhau (tùy thuộc vào tác tử đang trả lời như Triage, Medication, hay Therapy).
*   **Thanh biên phải:** Hiển thị các công cụ bổ trợ động như thanh trạng thái của các bài tập thở hoặc widget phát nhạc sóng não.

Đặc biệt, hệ thống tích hợp khả năng tự động kết xuất (render) các thẻ hành động trực tiếp vào luồng tin nhắn (ví dụ: gợi ý nút bấm chuyển tuyến, thẻ lựa chọn trắc nghiệm nhanh), giúp tối ưu hóa thao tác của bệnh nhân.

![Khung Chat Tư vấn AI](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/chat_page_1782496158778.png)
*Hình 4.5: Giao diện Khung trò chuyện đa tác tử thời gian thực (Chat Interface)*

---

### 4.4.2. Sàng lọc sức khỏe tâm thần và Không gian trị liệu chánh niệm (Screening & Therapy)

#### 1. Giao diện Khảo sát sàng lọc tâm lý (Screening Page)
Trang sàng lọc là nơi số hóa các bài trắc lượng tâm thần học chuẩn lâm sàng như PHQ-9 (đo mức độ trầm cảm) và GAD-7 (đo mức độ lo âu). Giao diện loại bỏ hoàn toàn biểu mẫu văn bản nhập thô dễ gây nhàm chán và áp lực, thay thế bằng các câu hỏi dạng thẻ chọn lựa trực quan hoặc thanh trượt điều hướng (slider). 

Ngay khi người dùng hoàn thành câu hỏi cuối cùng, hệ thống sẽ thực hiện tính toán điểm số cục bộ và hiển thị kết quả phân tầng nguy cơ y tế trực quan dưới dạng biểu đồ màu sắc, kèm theo các đề xuất tự chăm sóc phù hợp theo đúng mô hình Stepped Care.

![Giao diện Sàng lọc sức khỏe](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/screening_page_1782496170046.png)
*Hình 4.6: Giao diện Khảo sát sàng lọc tâm lý (Screening Interface)*

---

#### 2. Giao diện Không gian trị liệu tự lực (Therapy Room)
Đối với bệnh nhân được phân loại ở Cấp độ 1 và Cấp độ 2 của mô hình Stepped Care (nguy cơ nhẹ hoặc trung bình), hệ thống sẽ điều hướng họ vào Phòng trị liệu tâm lý tĩnh. Giao diện này cung cấp hai nhóm công cụ can thiệp lâm sàng:
*   **Bài tập hít thở nhịp sinh học:** Số hóa các bài tập điều hòa nhịp thở (như kỹ thuật thở 4-7-8, thở hộp Box Breathing) thông qua một vòng tròn giãn nở động theo thời gian thực để bệnh nhân điều hòa hệ thần kinh phó giao cảm.
*   **Thư viện âm thanh sóng não:** Phát các dải tần sóng não Alpha và Delta có tác dụng hỗ trợ thư giãn sâu và ổn định giấc ngủ cấp tính.

![Phòng Trị liệu Tâm lý](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/therapy_page_1782496218587.png)
*Hình 4.7: Giao diện Không gian trị liệu chánh niệm tự lực (Therapy Interface)*

---

### 4.4.3. Quản lý kế hoạch chăm sóc cá nhân hóa và Kết nối bác sĩ (Care Plan & Referral)

#### 1. Giao diện Bảng điều khiển kế hoạch chăm sóc (Care Plan Dashboard)
Bảng điều khiển cá nhân hóa giúp bệnh nhân thiết lập và giám sát các thói quen sinh hoạt phục hồi sức khỏe hằng ngày. Người dùng có thể tương tác với checklist công việc được hệ thống AI cá nhân hóa (ví dụ: uống thuốc huyết áp đúng giờ, thực đơn giảm cân cho người tiểu đường tuýp 2). 

Hệ thống tích hợp công cụ vẽ biểu đồ sinh hiệu (huyết áp, nhịp tim) để bệnh nhân ghi chép và tự theo dõi xu hướng biến thiên sức khỏe thể chất lâu dài.

![Bảng Kế hoạch chăm sóc](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/care_plan_page_1782496246446.png)
*Hình 4.8: Bảng theo dõi kế hoạch chăm sóc sức khỏe cá nhân (Care Plan Interface)*

---

#### 2. Giao diện Tìm kiếm và Kết nối Bác sĩ chuyên khoa (Doctor Referral)
Trong trường hợp kết quả sàng lọc phát hiện dấu hiệu bệnh lý nghiêm trọng (Red Flags) vượt quá khả năng hỗ trợ của AI, hệ thống sẽ thực hiện luồng chuyển tuyến. Người dùng được hướng dẫn đến giao diện danh mục bác sĩ liên kết. 

Giao diện tích hợp bộ lọc đa chiều (theo chuyên khoa Tim mạch, Tâm thần, Da liễu, và khoảng cách địa lý). Mỗi bác sĩ có một trang thông tin hiển thị kinh nghiệm lâm sàng, xếp hạng đánh giá và khung đặt lịch hẹn khám trực tiếp, rút ngắn đáng kể quy trình tiếp cận dịch vụ y tế chính thống ngoài đời thực.

![Thư mục Bác sĩ & Đặt lịch](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/doctor_referral_page_1782496233962.png)
*Hình 4.9: Giao diện Tìm kiếm và Kết nối Bác sĩ chuyên khoa (Doctor Referral Interface)*

---

### 4.4.4. Hệ thống giám sát vận hành LLMOps dành cho Quản trị viên (Admin Dashboard)

Để đảm bảo tính minh bạch và khả năng kiểm soát chất lượng vận hành của hệ thống đa tác tử, AiMed trang bị một trang quản trị (Admin Dashboard) dành riêng cho quản trị viên và đội ngũ kỹ thuật. 

Bảng điều khiển tích hợp công cụ trực quan hóa thời gian thực các chỉ số đo đạc hiệu năng bao gồm: tổng số lượng yêu cầu API, độ trễ phản hồi trung vị và chi phí sử dụng token của các mô hình ngôn ngữ lớn. Bên cạnh đó, hệ thống cung cấp sơ đồ truy vết (Traces) chi tiết đường đi của các tác tử LangGraph và hoạt động truy vấn GraphRAG, giúp kỹ sư phát hiện nhanh các điểm nghẽn tính toán hoặc lỗi cú pháp để kịp thời hiệu chỉnh cấu hình.

![Dashboard Quản trị LLMOps](/C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/34de9344-84c2-4e68-99d4-eccd012c529f/admin_dashboard_page_1782496260742.png)
*Hình 4.10: Dashboard quản trị traces và metrics LLMOps của hệ thống (Admin Interface)*
