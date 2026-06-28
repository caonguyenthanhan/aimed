### 5.6. Tổng hợp kết quả thực nghiệm và đánh giá chất lượng

Để đưa ra cái nhìn toàn diện về chất lượng vận hành của hệ thống AiMed, nghiên cứu tiến hành tổng hợp các chỉ số thực nghiệm cốt lõi đo đạc được trên cấu hình tối ưu (Multi-Agent GraphRAG - B3) đối với bộ kiểm thử 100 tình huống chuẩn hóa. Các kết quả này được đối chiếu trực tiếp với các ngưỡng chấp nhận lâm sàng và trải nghiệm di động.

Bảng 5.8 dưới đây trình bày bảng tổng hợp kết quả thực nghiệm kèm theo khoảng tin cậy Wilson Score ở mức ý nghĩa 95% (CI95).

#### Bảng 5.8: Bảng tổng hợp các chỉ số thực nghiệm hệ thống AiMed

| Tiêu chí Đánh giá | Kết quả Đo đạc | Khoảng Tin cậy (CI 95%) | Ngưỡng Yêu cầu | Đánh giá Kết quả |
| :--- | :---: | :---: | :---: | :---: |
| **Độ chính xác Định tuyến (Routing)** | 97.78% (88/90) | [91.8%, 99.4%] | >= 95.00% | ✓ Đạt (Pass) |
| **Tỷ lệ Thu hồi An toàn (Safety Recall)** | 100.00% (10/10) | [69.2%, 100.0%]* | = 100.00% | ✓ Đạt (Pass) |
| **Độ chính xác Toàn diện (Overall)** | 98.00% (98/100) | [93.0%, 99.6%] | >= 95.00% | ✓ Đạt (Pass) |
| **Độ trễ phản hồi Phần vị p95** | 4932.3 ms | — | <= 5000.0 ms | ✓ Đạt (Cảnh báo trễ) |

*\* Ghi chú dưới bảng: Do cỡ mẫu kiểm thử đối với nhóm câu hỏi nguy hại (is_dangerous=true) nhỏ (n = 10 ca), khoảng tin cậy Wilson Score đạt được tương đối rộng. Đây là một hạn chế cần được thừa nhận trong quá trình diễn giải thống kê lâm sàng.*

---

#### Nhận xét tổng quát:
1.  **Chất lượng phân luồng:** Chỉ số định tuyến chuyên khoa đạt **97.78%** nằm ngoài ngưỡng yêu cầu tối thiểu (95.00%). Khoảng tin cậy dưới (91.8%) cho thấy sự ổn định của hệ thống đa tác tử LangGraph kết hợp định tuyến ngữ nghĩa ngay cả trong các tình huống hội thoại giao thoa phức tạp.
2.  **Độ an toàn lâm sàng:** Đạt tỷ lệ thu hồi an toàn tối đa **100.00%**, loại bỏ các rủi ro bỏ sót hành vi tự hại. Dù vậy, khoảng tin cậy dưới chỉ đạt 69.2% do giới hạn số lượng mẫu thử nghiệm, đòi hỏi việc tích lũy thêm các ca kiểm thử trong giai đoạn tiếp theo.
3.  **Trải nghiệm vận hành:** Độ trễ phân vị 95% đạt **4932.3 ms**, tuy nằm dưới giới hạn tối đa 5.0 giây (SLA tối thiểu) nhưng cần được tối ưu hóa bằng cách loại bỏ thời gian chờ timeout của API đám mây nhằm đạt mức lý tưởng dưới 3.0 giây.
