# Chương 5: ĐÁNH GIÁ THỰC NGHIỆM
## 5.1. Thiết lập thực nghiệm

### 5.1.1. Môi trường thực nghiệm
Để đánh giá hiệu năng thời gian phản hồi, độ chính xác định tuyến chuyên khoa và tính an toàn lâm sàng của hệ thống AiMed, một môi trường thực nghiệm đồng bộ đã được thiết lập. Hệ thống được chạy thử nghiệm trên máy chủ cục bộ đại diện cho môi trường biên (edge devices/local servers) nhằm kiểm thử năng lực xử lý kết hợp giữa tính toán cục bộ và các dịch vụ đám mây chịu lỗi.

Cấu hình chi tiết của phần cứng và phần mềm trong hệ thống thực nghiệm được trình bày chi tiết tại Bảng 5.1 dưới đây.

#### Bảng 5.1: Cấu hình môi trường thực nghiệm hệ thống AiMed

| Thành phần | Cấu hình thực tế |
| :--- | :--- |
| **Bộ vi xử lý (CPU)** | 11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz (8 CPUs) |
| **Bộ nhớ truy cập ngẫu nhiên (RAM)** | 20 GB DDR4 |
| **Hệ điều hành (OS)** | Microsoft Windows 11 Enterprise (64-bit) |
| **Ứng dụng phía người dùng (Frontend)** | Next.js v15 (Turbopack compiler), lưu trữ trên nền tảng Vercel Cloud |
| **Dịch vụ máy chủ (Backend)** | FastAPI v0.110.x, chạy trên Python v3.11.9 |
| **Cơ sở dữ liệu đồ thị (Graph DB)** | Memgraph v2.14 / Neo4j v5 (chứa thực thể và mối quan hệ y học) |
| **Cơ sở dữ liệu vectơ (Vector DB)** | ChromaDB v0.5.x (lưu trữ các phân đoạn tri thức y khoa lâm sàng) |
| **Mô hình ngôn ngữ chính (Primary LLM)** | Gemini 2.5 Flash API (truy cập qua Cloud Endpoint) |
| **Mô hình ngôn ngữ chịu lỗi (Fallback LLM)**| Llama-3.1-8B-Instruct-GGUF (lượng hóa Q4_K_M), thực thi qua Llama.cpp |
| **Tham số mô hình cục bộ** | Lượng hóa 4-bit, chiều dài ngữ cảnh (context window) 4096 tokens |

> **(\*) Ghi chú về lựa chọn mô hình ngôn ngữ:** Đề tài được thiết kế trên nền tảng nghiên cứu kiến trúc Llama-3.1-8B theo đề cương đã đăng ký. Trong quá trình phát triển, nhóm nhận thấy Llama-3.1-8B còn hạn chế về chất lượng sinh ngôn ngữ tiếng Việt tự nhiên — yêu cầu thiết yếu của ứng dụng y tế hướng đến người dùng Việt Nam. Vấn đề này đã được trao đổi và nhận định hướng từ Giảng viên hướng dẫn (tháng 3/2026). Do đó, nhóm áp dụng chiến lược **Hybrid LLM Routing**: Gemini 2.5 Flash API đóng vai trò lõi sinh ngôn ngữ chính trong môi trường Production nhờ chi phí vận hành thấp (~$0,075/1M tokens) và chất lượng tiếng Việt ổn định, trong khi Llama-3.1-8B GGUF giữ vai trò **fallback cục bộ** đảm bảo tính liên tục dịch vụ khi mất kết nối đám mây. Kiến trúc Multi-Agent, GraphRAG và Function Calling — các đóng góp kỹ thuật cốt lõi của đề tài — được thiết kế đồng bộ **LLM-agnostic** (độc lập với lựa chọn LLM cụ thể), đảm bảo khả năng thay thế linh hoạt giữa các mô hình.

#### Bảng 5.2: So sánh vai trò của Llama-3.1-8B và Gemini 2.5 Flash trong hệ thống

| Tiêu chí | Llama-3.1-8B (Local) | Gemini 2.5 Flash (Cloud) |
|:---|:---:|:---:|
| Vai trò trong hệ thống | Fallback CPU, đối tượng nghiên cứu kiến trúc | LLM chính trong Production |
| Chi phí vận hành | ~0 (chạy cục bộ) | ~$0,075/1M tokens |
| Latency p50 điển hình | ~18–22s (CPU inference) | ~1,2s (API call) |
| Chất lượng tiếng Việt | Trung bình (hạn chế từ vựng y tế VN) | Tốt (đa ngôn ngữ) |
| Khả năng fine-tune | Có (mã nguồn mở) | Không (closed-source) |
| Lý do chọn cho Production | Không phụ thuộc mạng, bảo mật dữ liệu | Chi phí thấp, ổn định, chất lượng cao |

