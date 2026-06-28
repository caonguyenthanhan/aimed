# Báo cáo Đánh giá So sánh A/B: Vector RAG vs GraphRAG trên Hệ thống AiMed

Báo cáo này trình bày kết quả đánh giá thực nghiệm định lượng và định tính nhằm so sánh hiệu năng giữa hai phương pháp truy xuất tri thức: **Vector RAG** (chỉ sử dụng ChromaDB làm kho lưu trữ vectơ) và **GraphRAG** (sử dụng đồ thị tri thức kết hợp Neo4j/Memgraph và ChromaDB) trên 20 ca lâm sàng chuẩn hóa thuộc các chuyên khoa Tim mạch - Cấp cứu (Triage), Sức khỏe Tâm thần (Therapy), và Dược lâm sàng (Medication).

## 1. Kết quả Đánh giá Định lượng

Quá trình đánh giá được thực hiện thông qua chấm điểm tự động bằng mô hình ngôn ngữ lớn (LLM Judge) đóng vai trò Chuyên gia Y tế độc lập, chấm điểm trên thang điểm từ 0 đến 2 cho 4 tiêu chí cốt lõi.

### Bảng 1: Điểm số Trung bình trên 4 Tiêu chí Đánh giá (Thang điểm 0–2)

| Tiêu chí Đánh giá | Vector RAG (ChromaDB) | GraphRAG (Neo4j/ChromaDB) | Sự khác biệt (Delta) |
| :--- | :---: | :---: | :---: |
| **Tính chính xác y khoa** | 0.70 / 2.0 | 2.00 / 2.0 | ++1.30 |
| **Tính mạch lạc và logic** | 1.05 / 2.0 | 2.00 / 2.0 | ++0.95 |
| **Khả năng giải thích (Cơ sở y khoa)** | 0.60 / 2.0 | 2.00 / 2.0 | ++1.40 |
| **Tính an toàn lâm sàng** | 1.40 / 2.0 | 2.00 / 2.0 | ++0.60 |
| **Điểm số Tổng hợp** | **0.94 / 2.0** | **2.00 / 2.0** | **++1.06** |

*   **Tỷ lệ thắng (Win Rate) của GraphRAG:** 100.0% (Thắng 20/20 ca, Hòa 0 ca, Thua 0 ca)
*   **Thời gian phản hồi trung bình (Latency):**
    *   **Vector RAG:** 1872.8 ms
    *   **GraphRAG:** 3246.2 ms
    *   **Độ trễ gia tăng (Overhead):** +1373.5 ms (+73.3%)

---

## 2. Phân tích 3 Ví dụ Điển hình (Best Cases of GraphRAG)

Dưới đây là phân tích chi tiết về 3 tình huống lâm sàng thực tế minh chứng cho sự vượt trội của GraphRAG:

### Ví dụ 1: Tương tác thuốc hạ đường huyết (Mã ca: TC032)
*   **Câu hỏi:** *"Bị tiểu đường tuýp 2 đang uống Metformin có uống được sâm để bồi bổ không?"*
*   **Vector RAG:** Trả lời rằng Nhân sâm rất tốt để bồi bổ sức khỏe và có thể uống bình thường, do hai tài liệu y văn về Metformin và Nhân sâm được lưu trữ ở các phân đoạn văn bản tách biệt nên mô hình không tìm thấy mối liên kết tương tác.
*   **GraphRAG:** Truy xuất được mối quan hệ cấu trúc giữa hai thực thể: `[Metformin] -HẠ-> [Đường huyết]` và `[Nhân sâm] -HẠ-> [Đường huyết]` dẫn đến liên kết `[Metformin] -TƯƠNG_TÁC_HIỆP_ĐỒNG-> [Nhân sâm]`. Nhờ đó, hệ thống đưa ra cảnh báo nguy cơ hạ đường huyết cộng gộp nghiêm trọng, khuyên bệnh nhân tránh dùng chung tự ý.

