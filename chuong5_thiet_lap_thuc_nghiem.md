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

---

### 5.1.2. Bộ dữ liệu kiểm thử
Bộ dữ liệu kiểm thử được xây dựng chuẩn hóa mang tên `test_cases_v2.json`, chứa tổng cộng 100 tình huống hội thoại giả định mô phỏng ngôn ngữ tự nhiên thường gặp của bệnh nhân Việt Nam. Bộ dữ liệu được phát triển dựa trên việc dịch thuật, tinh chỉnh từ các kịch bản lâm sàng quốc tế và được tham chiếu chuyên môn y tế để đảm bảo tính thực tế.

Bộ dữ liệu được phân chia thành 7 phân tầng (categories) chuyên biệt nhằm thử nghiệm toàn diện các khía cạnh nghiệp vụ và tính an toàn của hệ thống, chi tiết phân bổ được tổng hợp trong Bảng 5.2.

#### Bảng 5.2: Phân bổ dữ liệu kiểm thử chuẩn hóa

| Phân tầng chuyên khoa | Số lượng ca | Mô tả mục tiêu kiểm thử |
| :--- | :---: | :--- |
| **Sàng lọc cấp cứu (Triage)** | 15 | Các tình huống triệu chứng nguy kịch (như nhồi máu cơ tim, đột quỵ, suy hô hấp cấp) yêu cầu phát hiện dấu hiệu cảnh báo đỏ (Red Flags) nhanh chóng. |
| **Hỗ trợ tâm lý (Therapy)** | 15 | Hội thoại mô phỏng các rối loạn tâm lý thường gặp (như lo âu xã hội, mất ngủ kéo dài, trầm cảm sau sinh) kiểm tra khả năng thấu cảm và phản hồi liệu pháp. |
| **Tra cứu dược học (Medication)** | 15 | Truy vấn thông tin liều dùng, tác dụng phụ, và đặc biệt là các tương tác thuốc phức tạp liên kết nhiều loại dược chất. |
| **Tìm kiếm bác sĩ (Doctor Referral)**| 15 | Tình huống yêu cầu kết nối phòng khám, đặt lịch hẹn bác sĩ chuyên khoa phù hợp với bệnh lý cụ thể. |
| **Kế hoạch chăm sóc (Care Plan)** | 15 | Yêu cầu thiết lập chế độ dinh dưỡng, thói quen sinh hoạt và luyện tập phục hồi sức khỏe. |
| **Trò chuyện thông thường (Default)** | 15 | Các câu hỏi chitchat, chào hỏi, hoặc truy vấn thông tin phi lâm sàng không liên quan trực tiếp đến sức khỏe. |
| **Tình huống nguy hại (Dangerous)** | 10 | Các trường hợp thể hiện ý định tự hại, tự tử, hoặc bạo lực hành vi, dùng để kiểm thử khả năng phản ứng và refusenik của hệ thống an toàn. |

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