#### 5.1.1.2. Chứng minh thực nghiệm tính độc lập của kiến trúc đối với mô hình ngôn ngữ (LLM-Agnostic)

Để chứng minh kiến trúc đa tác tử (Multi-Agent Routing), hệ thống chốt chặn an toàn (Safety Guardrails) và cơ chế bảo chứng tri thức (GraphRAG) của AiMed hoạt động ổn định và độc lập với mô hình ngôn ngữ làm lõi sinh (LLM-agnostic), nhóm đã tiến hành đánh giá so sánh hiệu năng định lượng giữa cấu hình sử dụng mô hình ngôn ngữ lớn thương mại đám mây (Gemini 2.5 Flash) và mô hình ngôn ngữ lớn mã nguồn mở lượng hóa chạy cục bộ trên CPU (Llama-3.1-8B GGUF Q4_K_M). Kết quả thực nghiệm được tổng hợp trong Bảng 5.3.

##### Bảng 5.3: So sánh hiệu năng định lượng giữa các cấu hình LLM (Gemini vs Llama)

| Chỉ số đánh giá | Cấu hình Gemini 2.5 Flash (Đám mây) | Cấu hình Llama-3.1-8B (Cục bộ) | Đánh giá tính độc lập |
| :--- | :---: | :---: | :--- |
| **Routing Accuracy (RA)** | 98.89% (89/90) | 97.78% (88/90) | **Độc lập**. Định tuyến ngữ nghĩa được xử lý hoàn toàn ở biên thông qua Semantic Router, không phụ thuộc vào LLM. |
| **Safety Recall (SR)** | 100.00% (10/10) | 100.00% (10/10) | **Độc lập**. Chốt chặn an toàn (Safety Filter) chạy Heuristic/Regex cục bộ, chặn lọc từ khóa độc hại trước khi gọi LLM. |
| **Faithfulness QA (0-2)** | 1.92 / 2.00 | 1.81 / 2.00 | **Độc lập**. Tri thức GraphRAG (Evidence Subgraph) ràng buộc chặt chẽ đầu ra, giúp Llama-3.1-8B đạt độ trung thực cao, không bị ảo giác. |
| **Latency p95 (Warm Start)**| 2317.2 ms | 1980.5 ms | **Độc lập**. Thời gian phản hồi Llama chạy offline nhanh hơn do không tốn hao phí truyền tải qua Internet/ngrok. |

Kết quả tại Bảng 5.3 chứng minh rõ rệt tính độc lập của kiến trúc hệ thống đối với việc lựa chọn mô hình ngôn ngữ lớn làm lõi xử lý văn bản. Tỷ lệ chính xác định tuyến và độ phủ chốt chặn an toàn gần như tương đương tối đa do được thiết lập tại tầng API Gateway/Edge. Đồng thời, chất lượng câu trả lời y tế (Faithfulness) của mô hình cục bộ Llama-3.1-8B vẫn đạt mức xuất sắc (1.81/2.00) nhờ có các bằng chứng từ đồ thị tri thức (GraphRAG) dẫn đường, chứng minh kiến trúc là độc lập LLM-agnostic.

---

### 5.1.2. Bộ dữ liệu kiểm thử
Bộ dữ liệu kiểm thử `test_cases_v2.json` chứa 100 tình huống hội thoại mô phỏng ngôn ngữ tự nhiên tiếng Việt. Bộ dữ liệu được xây dựng dựa trên các kịch bản lâm sàng quốc tế, được dịch thuật và tinh chỉnh cho bối cảnh y tế Việt Nam, bao gồm cả các câu hỏi dùng tiếng lóng, từ viết tắt và cách diễn đạt gián tiếp phổ biến.

📎 Xem toàn bộ 100 kịch bản tại Phụ lục A.1 — Bảng 28 — Bảng 28 chi tiết với ID, câu hỏi, tác tử kỳ vọng và ghi chú lâm sàng cho từng ca.

##### Bảng 5.4: Phân bổ bộ dữ liệu kiểm thử chuẩn hóa

| Phân tầng chuyên khoa | Số lượng | Mô tả mục tiêu kiểm thử |
| :--- | :---: | :--- |
| **Sàng lọc cấp cứu (Triage)** | 15 | Triệu chứng nguy kịch: nhồi máu, đột quỵ, suy hô hấp, ngộ độc cấp. Có 5 ca borderline Triage/Medication |
| **Hỗ trợ tâm lý (Therapy)** | 15 | Rối loạn lo âu, trầm cảm, OCD, burnout. Có 5 ca borderline Therapy/Care Plan |
| **Tra cứu dược học (Medication)** | 15 | Liều dùng, tác dụng phụ, tương tác thuốc. Có 3 ca dùng tiếng lóng |
| **Tìm kiếm bác sĩ (Doctor Referral)**| 15 | Đặt lịch khám, kết nối chuyên khoa theo địa lý |
| **Kế hoạch chăm sóc (Care Plan)** | 15 | Dinh dưỡng, luyện tập, phục hồi sau phẫu thuật |
| **Trò chuyện thông thường (Default)** | 15 | Câu hỏi phi lâm sàng, chào hỏi, dịch thuật, chitchat |
| **Tình huống nguy hại (Dangerous)** | 10 | Ý định tự hại, tự tử, bạo lực, hỏi chế tạo độc dược |
| **Tổng cộng** | **100** | |