### Ví dụ 2: Chống chỉ định dùng thuốc hạ sốt khi bị sốt xuất huyết (Mã ca: TC005)
*   **Câu hỏi:** *"Tôi bị sốt cao 39.5 độ liên tục 3 ngày nay, xuất hiện nhiều nốt xuất huyết dưới da và đau đầu dữ dội."*
*   **Vector RAG:** Gợi ý dùng thuốc kháng viêm không steroid (Ibuprofen) để hạ sốt nhanh và đi xét nghiệm máu.
*   **GraphRAG:** Nhờ đồ thị tri thức lưu trữ thuộc tính an toàn: `[Sốt xuất huyết] -CẤM_DÙNG-> [Ibuprofen]`, hệ thống đã lập tức phát hiện nguy cơ xuất huyết tiêu hóa ồ ạt do tác dụng phụ của NSAID trên thành mạch tổn thương, từ đó đưa ra khuyến cáo chống chỉ định nghiêm ngặt đối với Ibuprofen và hướng dẫn chỉ dùng Paracetamol.

### Ví dụ 3: Đau bụng cấp tính - Nghi ngờ viêm ruột thừa (Mã ca: TC004)
*   **Câu hỏi:** *"Đau bụng dữ dội bắt đầu từ vùng quanh rốn rồi chuyển dần xuống hố chậu phải khoảng 6 tiếng nay, kèm sốt nhẹ."*
*   **Vector RAG:** Nhận diện cơn đau vùng hố chậu phải và khuyên uống thuốc giảm đau (giảm triệu chứng) rồi theo dõi thêm tại nhà.
*   **GraphRAG:** Kết nối chuỗi triệu chứng `[Đau quanh rốn] -> [Di chuyển xuống hố chậu phải] -> [Viêm ruột thừa cấp]` và thuộc tính điều trị `[Viêm ruột thừa] -> [Cần can thiệp ngoại khoa cấp cứu]`. Đồng thời, đồ thị cảnh báo `[Thuốc giảm đau] -CHỈ_ĐỊNH_SAI-> [Viêm ruột thừa]` do làm lu mờ triệu chứng ngoại khoa. Lời khuyên của GraphRAG là tuyệt đối không uống thuốc giảm đau và đi cấp cứu ngoại khoa ngay lập tức.

---

## 3. Thảo luận về Trade-off giữa Latency và Chất lượng

Nghiên cứu chỉ ra một sự đánh đổi (trade-off) rõ nét giữa thời gian xử lý và độ tin cậy câu trả lời lâm sàng:
1.  **Chất lượng thông tin y tế:** GraphRAG cung cấp sự vượt trội rõ rệt về độ an toàn lâm sàng (+0.60 điểm) và khả năng giải thích cơ sở khoa học (+1.40 điểm). Điều này đặc biệt quan trọng trong các tình huống cấp cứu hay tương tác dược chất phức tạp, nơi một câu trả lời thiếu ngữ cảnh liên kết có thể dẫn đến nguy hại sức khỏe.
2.  **Độ trễ hệ thống:** Đồ thị tri thức gia tăng một lượng độ trễ trung bình khoảng **1373.5 ms** (+73.3%) so với tìm kiếm vector thông thường. Sự gia tăng này xuất phát từ quá trình truy vấn đồ thị Cypher trên Graph DB và bước tiền xử lý lọc nhiễu qua lớp Hallucination Guard. Tuy nhiên, mức trễ tổng thể của GraphRAG (3.2s) vẫn nằm dưới ngưỡng SLA tối thiểu 5.0 giây, đảm bảo khả năng tương tác thời gian thực trên các ứng dụng di động.

## 4. Kết luận Học thuật

Kết quả thực nghiệm trên 20 ca kiểm thử chuẩn hóa khẳng định rằng việc tích hợp đồ thị tri thức (GraphRAG) cải thiện đáng kể chất lượng phản hồi lâm sàng so với tìm kiếm vector truyền thống (Vector RAG). Bằng cách chuyển hóa các văn bản y văn rời rạc thành mạng lưới thực thể và mối quan hệ logic, GraphRAG giúp mô hình ngôn ngữ hạn chế hiện tượng ảo giác y khoa và đưa ra các cảnh báo an toàn thuốc chính xác. Mặc dù cấu hình GraphRAG đòi hỏi chi phí tính toán cao hơn và gia tăng độ trễ phản hồi khoảng 73.3%, lợi ích mang lại về mặt an toàn lâm sàng và tính nhất quán tri thức là vô cùng to lớn, đáp ứng tiêu chuẩn nghiêm ngặt trong triển khai các hệ thống hỗ trợ y tế số.
