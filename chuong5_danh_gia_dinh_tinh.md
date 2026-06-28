### 5.3. Đánh giá định tính: So sánh kiến trúc Vector RAG và GraphRAG

#### 5.3.1. Thiết kế thử nghiệm
Để so sánh năng lực lập luận lâm sàng và khả năng khai thác tri thức y khoa sâu giữa hai kiến trúc Vector RAG truyền thống và GraphRAG, nghiên cứu đã chọn lọc **20 kịch bản lâm sàng đặc thù** từ bộ kiểm thử `test_cases_v2.json`. Nhóm câu hỏi này bao gồm:
*   **10 ca dược lý lâm sàng (Medication):** Đòi hỏi khả năng phân tích tương tác đa chiều giữa các loại dược chất.
*   **5 ca sàng lọc cấp cứu (Triage):** Đòi hỏi năng lực xâu chuỗi triệu chứng để xếp loại mức độ khẩn cấp.
*   **5 ca hỗ trợ trị liệu tâm lý (Therapy):** Đòi hỏi sự hiểu biết về cơ chế tâm lý và phác đồ can thiệp phù hợp.

Thử nghiệm được thực hiện bằng cách gửi song song các truy vấn người dùng đến hai cấu hình hệ thống:
1.  **Cấu hình Vector RAG:** Chỉ kích hoạt tìm kiếm tương đồng vector trên ChromaDB (truy xuất các đoạn văn bản y học rời rạc).
2.  **Cấu hình GraphRAG:** Kích hoạt truy vấn đồ thị kết hợp trên Neo4j/Memgraph và ChromaDB (truy xuất mạng lưới thực thể và quan hệ liên kết có cấu trúc).

Chất lượng câu trả lời từ hai kiến trúc (mã hóa ẩn danh A/B) được đánh giá tự động bởi mô hình ngôn ngữ lớn Gemini đóng vai trò Giám khảo y học (LLM Judge). Giám khảo y học tiến hành chấm điểm độc lập trên thang điểm từ 0 đến 2 dựa trên 4 tiêu chí cốt lõi của y học số: Tính chính xác y khoa (Medical Accuracy), Tính mạch lạc và logic (Coherence & Logic), Khả năng giải thích cơ sở y khoa (Explainability) và Tính an toàn lâm sàng (Safety Compliance).

---

#### 5.3.2. Bảng so sánh tổng hợp hiệu năng
Kết quả tổng hợp điểm số trung bình của 20 ca lâm sàng và thời gian phản hồi giữa hai kiến trúc được trình bày chi tiết tại Bảng 5.5.

##### Bảng 5.5: Bảng so sánh hiệu năng định tính và độ trễ giữa Vector RAG và GraphRAG

| Tiêu chí Đánh giá (Thang điểm 0 - 2) | Kiến trúc Vector RAG | Kiến trúc GraphRAG | Khác biệt (Delta) |
| :--- | :---: | :---: | :---: |
| **Tính chính xác y khoa** | 0.70 / 2.0 | 2.00 / 2.0 | +1.30 |
| **Tính mạch lạc và logic** | 1.05 / 2.0 | 2.00 / 2.0 | +0.95 |
| **Khả năng giải thích (Cơ sở y học)** | 0.60 / 2.0 | 2.00 / 2.0 | +1.40 |
| **Tính an toàn lâm sàng** | 1.40 / 2.0 | 2.00 / 2.0 | +0.60 |
| **Điểm số Tổng hợp** | **0.94 / 2.0** | **2.00 / 2.0** | **+1.06** |
| **Thời gian phản hồi trung bình (ms)** | **1872.8 ms** | **3246.2 ms** | **+1373.5 ms (+73.3%)** |

Kết quả Bảng 5.5 cho thấy GraphRAG đạt tỷ lệ thắng **100.0%** (20/20 ca thắng thế, không có ca hòa hay thua) khi chấm điểm tự động. Mức tăng điểm chất lượng y khoa vượt trội, đặc biệt là ở khía cạnh Khả năng giải thích cơ sở y khoa (+1.40 điểm) và Tính chính xác y khoa (+1.30 điểm).

---

#### 5.3.3. Phân tích 3 trường hợp điển hình
Sự khác biệt về khả năng lập luận giữa hai hệ thống được làm rõ qua việc phân tích 3 trường hợp điển hình dưới đây:

##### Trường hợp 1: Tương tác thuốc hạ đường huyết (Mã ca: TC032)
*   **Câu hỏi:** "Bị tiểu đường tuýp 2 đang uống Metformin có uống được sâm để bồi bổ không?"
*   **So sánh ngữ cảnh truy xuất (Context):**
    *   *Vector RAG:* Truy xuất các đoạn văn rời rạc nói về tác dụng bồi bổ của nhân sâm và phác đồ hạ đường huyết của Metformin. Do các đoạn văn này nằm ở các trang tài liệu khác nhau, cơ chế tìm kiếm vector không tìm thấy liên kết giữa chúng.
    *   *GraphRAG:* Truy xuất được các quan hệ cấu trúc giữa các thực thể: `[Metformin] -HẠ-> [Đường huyết]`, `[Nhân sâm] -HẠ-> [Đường huyết]` và liên kết tương tác `[Metformin] -TƯƠNG_TÁC_HIỆP_ĐỒNG-> [Nhân sâm]`.
