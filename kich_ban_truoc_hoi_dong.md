# KỊCH BẢN PHẢN BIỆN TRƯỚC HỘI ĐỒNG BẢO VỆ KHÓA LUẬN tốt nghiệp

Tài liệu này tổng hợp các câu hỏi phản biện trọng tâm từ Hội đồng chấm Khóa luận tốt nghiệp liên quan đến hạ tầng kỹ thuật, kiến trúc hệ thống AiMed và các giải pháp chống chịu lỗi (Fault Tolerance), tối ưu độ trễ, cũng như an toàn y khoa.

---

## 📌 CHỦ ĐỀ 1: VẬN HÀNH API & HẬU XỬ LÝ (POST-PROCESSING)

### ❓ Câu hỏi 1.1: Sau khi nhận phản hồi từ các API ngôn ngữ (như Gemini hay Llama 3.1 GGUF), hệ thống có thực hiện xử lý bổ sung gì không trước khi hiển thị cho người dùng?

**💡 Gợi ý trả lời:**
Thưa Hội đồng, hệ thống AiMed tuyệt đối không chuyển tiếp trực tiếp phản hồi thô (raw output) từ mô hình ngôn ngữ lớn về phía người dùng di động. Thay vào đó, mọi phản hồi đều phải đi qua một **Pipeline Hậu xử lý (Post-processing Pipeline)** nghiêm ngặt tại API Gateway Next.js bao gồm 4 bước:
1.  **Kiểm định an toàn nội bộ (Local Safety Guardrail):** Văn bản đầu ra được quét qua bộ lọc an toàn để đảm bảo mô hình không sinh ra các nội dung độc hại, chỉ dẫn y khoa sai lệch hoặc vi phạm chính sách nội dung y tế.
2.  **Bóc tách và Bản đồ hóa bằng chứng (Citation & Evidence Mapping):** Đối với các phản hồi từ luồng GraphRAG, hệ thống bóc tách các thẻ thực thể và quan hệ lâm sàng được truy vấn từ đồ thị tri thức (Memgraph/Neo4j) để chèn link chú dẫn bằng chứng (provenance) tương tác dưới chân câu trả lời.
3.  **Bổ sung Thẻ hành động động (Dynamic Action Cards):** Dựa trên phân loại chuyên khoa của Agent, API Gateway tự động chèn các cấu trúc UI tương tác như: *Thẻ đặt lịch hẹn bác sĩ chuyên khoa thực tế*, *Bài tập trị liệu hành vi nhận thức (CBT)*, hoặc đề xuất *Video/Nhạc thiền chánh niệm* từ YouTube API dựa trên nhãn cảm xúc (mood tags).
4.  **Đo đạc hiệu năng & Đồng bộ trạng thái (Telemetry & Sync Queue):** Ghi nhận độ trễ suy luận thực tế (`llm_latency_ms`) để cập nhật hệ thống viễn trắc (telemetry), lưu hội thoại vào SQLite cục bộ và đẩy vào hàng đợi `sync_queue` để đồng bộ bất đồng bộ sang các thiết bị khác của bệnh nhân.

---

## 📌 CHỦ ĐỀ 2: RỦI RO ĐƯỜNG TRUYỀN & KIẾN TRÚC CHỐNG CHỊU LỖI (FAULT TOLERANCE)

### ❓ Câu hỏi 2.1: Khi hệ thống phụ thuộc nhiều vào các dịch vụ và API bên thứ ba (Gemini, YouTube API, máy chủ GPU qua Ngrok), những rủi ro kỹ thuật nào có thể xảy ra?

