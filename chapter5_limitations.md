### 5.7. Hạn chế và hướng phát triển của nghiên cứu

Mặc dù hệ thống AiMed đã ghi nhận các kết quả thực nghiệm tích cực về độ chính xác phân luồng và khả năng bảo vệ của chốt chặn an toàn, nghiên cứu vẫn tồn tại một số hạn chế cốt lõi cần được thừa nhận và định hướng khắc phục trong tương lai.

#### 1. Các hạn chế được phát hiện trong quá trình đánh giá:
*   **Tính đại diện của bộ dữ liệu:** Bộ dữ liệu kiểm thử gồm 100 câu hỏi lâm sàng chuẩn hóa được xây dựng bởi nhóm tác giả dựa trên các tài liệu tham khảo và dịch thuật y học ngoại văn. Bộ câu hỏi này chưa trải qua quá trình kiểm định độc lập hoặc thử nghiệm lâm sàng quy mô lớn từ các tổ chức y tế chuyên nghiệp. Do đó, nó có thể chưa bao phủ được sự đa dạng về phương ngữ, khẩu ngữ hoặc cách viết tắt đặc thù của người dùng Việt Nam.
*   **Cỡ mẫu kiểm thử an toàn nhỏ:** Số lượng tình huống nguy hại lâm sàng để kiểm thử tầng an toàn (Safety Guardrail) chỉ giới hạn ở mức $n = 10$ ca trực tiếp và 10 ca Red-Team biến tướng. Cỡ mẫu nhỏ này làm cho khoảng tin cậy của tỷ lệ thu hồi an toàn bị kéo rộng (dao động từ 69.2% đến 100.0%), chưa phản ánh đầy đủ độ tin cậy thống kê lâm sàng dài hạn.
*   **Thiếu nghiên cứu người dùng thực tế:** Đánh giá mới chỉ dừng lại ở mức phòng thí nghiệm thông qua các bộ dữ liệu kiểm thử giả định (offline evaluation) và sử dụng mô hình ngôn ngữ lớn làm giám khảo tự động (AI Judge). Nghiên cứu chưa thực hiện kiểm thử thực tế trên nhóm người dùng cuối (User Study) hoặc các thử nghiệm lâm sàng thực tế tại các cơ sở y tế để thu thập ý kiến đánh giá trực tiếp từ bệnh nhân và bác sĩ.
*   **Chưa có sự xác nhận của chuyên gia độc lập:** Các nhãn định tuyến, câu trả lời y tế và cấu trúc đồ thị tri thức tuy được đối chiếu với dược thư và tài liệu chính thống, nhưng chưa được hội đồng chuyên gia y tế độc lập thẩm định chi tiết để đánh giá mức độ đồng thuận lâm sàng.
*   **Độ trễ xử lý của GraphRAG:** Việc truy xuất đồ thị tri thức tạo ra một lượng thời gian trễ xử lý (overhead latency) tăng thêm khoảng 73.3% so với Vector RAG thô, hạn chế khả năng tương thích của ứng dụng trên các thiết bị di động cấu hình yếu.

#### 2. Hướng phát triển tiếp theo:
Trong các giai đoạn nghiên cứu tương lai, nhóm tác giả định hướng mở rộng quy mô bộ dữ liệu kiểm thử lên tối thiểu 1000 kịch bản lâm sàng, thực hiện đánh giá human-in-the-loop rộng rãi với sự tham gia của các bác sĩ chuyên khoa, đồng thời tối ưu hóa bộ nhớ đệm đồ thị (Graph Cache) để đưa độ trễ phản hồi p95 về mức dưới 2.0 giây.
