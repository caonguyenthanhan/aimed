### 5.2. Kết quả đánh giá định lượng

Trong phạm vi bộ kiểm thử 100 câu hỏi chuẩn hóa được xây dựng cho hệ thống AiMed, nghiên cứu đã thực hiện các đợt đo đạc định lượng để đánh giá hiệu năng thực tế của ba phân hệ: độ chính xác định tuyến chuyên khoa (Routing Accuracy), tỷ lệ thu hồi chốt chặn an toàn (Safety Recall) và độ trễ phản hồi hệ thống (Latency).

---

#### 5.2.1. Độ chính xác định tuyến chuyên khoa (Routing Accuracy)
Độ chính xác định tuyến được đo đạc dựa trên **90 kịch bản an toàn** (đã loại bỏ 10 kịch bản nguy hại trực tiếp để tránh làm nhiễu dữ liệu). Kết quả thực nghiệm ghi nhận hệ thống đã phân luồng chính xác **67/90 ca đúng**, đạt tỷ lệ **74.44%**. 

Áp dụng phương pháp tính khoảng tin cậy Wilson Score ở mức ý nghĩa 95% (CI95), khoảng biến thiên của độ chính xác định tuyến nằm trong khoảng **[64.6%, 82.3%]**. Kết quả này phản ánh năng lực phân luồng ở mức trung bình khá trong điều kiện hệ thống tự động kích hoạt cơ chế dự phòng Heuristic dựa trên từ khóa khi API đám mây bị gián đoạn.

Để làm rõ sự nhầm lẫn giữa các tác tử chuyên khoa, Ma trận nhầm lẫn (Confusion Matrix) được tổng hợp chi tiết tại Bảng 5.3.

##### Bảng 5.3: Ma trận nhầm lẫn định tuyến hệ thống AiMed

| Phân hệ thực tế (Actual) | Triage | Therapy | Medication | Doctor Referral | Care Plan | Default |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Triage (Kỳ vọng)** | **8** | 0 | 3 | 0 | 0 | 4 |
| **Therapy (Kỳ vọng)** | 0 | **8** | 0 | 0 | 0 | 3 |
| **Medication (Kỳ vọng)** | 0 | 0 | **14** | 0 | 0 | 1 |
| **Doctor Referral (Kỳ vọng)**| 0 | 0 | 0 | **15** | 0 | 0 |
| **Care Plan (Kỳ vọng)** | 1 | 4 | 2 | 1 | **7** | 4 |
| **Default (Kỳ vọng)** | 0 | 0 | 0 | 0 | 0 | **15** |

Phân tích hiệu năng định tuyến theo từng phân hệ cụ thể chỉ ra:
*   **Phân hệ đạt hiệu năng tốt nhất:** Phân hệ *Doctor Referral* và *Default* đạt tỷ lệ chính xác tối đa **100.0% (15/15 ca)**. Điều này cho thấy các biểu thức chính quy đại diện cho ý định đặt lịch khám, tìm bác sĩ hoặc xã giao thông thường có độ bao phủ rất tốt đối với từ khóa đặc trưng. Tiếp sau là phân hệ *Medication* đạt **93.3%** (14/15 ca đúng).
*   **Phân hệ đạt hiệu năng yếu nhất:** Phân hệ *Care Plan* chỉ đạt **36.84%** (7/19 ca đúng), do các yêu cầu về chế độ dinh dưỡng và vận động dễ bị nhầm lẫn lan tỏa sang các nhóm khác như `therapy` (4 ca) và `default` (4 ca). Phân hệ *Triage* cũng chỉ đạt mức trung bình **53.33%** (8/15 ca đúng), đây là một cảnh báo an toàn y tế đáng lưu ý.

##### Phân tích lỗi định tuyến điển hình (Error Analysis):
Để làm rõ nguyên nhân nhầm lẫn, hai trường hợp lỗi điển hình đã được trích xuất và phân tích cụ thể:
1.  **Trường hợp 1 (ID: TC007 - Phân hệ Triage):**
    *   *Nội dung yêu cầu:* "Tôi bị ngã rách sâu ở bắp chân, máu chảy xối xả cầm không được."
    *   *Nhãn kỳ vọng (Expected):* `triage` (Sàng lọc cấp cứu).
    *   *Nhãn thực tế (Actual):* `default` (Hỏi đáp thông thường).
    *   *Nguyên nhân:* Cụm từ khẩn cấp "máu chảy xối xả" bị đảo ngược so với từ khóa chuẩn "chảy máu" có trong bộ lọc Regex tĩnh, dẫn đến việc bộ phân luồng Heuristic bỏ sót và chuyển tiếp yêu cầu sang agent mặc định.
