### 5.8. Đóng góp khoa học của nghiên cứu

Nghiên cứu phát triển hệ thống trợ lý y tế số và sức khỏe tinh thần AiMed mang lại ba đóng góp khoa học và thực tiễn cốt lõi đối với lĩnh vực y tế thông minh và ứng dụng mô hình ngôn ngữ lớn tại Việt Nam.

#### 1. Kiến trúc Multi-Agent GraphRAG chuyên biệt cho y tế số
Đóng góp lớn nhất của nghiên cứu là việc thiết kế và hiện thực hóa thành công mô hình lai kết hợp giữa kiến trúc đa tác tử (Multi-Agent) và đồ thị tri thức (GraphRAG). Bằng cách phân rã hệ thống thành các tác tử chuyên khoa (như triage, medication, therapy) dưới sự điều phối của LangGraph Supervisor, nghiên cứu đã khắc phục hiệu quả hiện tượng quá tải ngữ cảnh (context overload) và hạn chế ảo giác thông tin của mô hình ngôn ngữ lớn. Việc tích hợp cấu trúc đồ thị Neo4j/Memgraph giúp mô hình khai thác được các quan hệ bắc cầu lâm sàng phức tạp (như tương tác thuốc hiệp đồng hoặc chống chỉ định sốt xuất huyết), nâng cao tính an toàn và chất lượng câu trả lời vượt trội so với tìm kiếm vector đơn thuần.

#### 2. Bộ dữ liệu kiểm thử chuẩn hóa tiếng Việt cho y khoa và tâm lý lâm sàng
Nghiên cứu đóng góp cho cộng đồng một bộ dữ liệu kiểm thử chuẩn hóa mang tên `test_cases_v2.json` gồm 100 kịch bản ngôn ngữ tự nhiên được xây dựng khoa học. Bộ dữ liệu này phân chia chi tiết thành 7 phân tầng y học, bao gồm cả các tình huống sàng lọc cấp cứu (Triage), hỗ trợ trị liệu nhận thức hành vi (CBT Therapy) và tra cứu dược học (Medication), kèm theo các ca thử nghiệm xâm nhập nguy hại (Red-Teaming). Đây là một tài nguyên tham chiếu có giá trị giúp các nghiên cứu tiếp theo có thể đối chiếu và đánh giá độ chính xác định tuyến chuyên khoa cũng như độ tin cậy của bộ chặn an toàn trong ngữ cảnh tiếng Việt.

#### 3. Mô hình chăm sóc phân tầng Stepped Care tích hợp vào Chatbot AI
Nghiên cứu đã hiện thực hóa thành công mô hình chăm sóc phân tầng Stepped Care gồm 4 cấp độ can thiệp vào giao diện Chatbot AI trực quan. Lần đầu tiên, một hệ thống AI có khả năng tự động phân loại mức độ rủi ro sức khỏe tinh thần từ PHQ-9/GAD-7 để cung cấp lộ trình cá nhân hóa: từ việc tự theo dõi bằng video thiền ở Cấp độ 1, trị liệu CBT tương tác ở Cấp độ 3, cho đến kích hoạt hộp thoại SOS cứu hộ khẩn cấp và cung cấp số điện thoại 115 ở Cấp độ 4. Cơ chế này giúp phân bổ hợp lý nguồn lực y tế và hỗ trợ bệnh nhân tiếp cận dịch vụ chăm sóc phù hợp một cách nhanh chóng.