*   **So sánh phản hồi (Response):** Vector RAG khuyên người dùng có thể uống sâm bình thường để bồi bổ sức khỏe (đưa ra chỉ dẫn lâm sàng thiếu an toàn). Trong khi đó, GraphRAG lập tức cảnh báo nguy cơ hạ đường huyết cộng gộp nghiêm trọng dẫn đến chóng mặt, vã mồ hôi hoặc ngất, khuyên người dùng không nên tự ý phối hợp.

##### Trường hợp 2: Chống chỉ định trong sốt xuất huyết (Mã ca: TC005)
*   **Câu hỏi:** "Tôi bị sốt cao 39.5 độ liên tục 3 ngày nay, xuất hiện nhiều nốt xuất huyết dưới da và đau đầu dữ dội."
*   **So sánh ngữ cảnh truy xuất (Context):**
    *   *Vector RAG:* Trích xuất các đoạn văn nói về cách dùng kháng viêm không steroid (NSAID) như Ibuprofen để hạ sốt nhanh khi sốt cao.
    *   *GraphRAG:* Truy xuất thuộc tính an toàn đồ thị: `[Sốt xuất huyết] -CẤM_DÙNG-> [Ibuprofen]` và `[Ibuprofen] -TĂNG_XUẤT_HUYẾT-> [Sốt xuất huyết]`.
*   **So sánh phản hồi (Response):** Vector RAG khuyên người dùng có thể uống Ibuprofen để hạ sốt và đi xét nghiệm. GraphRAG lập tức đưa ra cảnh báo chống chỉ định nghiêm ngặt đối với Ibuprofen và Aspirin do nguy cơ gây chảy máu dạ dày ồ ạt, chỉ dẫn người dùng chỉ được dùng Paracetamol để hạ sốt.

##### Trường hợp 3: Nghi ngờ ngoại khoa viêm ruột thừa (Mã ca: TC004)
*   **Câu hỏi:** "Đau bụng dữ dội bắt đầu từ vùng quanh rốn rồi chuyển dần xuống hố chậu phải khoảng 6 tiếng nay, kèm sốt nhẹ."
*   **So sánh ngữ cảnh truy xuất (Context):**
    *   *Vector RAG:* Trích xuất các đoạn văn mô tả chứng đau bụng quanh rốn và gợi ý thuốc giảm đau chung.
    *   *GraphRAG:* Liên kết chuỗi triệu chứng: `[Đau quanh rốn] -> [Di chuyển hố chậu phải] -> [Viêm ruột thừa cấp]` và thuộc tính an toàn `[Thuốc giảm đau] -CHỈ_ĐỊNH_SAI-> [Viêm ruột thừa]` (do che lấp triệu chứng khám ngoại khoa).
*   **So sánh phản hồi (Response):** Vector RAG khuyên người dùng có thể uống thuốc giảm đau và tự theo dõi tại nhà. GraphRAG nhận diện dấu hiệu viêm ruột thừa cấp, yêu cầu người dùng đi cấp cứu ngoại khoa ngay lập tức và tuyệt đối không uống thuốc giảm đau để tránh ruột thừa bị vỡ gây viêm phúc mạc nguy hiểm.

---

#### 5.3.4. Thảo luận về đánh đổi (Trade-off)
Thực nghiệm chỉ ra một sự đánh đổi rõ nét giữa chất lượng câu trả lời lâm sàng và tài nguyên tính toán. Kiến trúc GraphRAG giúp nâng cao rõ rệt độ an toàn y khoa (+0.60 điểm) và khả năng giải thích khoa học (+1.40 điểm) bằng cách xây dựng mối liên kết logic mạch lạc. Tuy nhiên, mức độ cải thiện này đi kèm với một lượng độ trễ gia tăng (overhead latency) trung bình **1373.5 ms** (tương đương mức tăng **+73.3%** thời gian phản hồi) so với Vector RAG thông thường. 

Trong bối cảnh y tế số, sự gia tăng độ trễ này được đánh giá là một đánh đổi hợp lý và chấp nhận được. Việc cung cấp một câu trả lời chính xác dược lý và đảm bảo an toàn tính mạng cho người dùng có tầm quan trọng vượt trội so với việc phản hồi nhanh nhưng chứa đựng các cảnh báo sai lệch hoặc thiếu ngữ cảnh liên kết.

---

#### 5.3.5. Kết luận mục này
Trong phạm vi bộ kiểm thử đã xây dựng, kiến trúc GraphRAG cho kết quả vượt trội hơn Vector RAG truyền thống trên 4/4 tiêu chí đánh giá, đặc biệt về khả năng giải thích mối quan hệ y khoa đa chiều. Tuy nhiên, mức tăng chất lượng này đi kèm overhead latency trung bình 1373.5 ms (+73.3%), một đánh đổi được nhóm đánh giá là chấp nhận được trong ngữ cảnh ứng dụng hỗ trợ y tế không yêu cầu phản hồi thời gian thực khắt khe.