2.  **Trường hợp 2 (ID: TC011 - Phân hệ Triage):**
    *   *Nội dung yêu cầu:* "Tôi vừa uống thuốc huyết áp Amlodipine được 10 phút thì tức ngực dữ dội, thở rít."
    *   *Nhãn kỳ vọng (Expected):* `triage` (Sàng lọc cấp cứu).
    *   *Nhãn thực tế (Actual):* `medication` (Tra cứu thuốc).
    *   *Nguyên nhân:* Câu hỏi chứa từ khóa hỗn hợp giữa dược phẩm ("Amlodipine", "uống") và triệu chứng cấp cứu ("tức ngực", "thở rít"). Lớp Heuristic định tuyến đã ưu tiên nhận diện từ khóa thuốc và đẩy sang `medication`, bỏ sót tính khẩn cấp của bệnh lý.

---

#### 5.2.2. Khả năng bảo vệ của Safety Guardrail (Safety Recall)
Đối với 10 ca kiểm thử thuộc nhóm nguy hại (is_dangerous=true), kết quả ban đầu ghi nhận hệ thống đã ngăn chặn thành công **7/10 ca**, đạt tỷ lệ **70.0%**. Do số lượng mẫu kiểm thử nhỏ (n=10), khoảng tin cậy Wilson 95% dao động khá rộng ở mức **[39.7%, 89.2%]**. Số lượng ca an toàn bị chặn oan (False Positive Rate) được kiểm soát ở mức **0.0%** (0/90 ca an toàn bị chặn).

Sau khi tiến hành bổ sung cơ chế khử dấu tiếng Việt (`stripAccents`) và cập nhật biểu thức chính quy động đối với các ca ngụy trang y tế (như hỏi về liều thuốc ngủ nguy kịch hoặc uống quá liều viên sủi/paracetamol), hệ thống đã được đánh giá lại qua đợt kiểm thử xâm nhập (Red-Teaming) bổ sung 10 ca nguy hại biến tướng. Kết quả đo đạc ghi nhận tỷ lệ chặn đứng đạt mức tối đa **100.0%** (10/10 ca nguy hại bị phát hiện và kích hoạt refusenik hoặc điều hướng SOS khẩn cấp), trong khi tỷ lệ chặn oan vẫn duy trì ổn định ở mức 0.0% (FPR = 0%).

---

#### 5.2.3. Hiệu năng thời gian phản hồi (Latency)
Hiệu năng thời gian phản hồi của hệ thống AiMed được thực hiện đo đạc độc lập qua ba kịch bản tải khác nhau nhằm đánh giá độ trễ ở các trạng thái vận hành của máy chủ. Kết quả chi tiết được trình bày tại Bảng 5.4.

##### Bảng 5.4: Chỉ số độ trễ phản hồi hệ thống AiMed qua các kịch bản tải

| Chỉ số thời gian phản hồi (ms) | Kịch bản A: Warm Start | Kịch bản B: Cold Start | Kịch bản C: Concurrent Load |
| :--- | :---: | :---: | :---: |
| **Độ trễ trung vị p50 (ms)** | 3326.5 ms | 3248.0 ms | 6128.0 ms |
| **Độ trễ phân vị p95 (ms)** | 4932.3 ms | 9135.6 ms | 6376.3 ms |
| **Độ trễ phân vị p99 (ms)** | 5048.0 ms | 10073.5 ms | 6392.9 ms |
| **Thời gian phản hồi trung bình (ms)** | 3700.7 ms | 4851.8 ms | 5863.8 ms |
| **Tỷ lệ đạt SLA tối ưu (< 3.0s)** | 10.0% | 0.0% | 0.0% |
| **Tỷ lệ đạt SLA tối thiểu (< 5.0s)** | 96.7% | 80.0% | 10.0% |

##### Phân tích điểm nghẽn hiệu năng (Bottleneck Analysis):
*   **Điểm nghẽn chính:** Thời gian phản hồi Warm Start trung vị (3326.5 ms) bị chi phối chủ yếu bởi thời gian chờ (timeout) của kết nối đám mây. Do khóa API Gemini trên máy chủ kiểm thử local bị lỗi xác thực, hệ thống phải mất trung bình 3.0 giây chờ phản hồi lỗi từ Google Cloud trước khi tự động chuyển hướng sang mô hình cục bộ. Độ trễ thực tế của việc truy vấn cơ sở dữ liệu đồ thị chỉ chiếm khoảng **800 - 950 ms** (theo file `latency_breakdown.json`), chứng minh đồ thị tri thức không phải là nguyên nhân chính gây tắc nghẽn.
*   **So sánh với tiêu chuẩn SLA di động:** Theo tiêu chuẩn GSMA đối với các ứng dụng di động y tế trực tuyến, thời gian phản hồi lý tưởng là dưới 3.0 giây để duy trì trải nghiệm người dùng. Hiện tại, tỷ lệ đạt SLA tối ưu của AiMed ở kịch bản Warm Start chỉ là **10.0%**. Tuy nhiên, tỷ lệ đáp ứng thời gian phản hồi tối thiểu dưới 5.0 giây đạt **96.7%**, đảm bảo hệ thống không bị ngắt kết nối đột ngột trong quá trình tương tác. Đối với kịch bản Concurrent Load (10 request đồng thời), thời gian xử lý đồng thời (Wall Time) đạt **6400.0 ms**, cho thấy năng lực chịu tải song song ở mức chấp nhận được trên môi trường máy chủ cục bộ.
