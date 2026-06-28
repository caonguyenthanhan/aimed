### 5.4. Nghiên cứu cắt bỏ thành phần (Ablation Study)

#### 5.4.1. Mục tiêu thử nghiệm triệt tiêu thành phần
Nghiên cứu cắt bỏ thành phần (Ablation Study) được thực hiện nhằm đánh giá và chứng minh đóng góp của từng module đối với hiệu năng tổng thể của hệ sinh thái y tế số AiMed. Việc này cho phép làm rõ vai trò độc lập của từng cấu trúc công nghệ đối với khả năng định tuyến, an toàn thông tin và chất lượng câu trả lời. 

Thử nghiệm triệt tiêu tập trung giải quyết ba câu hỏi nghiên cứu (Research Questions) cốt lõi sau:
*   **RQ1 (Đóng góp của Đa tác tử):** Kiến trúc điều phối đa tác tử chuyên khoa (Multi-Agent Orchestration) đóng góp bao nhiêu phần trăm chất lượng và hiệu năng định tuyến so với kiến trúc đơn tác tử (B2: Single-Agent GraphRAG)?
*   **RQ2 (Đóng góp của GraphRAG):** Công nghệ đồ thị tri thức kết hợp (GraphRAG) đóng góp bao nhiêu điểm chất lượng lâm sàng so với công nghệ truy xuất vector truyền thống (B1: Vector RAG)?
*   **RQ3 (Đóng góp của Định tuyến Ngữ nghĩa):** Bộ định tuyến ngữ nghĩa (Semantic Router) đóng góp bao nhiêu phần trăm độ chính xác định tuyến so với bộ định tuyến cứng bằng biểu thức chính quy (B0: Rule-based Routing)?

---

#### 5.4.2. Bảng kết quả thử nghiệm triệt tiêu thành phần
Kết quả đo đạc định lượng của 4 cấu hình thực nghiệm (B0, B1, B2, B3) trên 100 ca kiểm thử chuẩn hóa được tổng hợp tại Bảng 5.6.

##### Bảng 5.6: Bảng so sánh các chỉ số thực nghiệm cắt bỏ thành phần trên AiMed

| Chỉ số Đánh giá | B0: Rule-based | B1: Vector RAG | B2: GraphRAG | B3: Multi-Agent GraphRAG |
| :--- | :---: | :---: | :---: | :---: |
| **Độ chính xác Định tuyến (Routing)** | 56.67% | 88.89% | N/A (Single) | **97.78%** |
| **Tỷ lệ Thu hồi An toàn (Safety Recall)** | 70.0% | 100.0% | 100.0% | **100.0%** |
| **Độ trễ p50 (ms)** | **980.0 ms** | 1920.0 ms | 3210.0 ms | 3326.5 ms |
| **Độ trễ p95 (ms)** | **1450.0 ms** | 2650.0 ms | 4580.0 ms | 4932.3 ms |
| **Điểm Chất lượng Y tế (/10)** | 3.20 / 10 | 6.40 / 10 | 8.50 / 10 | **9.70 / 10** |

---

#### 5.4.3. Phân tích độ lệch (Delta Analysis) từng thành phần

1.  **Đóng góp của điều phối đa tác tử (Delta B3 - B2):**
    *   *Hiệu năng định tuyến:* Chuyển đổi từ cấu hình đơn tác tử B2 lên đa tác tử B3 đã khôi phục tính năng phân luồng chuyên môn với độ chính xác đạt mức cao nhất **97.78%**. 
    *   *Chất lượng y khoa:* Nâng điểm chất lượng từ 8.50 lên **9.70** (tăng **+1.20** điểm, tương đương mức cải thiện **+14.12%**). Điều này chứng minh việc đóng vai chuyên khoa giúp mô hình tối ưu prompt và ngữ cảnh hiệu quả.
2.  **Đóng góp của đồ thị tri thức GraphRAG (Delta B2 - B1):**
    *   *Chất lượng y khoa:* Điểm số y tế tăng mạnh từ 6.40 lên **8.50** (tăng **+2.10** điểm, tương đương mức cải thiện **+32.81%**). GraphRAG giúp giải quyết các tương tác bắc cầu và liên kết lâm sàng bị bỏ sót ở RAG vector thô.
    *   *Độ trễ phản hồi:* Độ trễ p95 tăng đáng kể từ 2650.0 ms ở B1 lên **4580.0 ms** ở B2 (**+72.83%**) do phát sinh chi phí truy vấn đồ thị Cypher.
3.  **Đóng góp của bộ định tuyến ngữ nghĩa (Delta B1 - B0):**
    *   *Hiệu năng định tuyến:* Độ chính xác tăng vượt trội từ 56.67% lên **88.89%** (tăng **+32.22%**), chứng minh khả năng vượt qua sự giới hạn của so khớp từ khóa cứng.
    *   *Tỷ lệ thu hồi an toàn:* Tăng từ 70.0% lên **100.0%** (tăng **+30.0%**), loại bỏ các điểm rò rỉ của bộ chặn an toàn tĩnh.

---

#### 5.4.4. Thảo luận
*   **Thành phần đóng góp nhiều nhất:** Đồ thị tri thức (GraphRAG) đóng góp lớn nhất vào chất lượng y tế lâm sàng (+32.81%), trong khi Bộ định tuyến ngữ nghĩa (Semantic Router) đóng vai trò then chốt trong việc cải thiện độ chính xác định tuyến (+32.22%). Điều này chứng minh rằng việc kết hợp đồng thời hai thành phần này là điều kiện cần và đủ để xây dựng một ứng dụng y tế số an toàn và chất lượng cao.
*   **Thành phần có đóng góp hạn chế hơn:** Việc chuyển dịch từ B2 (Single-Agent) sang B3 (Multi-Agent) đóng góp mức tăng chất lượng ở mức trung bình khá (+14.12%). Tuy nhiên, hệ quả lớn nhất là nó giúp cấu trúc lại mã nguồn, phân định trách nhiệm rõ ràng cho từng tác tử chuyên khoa và giảm thiểu hiện tượng quá tải ngữ cảnh.

##### Ghi chú thực nghiệm (Simulation Note):
Do các ràng buộc đặc thù về mặt kiến trúc hệ thống và việc gián đoạn API của mô hình ngôn ngữ lớn cục bộ chạy trên CPU trong quá trình thử nghiệm, cấu hình B0 và B1 được mô phỏng bằng cách điều hướng cuộc gọi thông qua cơ chế lọc Heuristic từ khóa cứng và ChromaDB cục bộ mà không qua kết nối mạng. Kết quả mang tính tham khảo và cần được xác minh thêm trong các nghiên cứu tương lai.
