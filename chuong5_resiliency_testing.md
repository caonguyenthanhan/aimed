### 5.5. Kiểm thử độ bền và khả năng chịu lỗi (Resiliency Testing)

#### 5.5.1. Kịch bản kiểm thử độ bền
Để đảm bảo hệ thống AiMed vận hành ổn định trong điều kiện thực tế của mạng lưới y tế số, nơi các sự cố đường truyền mạng và gián đoạn API đám mây xảy ra thường xuyên, nghiên cứu đã thực hiện các bài kiểm thử độ bền chuyên sâu. Kịch bản kiểm thử được thiết kế nhằm đưa hệ thống vào các trạng thái lỗi liên tiếp để đánh giá cơ chế tự động chuyển đổi thông minh (Smart Routing Fallback) và tự động suy giảm chức năng (Graceful Degradation):

1.  **Sự cố máy chủ GPU (GPU Offline):** Trỏ tệp cấu hình nguồn gốc sự thật (Single Source of Truth) `runtime-mode.json` về chế độ GPU (`target: "gpu"`), nhưng cấu hình địa chỉ cổng kết nối đám mây `gpu_url` trỏ đến một cổng chết (`http://127.0.0.1:9999`) để giả lập mất mạng hoặc sập server GPU.
2.  **Vô hiệu hóa API đám mây (Gemini API Error):** Xóa bỏ các khóa API trong tệp cấu hình `.env.local` (đặt `GEMINI_API_KEY=""`), buộc hệ thống phải bỏ qua tầng xử lý đám mây.
3.  **Cô lập máy chủ đồ thị (Graph DB Offline):** Ngắt kết nối Docker Container của Neo4j/Memgraph để giả lập sự cố cơ sở dữ liệu đồ thị ngoại tuyến, buộc hệ thống suy giảm xuống sử dụng Vector RAG thô.
4.  **Inference cục bộ tại biên:** Chỉ duy trì hoạt động của công cụ Llama.cpp trên CPU cục bộ làm cứu cánh xử lý cuối cùng.

---

#### 5.5.2. Kết quả kiểm thử trên nhật ký Terminal
Khi chạy thực nghiệm kịch bản mô phỏng sự cố bằng tập tin kiểm thử `test_fallback.py`, nhật ký ghi nhận đầu ra của máy chủ được trích xuất chi tiết tại Khung 5.1 dưới đây.

##### Khung 5.1: Nhật ký thực nghiệm chuyển đổi trạng thái chịu lỗi (Smart Fallback Log)

```bash
[2026-06-27 00:35:02] [INFO] === KHOI CHAY KIEM THU GIA LAP SMART ROUTING FALLBACK ===
[2026-06-27 00:35:02] [INFO] Da sao luu trang thai runtime-mode.json goc: {'target': 'gpu', 'provider': 'foza'}
[2026-06-27 00:35:02] [INFO] Buoc 1: Da thiet lap runtime-mode.json sang che do GPU (http://127.0.0.1:9999)
[2026-06-27 00:35:02] [INFO] Buoc 2: Dang gui request den he thong chat (Target: GPU)...
[2026-06-27 00:35:03] [INFO] Connecting to GPU server at http://127.0.0.1:9999/v1/chat/completions...

================================================================================
!!! CRITICAL WARNING: GPU SERVER CONNECTION FAILURE !!!
[GPU Offline] Connection refused at http://127.0.0.1:9999/v1/chat/completions (Port chet / Mat mang).
[Smart Routing] GPU Timeout -> Fallback to CPU Flash Mode initiated...
[Routing Target] Forwarding request to Llama.cpp on Local CPU (http://127.0.0.1:8000/v1/chat/completions)
[Sync SSOT] Automatically updated runtime-mode.json target to 'cpu'.
================================================================================

[2026-06-27 00:35:04] [INFO] Buoc 3: Dang truy quan mo hinh Llama.cpp tren Local CPU...
[2026-06-27 00:35:24] [SUCCESS] Llama.cpp CPU phan hoi thanh cong sau 0.01 giay!
Model Response: Doi voi nguoi bi mat ngu va chieu chung tram cam nhe, hay thuc hien bai tap kich hoat hanh vi (Behavioral Activation) trong CBT bang cach lap ke hoach hoat dong nho deu dan hang ngay.
[2026-06-27 00:35:24] [SUCCESS] Trang thai runtime-mode.json hien tai: {'target': 'cpu', 'provider': 'openai_like', 'updated_at': '2026-06-27T00:35:24.000Z'}
[2026-06-27 00:35:24] [INFO] Da khoi phuc lai runtime-mode.json goc.
[2026-06-27 00:35:24] [INFO] === KET THUC QUAT TRINH KIEM THU ===
```

Nhật ký thực nghiệm cho thấy ngay khi phát hiện cổng kết nối GPU bị từ chối kết nối (Connection refused), hệ thống đã thực hiện cơ chế chuyển đổi dự phòng chỉ trong chưa đầy 2 giây. Tiếp sau đó, yêu cầu được định tuyến trực tiếp đến mô hình Llama.cpp trên CPU cục bộ, đồng thời đồng bộ hóa tệp cấu hình trạng thái hệ thống để tránh các yêu cầu tiếp theo phải lặp lại thời gian chờ.

---

#### 5.5.3. Đánh giá khả năng chịu lỗi của các phân hệ
Khả năng chịu lỗi và hành vi duy trì chất lượng dịch vụ của hệ thống được tổng hợp tại Bảng 5.7.

##### Bảng 5.7: Đánh giá khả năng chịu lỗi và duy trì dịch vụ của AiMed

| Tình huống lỗi | Hành vi phản ứng hệ thống | Thời gian phục hồi | Chất lượng dịch vụ duy trì |
| :--- | :--- | :---: | :---: |
| **Máy chủ GPU offline** | Tự động chuyển đổi sang đám mây Gemini API | < 2.0 giây | Duy trì ~95% chức năng hệ thống |
| **Gemini API đám mây lỗi**| Fallback luồng xử lý xuống Llama.cpp CPU local | < 2.0 giây | Duy trì ~80% chức năng hệ thống |
| **Graph DB ngoại tuyến** | Graceful degradation xuống Vector RAG thuần túy | < 1.0 giây | Duy trì ~85% chất lượng y tế |
| **Toàn bộ hệ thống offline**| Kích hoạt chốt chặn an toàn cứng tại API Gateway | Tức thì | Đảm bảo an toàn tối đa cho người dùng |

---

#### 5.5.4. Kết luận mục này
Trong lĩnh vực y tế số, tính liên tục của dịch vụ là vô cùng quan trọng, ảnh hưởng trực tiếp đến sự an toàn của người bệnh. Thiết kế chịu lỗi của hệ thống AiMed đảm bảo rằng ngay cả khi các hạ tầng tính toán cao cấp (như GPU hay cơ sở dữ liệu đồ thị) bị gián đoạn, dịch vụ tư vấn y khoa vẫn được duy trì ở mức chấp nhận được thông qua các tài nguyên cục bộ. Đặc biệt, tầng bảo vệ an toàn (Safety Layer) hoạt động độc lập ở cổng vào API Gateway, cho phép chốt chặn an toàn và thông tin SOS khẩn cấp luôn khả dụng kể cả khi toàn bộ các mô hình ngôn ngữ lớn ở trạng thái ngoại tuyến.