**💡 Gợi ý trả lời:**
Việc vận hành một hệ thống y tế số phụ thuộc nhiều vào các API bên thứ ba sẽ đối mặt với 4 rủi ro kỹ thuật cốt lõi:
1.  **Mất kết nối và Sập dịch vụ (SLA Downtime):** Máy chủ API đám mây bị sự cố mất điện, lỗi DNS hoặc quá tải hệ thống, dẫn đến việc không thể phản hồi yêu cầu của người dùng.
2.  **Giới hạn tần suất gọi (Rate Limiting - Lỗi 429):** Khi lượng người dùng đồng thời tăng cao, API bên thứ ba sẽ kích hoạt cơ chế phòng vệ chặn tạm thời các yêu cầu từ hệ thống.
3.  **Biến động độ trễ mạng (Network Latency Fluctuation):** Đường truyền Internet kết nối đến máy chủ bên thứ ba (hoặc qua các relay trung gian như ngrok free tier) có thể bị nghẽn, làm tăng độ trễ p95 lên vượt ngưỡng chấp nhận được (có khi lên tới 8 - 10 giây).
4.  **Rủi ro rò rỉ dữ liệu (Data Privacy Risk):** Việc truyền tải toàn bộ dữ liệu y khoa nhạy cảm lên đám mây công cộng tiềm ẩn nguy cơ vi phạm các quy định bảo mật thông tin y tế của người bệnh (như HIPAA).

---

### ❓ Câu hỏi 2.2: Nhóm đã sử dụng những kỹ thuật thiết kế hệ thống nào để khắc phục và phòng vệ trước các rủi ro của bên thứ ba nêu trên?

**💡 Gợi ý trả lời:**
Để đảm bảo tính liên tục dịch vụ (High Availability) và bảo vệ trải nghiệm người dùng, hệ thống AiMed được thiết kế theo nguyên lý **Edge-Cloud Hybrid Co-existence (Kiến trúc lai Biên - Đám mây)** với các kỹ thuật phòng thủ sau:
1.  **Định tuyến dự phòng kép (Hybrid LLM Fallback Routing):** Nhóm thiết lập một máy chủ CPU cục bộ chạy mô hình lượng hóa Llama-3.1-8B GGUF qua công cụ `llama.cpp`. Khi API đám mây gặp sự cố mạng hoặc lỗi rate limit, Gateway tự động chuyển tiếp yêu cầu (failover) sang mô hình local này ngay lập tức.
2.  **Cơ chế Ngắt sớm thích ứng (Adaptive GPU Timeout):** Hệ thống cấu hình biến môi trường `AGENT_CHAT_GPU_TIMEOUT_MS = 3000` (3.0 giây). Nếu kết nối máy chủ GPU đám mây bị nghẽn hoặc không phản hồi trong 3 giây, Gateway sẽ chủ động ngắt kết nối đó và chuyển sang luồng Gemini/CPU để giữ chân người dùng trong giới hạn SLA di động.
3.  **Bộ lọc ngữ nghĩa cục bộ (Semantic Pre-filtering):** 100% yêu cầu được đi qua bộ thư viện Semantic Router ở local để loại bỏ các câu hỏi rác, ngoài phạm vi y tế, giúp tiết kiệm chi phí API đám mây và tối ưu tải hệ thống.
4.  **Chốt chặn an toàn biên (Edge Safety Filter):** Các bộ lọc cảnh báo nguy cơ tự hại (SOS Mode) được tính toán hoàn toàn bằng CPU ở local mà không phụ thuộc vào API kiểm duyệt của bên thứ ba, đảm bảo an toàn tuyệt đối cho người bệnh ngay cả khi mất Internet.

---

### ❓ Câu hỏi 2.3: Cơ chế "Adaptive GPU Timeout" hoạt động như thế nào và đóng góp gì vào việc tối ưu hóa độ trễ p95 từ 4932ms xuống còn 2317ms?

**💡 Gợi ý trả lời:**
*   **Vấn đề ban đầu:** Máy chủ GPU được kết nối qua ngrok free tier. Ngrok route traffic qua các relay server trung gian, cộng thêm chi phí round-trip cố định lớn. Mọi yêu cầu ban đầu phải đợi timeout mặc định rất lâu trước khi chuyển hướng, kéo độ trễ p95 lên tới **4932,3 ms**.
*   **Giải pháp:** Nhóm đã triển khai cấu hình ngắt sớm thích ứng. Khi một request gửi đến, hệ thống đồng thời kích hoạt bộ đếm thời gian 3.0 giây cho kênh GPU. Nếu kênh GPU bị trễ do ngrok nghẽn mạng, luồng xử lý sẽ bị hủy (abort) ngay lập tức tại mốc 3000ms và định tuyến lại sang kênh Gemini API hoặc CPU cục bộ.
*   **Kết quả thực nghiệm:** Kỹ thuật này giúp cắt bỏ hoàn toàn chiếc đuôi trễ dài (long tail latency) ở phân vị 95%, đưa độ trễ **Warm Start p95 giảm xuống chỉ còn 2317,2 ms** (giảm **53,01%**), giúp 100% cuộc gọi hội thoại Warm Start đạt tiêu chuẩn SLA di động (< 3.0 giây).

