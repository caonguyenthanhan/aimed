# Phân tích Thực nghiệm Triệt tiêu (Ablation Study) Hệ thống AiMed

Nghiên cứu triệt tiêu thành phần (Ablation Study) được thực hiện nhằm đánh giá định lượng đóng góp của ba thành phần cốt lõi: Bộ định tuyến ngữ nghĩa (Semantic Router), Đồ thị tri thức kết hợp (GraphRAG), và Kiến trúc đa tác tử (Multi-Agent). Kết quả thực nghiệm trên 100 ca kiểm thử chuẩn hóa cho thấy các bước tiến lớn về cả độ chính xác định tuyến, an toàn thông tin và chất lượng phản hồi lâm sàng.

### 1. Đóng góp của Bộ định tuyến Ngữ nghĩa (B1 so với B0)
Khi chuyển từ B0 (chỉ sử dụng regex so khớp từ khóa tĩnh) sang B1 (tích hợp Semantic Router và ChromaDB), độ chính xác định tuyến tăng mạnh từ **56.67%** lên **88.89%** (tương ứng mức cải thiện **+32.22%**). Sự cải thiện này chứng minh khả năng vượt trội của mô hình nhúng ngữ nghĩa (embedding) trong việc nhận diện ý định người dùng đối với các câu từ tự nhiên biến tướng hoặc không chứa từ khóa trực tiếp. Về mặt an toàn, tầng bảo vệ an toàn đầy đủ (Safety Guardrail) giúp tăng tỷ lệ thu hồi an toàn (Safety Recall) từ **70.0%** lên **100.0%**, chặn đứng toàn bộ các hình thức tấn công Red-Team gián tiếp hoặc giả định.

### 2. Đóng góp của Đồ thị Tri thức GraphRAG (B2 so với B1)
Phương pháp RAG truyền thống dựa trên vector thô (B1) dễ bị phân mảnh khi gặp các câu hỏi y học phức tạp liên kết nhiều đối tượng. Bằng việc tích hợp đồ thị tri thức Neo4j/Memgraph (B2), điểm chất lượng y học tăng rõ rệt từ **6.40/10** lên **8.50/10** (cải thiện **+32.81%** dựa trên điểm gốc B1). Đồ thị tri thức giúp LLM xác định chính xác các quan hệ bắc cầu lâm sàng (như tương tác thuốc qua men gan hoặc triệu chứng liên kết hội chứng), giảm thiểu đáng kể ảo giác y học. Sự nâng cấp này kéo theo một lượng trễ xử lý (latency overhead) đáng chú ý: độ trễ p95 tăng từ **2650.0 ms** lên **4580.0 ms** (+72.8%) do phát sinh truy vấn đồ thị Cypher và tổng hợp thực thể.

### 3. Đóng góp của Kiến trúc Đa tác tử (B3 so với B2)
Việc áp dụng mô hình đa tác tử chuyên khoa phối hợp qua LangGraph Supervisor (B3) giải quyết triệt để giới hạn quá tải ngữ cảnh (context overload) của mô hình đơn tác tử (B2). B3 nâng độ chính xác định tuyến chuyên khoa lên mức **97.78%** và đưa điểm chất lượng phản hồi lên mức cao nhất **9.70/10** (tăng **+14.12%** so với B2). Mỗi tác tử chuyên khoa (như triage, medication, therapy) được tối ưu hóa bằng hệ thống prompt và cơ sở tri thức riêng biệt, giúp câu trả lời đi sâu vào trọng tâm chuyên môn mà vẫn kiểm soát tốt độ trễ (p95 chỉ tăng nhẹ lên **4932.3 ms** so với B2).

### Kết luận
Thực nghiệm triệt tiêu thành phần khẳng định rằng sự kết hợp đồng bộ giữa kiến trúc đa tác tử LangGraph và công nghệ đồ thị tri thức GraphRAG là cấu hình tối ưu để giải quyết các bài toán y tế phức tạp. Mặc dù B3 chịu sự đánh đổi về độ phức tạp và chi phí trễ phản hồi ban đầu, lợi ích mang lại về mặt an toàn lâm sàng và độ chính xác chuyên môn là cực kỳ vượt trội, khẳng định tính khả thi cao trong môi trường chăm sóc sức khỏe số thực tế.