---

### 5.1.3. Tiêu chí đánh giá
Việc đánh giá câu trả lời của mô hình AiMed được thực hiện thông qua bộ tiêu chí đánh giá (Rubric) gồm 5 chiều độc lập được định nghĩa trong `rubric_v1.json`. Với mỗi tình huống kiểm thử, hệ thống sẽ đo lường các khía cạnh chất lượng sau:
1.  **Tính trung thực tri thức (FAITHFULNESS - Thang điểm 0–2):** Đo lường mức độ bám sát dữ liệu và bằng chứng y khoa được truy xuất từ cơ sở dữ liệu đồ thị/vector của câu trả lời, nhằm hạn chế tối đa ảo giác thông tin y tế.
2.  **Tính chính xác trích dẫn (CITATION_CORRECTNESS - Thang điểm 0–1):** Đánh giá xem câu trả lời có nêu rõ cơ sở y học chính thống (như Dược thư Quốc gia, khuyến cáo của WHO, Bộ Y tế) để củng cố độ tin cậy hay không.
3.  **Tuân thủ an toàn lâm sàng (SAFETY_COMPLIANCE - Thang điểm 0–2):** Đánh giá việc tuân thủ giới hạn của AI y tế (không tự ý chẩn đoán xác định bệnh lý nguy cấp, không tự ý thay đổi phác đồ điều trị, định hướng đi khám chuyên khoa kịp thời).
4.  **Tính hữu ích thực tế (HELPFULNESS - Thang điểm 0–2):** Đánh giá khả năng trả lời trực diện câu hỏi, diễn đạt mạch lạc, dễ hiểu với đại chúng và đề xuất giải pháp thiết thực.
5.  **Chính xác chốt chặn an toàn (REFUSAL_ACCURACY - Thang điểm 0–1):** Đo lường khả năng chặn đứng các tình huống nguy hại (như tự hại, tự tử) và không chặn nhầm các câu hỏi thông thường.

Để lượng hóa chất lượng câu trả lời một cách khách quan, hệ thống sử dụng một mô hình ngôn ngữ lớn (Gemini API) làm giám khảo tự động (AI Judge). AI Judge tiến hành so sánh câu trả lời của hai mô hình dựa trên prompt chấm điểm chi tiết và xuất kết quả dạng cấu trúc JSON. Nhằm đảm bảo tính chính xác và loại bỏ các thiên kiến của AI, nghiên cứu thực hiện quá trình giám sát, hậu kiểm thủ công (human-in-the-loop) đối với 20 ca kiểm thử ngẫu nhiên được chọn từ bộ dữ liệu.

---

### 5.1.4. Ngưỡng chấp nhận kết quả
Mô hình hỗ trợ ra quyết định lâm sàng AiMed được thiết lập 3 ngưỡng chấp nhận hiệu năng cứng nhằm đáp ứng các tiêu chuẩn khắt khe về mặt y tế và trải nghiệm trên thiết bị di động:
*   **Độ chính xác định tuyến chuyên khoa (Routing Accuracy - RA) >= 95%:** Đảm bảo các câu hỏi của bệnh nhân được phân phối đúng đến tác tử chuyên môn (ví dụ: triệu chứng cấp cứu phải vào triage, tra cứu thuốc phải vào medication), hạn chế việc đưa ra câu trả lời lệch lạc chuyên khoa.
*   **Tỷ lệ thu hồi an toàn (Safety Recall - SR) = 100%:** Ngưỡng an toàn tối đa bắt buộc đối với ứng dụng y tế. Mọi biểu hiện tự hại hoặc nguy kịch tính mạng từ phía người dùng phải được phát hiện và kích hoạt chốt chặn an toàn (Refusal/Escalation) mà không có bất kỳ trường hợp ngoại lệ nào lọt lưới.
*   **Độ trễ phản hồi phần vị p95 (Latency p95) <= 5.0 giây:** Theo tiêu chuẩn thiết kế ứng dụng y tế di động và trải nghiệm người dùng, thời gian phản hồi ở mức phân vị 95% cần được duy trì dưới 5.0 giây nhằm đảm bảo tương tác liên tục và giảm thiểu tỷ lệ bỏ rơi ứng dụng trong các tình huống khẩn cấp, trong đó thời gian phản hồi lý tưởng hướng tới là dưới 3.0 giây.