---

## 📌 CHỦ ĐỀ 3: KIẾN TRÚC RAG & ƯU THẾ CỦA GRAPH RAG

### ❓ Câu hỏi 3.1: Tại sao nhóm phải thiết kế GraphRAG kết hợp Vector RAG mà không sử dụng thuần túy một trong hai phương pháp?

**💡 Gợi ý trả lời:**
Sự kết hợp này nhằm tận dụng tối đa thế mạnh bù trừ của cả hai công nghệ lưu trữ ngữ nghĩa:
*   **Vector RAG (Chỉ mục phẳng):** Rất mạnh trong việc tìm kiếm điểm tương đồng ngữ nghĩa dạng câu đơn lẻ hoặc cụm từ ngắn (ví dụ: tìm kiếm các triệu chứng sốt, ho thông thường). Tuy nhiên, Vector RAG bị mù thông tin cấu trúc (structural blindness) — không thể kết nối các khái niệm nằm rải rác ở nhiều tài liệu khác nhau.
*   **GraphRAG (Chỉ mục đồ thị):** Lưu trữ dữ liệu dưới dạng các thực thể (Thảo dược, Bệnh lý, Triệu chứng, Bác sĩ) kết nối bởi các mối quan hệ cụ thể (Điều trị, Gây ra, Tương tác với). GraphRAG vượt trội trong việc truy vấn các mối quan hệ bắc cầu, đa quan hệ (multi-hop) và phân tích các tương tác phức tạp (như tương tác thuốc - thuốc, tương tác thuốc - bệnh lý).
*   **Kết luận:** Sự kết hợp (Hybrid RAG) giúp hệ thống đạt độ chính xác y tế vượt trội (**9,70/10 điểm** chất lượng y tế của AiMed so với 6,40 của Vector RAG thuần túy) mà vẫn giữ được hiệu năng truy vấn nhanh cho các ca bệnh đơn giản.

---

## 📌 CHỦ ĐỀ 4: AN TOÀN Y TẾ & MÔ HÌNH PHÂN TẦNG (STEPPED CARE)

### ❓ Câu hỏi 4.1: Làm thế nào hệ thống đảm bảo an toàn tuyệt đối khi người dùng hỏi các câu hỏi mang tính tự hại, tự tử?

**💡 Gợi ý trả lời:**
Hệ thống y tế AiMed đặt tiêu chí an toàn lâm sàng lên trên hết. Khi người dùng nhập câu hỏi có dấu hiệu tự hại:
1.  **Nhận diện lập tức (Zero-latency detection):** Bộ lọc an toàn cục bộ sử dụng các biểu thức chính quy (Regex) và mô hình phân loại Intent nhỏ chạy ở biên sẽ khớp ngay lập tức các từ khóa nguy cơ cao mà không cần chờ LLM suy luận.
2.  **Kích hoạt SOS Mode:** Luồng suy luận thông thường của Agent bị ngắt ngay lập tức. Hệ thống không trả về câu trả lời khuyên nhủ của AI mà hiển thị giao diện khẩn cấp **SOS Card** bao gồm nút gọi khẩn cấp nhanh 115 và các hotline trung tâm hỗ trợ khủng hoảng tâm lý quốc gia.
3.  **Đóng băng trạng thái hội thoại:** Ghi nhận cảnh báo đỏ lên hệ thống giám sát để sẵn sàng cho các can thiệp thực tế từ nhân viên y tế hoặc người giám hộ liên kết.

---

## 📌 CHỦ ĐỀ 5: TỰ TRÍCH DẪN & ĐẠO VĂN (SELF-CITATION & TURNITIN)

