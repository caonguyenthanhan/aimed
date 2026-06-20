# Việc bắt buộc làm bằng tay (Manual)

Tài liệu này liệt kê các hạng mục mà bạn cần tự thao tác (hoặc ít nhất phải xác nhận bằng tay) vì liên quan đến tài khoản/secret, thao tác UI của nền tảng bên thứ ba, hoặc các quyết định chuyên môn không thể tự động hoá an toàn.

## 1) Train/finetune mô hình (Colab/GPU)

- Chạy notebook train LoRA và theo dõi quá trình (mất kết nối, out-of-memory, lỗi package).
  - gpu_server/colab_server/server_ai_mcs/funny_companion_full_training_notebook.ipynb
  - gpu_server/colab_server/server_ai_mcs/funny_companion_full_training_notebook.py
- Mount Google Drive / chuẩn bị thư mục dữ liệu train theo cấu trúc yêu cầu của notebook.
- Tự chọn hyperparameters (epochs, batch, learning rate, max_len…) và model base phù hợp VRAM/quota.
- Tự đánh giá chất lượng sau train (sample generation, regression theo bộ câu hỏi y tế/tâm lý) và quyết định train lại hay dừng.
- Push artefact lên HuggingFace Hub (cần token, repo id, quyền truy cập) và xác nhận phiên bản.

## 2) Mở/duy trì GPU server trên Colab

- Mở Colab runtime, chạy các cell theo thứ tự, xử lý lỗi môi trường.
  - gpu_server/colab_server/server_ai_mcs/server_AI_MCS.ipynb
  - gpu_server/colab_server/demo/server_ai_mcs.py
  - gpu_server/colab_server/demo/colab_ai_server.py
- Nhập secret khi được hỏi (ví dụ ngrok token bằng getpass), tránh lưu trực tiếp vào repo.
- Theo dõi trạng thái session (Colab timeout), khởi động lại khi session bị reset.

## 3) Secrets/credentials & cấu hình dịch vụ ngoài

- Tạo và quản lý các API key/secret (không commit vào repo):
  - Ngrok auth token (GPU/CPU tunnel)
  - HuggingFace token (login/push model)
  - LLM provider keys (Gemini/Foza/OpenAI-like nếu có)
  - DATABASE_URL / JWT secret / các biến môi trường production
- Thiết lập env theo hướng dẫn và tự xác nhận đã đúng môi trường (local vs Vercel).
  - medical-consultation-app/docs/ENV_GUIDE.md
  - README.md (root)

## 4) Hạ tầng & hệ thống (máy cá nhân/hosting)

- Cài đặt/ cấu hình phần mềm hệ thống trên Windows:
  - Docker Desktop (nếu dùng stack graph)
  - Ngrok CLI vào PATH
  - (Nếu chạy GPU local) driver/CUDA phù hợp
- Mở port / cấu hình firewall / xác nhận URL public khi tunnel.
- Triển khai production (Vercel/hosting khác) và cấu hình domain/SSL (nếu có).

## 5) Dữ liệu & kiểm duyệt an toàn

- Thu thập/chuẩn hoá dữ liệu y tế/tâm lý (nguồn, giấy phép, chất lượng).
- Xử lý/kiểm duyệt PII (ẩn thông tin cá nhân) trước khi đưa vào kho tri thức hoặc dùng cho train.
- Quyết định schema đồ thị (thuộc tính/nút/cạnh), quy tắc mapping, và tiêu chí “đúng” cho truy vấn.

## 6) Demo/đánh giá & báo cáo (khóa luận)

- Thiết kế kịch bản demo, đo A/B, lựa chọn chỉ số đánh giá, chạy thử nghiệm và xác nhận kết quả.
- Viết báo cáo/slide, quay video demo, chuẩn bị bảo vệ.