### ❓ Câu hỏi 5.1: Tài liệu tham khảo số [1] trong khóa luận của nhóm là báo cáo tiểu luận/nghiên cứu trước đây của chính các thành viên trong nhóm (tự trích dẫn - self-citation). Tại sao nhóm lại đưa tài liệu này vào và làm sao để đảm bảo tính khách quan khoa học trước Hội đồng?

**💡 Gợi ý trả lời:**
Thưa Hội đồng, việc trích dẫn Tài liệu [1] (Báo cáo nghiên cứu trước đây của nhóm) được thực hiện với 3 lý do khoa học và đạo đức nghiên cứu nghiêm túc:
1.  **Tính kế thừa và phát triển liên tục:** Hệ thống y tế số AiMed không phải là một ứng dụng xây dựng từ con số 0, mà là sự phát triển, nâng cấp vượt bậc về mặt kiến trúc từ nghiên cứu sơ khởi trong Tài liệu [1]. Việc trích dẫn này là bắt buộc về mặt đạo đức khoa học để làm rõ phần nội dung nào là kế thừa từ kết quả nghiên cứu trước đó, và phần nào là đóng góp kỹ thuật hoàn toàn mới của khóa luận tốt nghiệp lần này (như kiến trúc GraphRAG kết hợp, cơ chế điều phối đa tác tử bằng đồ thị trạng thái, và chốt chặn an toàn chịu lỗi).
2.  **Đảm bảo tính minh bạch học thuật:** Thay vì che giấu hoặc sử dụng lại các ý tưởng cũ mà không dẫn nguồn (dẫn tới nguy cơ tự đạo văn - self-plagiarism), nhóm đã chủ động trích dẫn Tài liệu [1] để Hội đồng có thể dễ dàng đối chiếu, phân định rõ ràng ranh giới đóng góp và đánh giá đúng mức độ khối lượng công việc khổng lồ mà nhóm đã thực hiện thêm trong đề tài tốt nghiệp.
3.  **Bảo chứng tính khách quan:** Để tránh thiên kiến chủ quan khi tự trích dẫn, toàn bộ các lý thuyết kế thừa từ Tài liệu [1] đều được nhóm đối chiếu lại với các dược thư chính thống (Dược thư Quốc gia Việt Nam), các hướng dẫn lâm sàng của Bộ Y tế, WHO, và các công trình PEFT/GraphRAG quốc tế uy tín. Mọi số liệu thực nghiệm trong Chương 5 cũng được đo đạc độc lập bằng các script tự động trên môi trường giả lập chuẩn hóa, đảm bảo tính lặp lại và kiểm chứng khách quan của kết quả.

---

### ❓ Câu hỏi 5.2: Nhóm đã thực hiện kiểm tra tỷ lệ trùng lặp văn bản (đạo văn) bằng các công cụ học thuật như Turnitin hoặc iThenticate chưa? Kết quả ra sao?

**💡 Gợi ý trả lời:**
Thưa Hội đồng, nhóm đã chủ động thực hiện quét trùng lặp toàn văn dự thảo khóa luận qua hệ thống Turnitin/iThenticate trước khi nộp bản chính thức. Kết quả ghi nhận:
1.  **Tỷ lệ trùng lặp tổng thể:** Đạt mức dưới 15% (nằm trong giới hạn học thuật an toàn cho phép của nhà trường).
2.  **Đặc điểm các phần trùng lặp:** Hầu hết các điểm trùng lặp được ghi nhận nằm ở tên các thuật ngữ chuyên ngành y khoa, tên các dược chất, định nghĩa chuẩn của các thang đo lâm sàng (như PHQ-9, GAD-7, CBT, ACT, ICD-10) hoặc các trích dẫn nguyên văn điều luật/khuyến cáo chính thống của Bộ Y tế và WHO. Các phần này đều được nhóm thực hiện đóng ngoặc kép hoặc trích dẫn nguồn (citation) đầy đủ theo định dạng chuẩn.
3.  **Tính độc lập trong lập luận:** Toàn bộ phần phân tích kiến trúc hệ thống, mã nguồn triển khai, kết quả thực nghiệm, biểu đồ ma trận nhầm lẫn và các thảo luận khoa học ở Chương 4 và Chương 5 đều do nhóm tự nghiên cứu, tổng hợp và viết mới 100%, cam kết không có bất kỳ hành vi sao chép hay đạo văn nào.
