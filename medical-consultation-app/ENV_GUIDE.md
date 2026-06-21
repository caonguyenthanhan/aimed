# Hướng dẫn Cấu hình Biến Môi trường (ENV_GUIDE.md)

Dự án sử dụng nhiều biến môi trường để hỗ trợ chế độ chạy Hybrid (Local CPU + Cloud Colab GPU + Gemini Fallback). Dưới đây là mô tả chi tiết nhiệm vụ của từng biến môi trường và cách cấu hình chính xác cho từng môi trường chạy.

---

## 1. Các file .env chính được sử dụng

- `.env`: File cấu hình chạy cục bộ (Local Development) - **Bị bỏ qua bởi Git**.
- `.env.sample`: File cấu hình mẫu làm mẫu cho các lập trình viên khác - **Được lưu trữ trên Git**.
- `.env.production`: Cấu hình dùng riêng cho môi trường build/production cục bộ hoặc đồng bộ Vercel.

---

## 2. Danh sách & Giải thích chi tiết các biến môi trường

### Cấu hình URL các Máy chủ AI (Backend & Proxy)
- **`CPU_SERVER_URL`** (Mặc định: `http://127.0.0.1:8000`)
  - *Nhiệm vụ:* Đường dẫn đến server FastAPI cục bộ chạy các tác vụ proxy, LangGraph triage và API phụ trợ.
- **`GPU_SERVER_URL`**
  - *Nhiệm vụ:* Đường dẫn ngrok động trỏ thẳng tới server Colab đang chạy mô hình Llama GPU.
- **`LOCAL_AGENT_URL`** (Mặc định: `http://127.0.0.1:8000/v1/chat/completions`)
  - *Nhiệm vụ:* Địa chỉ API Chat Completions của tác vụ LangGraph triage.

### Cấu hình Provider AI (LLM & Agent Mode)
- **`LLM_PROVIDER`** (Lựa chọn: `server` | `gemini` | `foza`)
  - *Nhiệm vụ:* Chỉ định nhà cung cấp mô hình ngôn ngữ lớn (LLM). 
    - `server`: Sử dụng API server hybrid (GPU Colab / CPU local).
    - `gemini`: Trò chuyện trực tiếp với Gemini qua API key.
    - `foza`: Sử dụng API của Foza.
- **`AGENT_PROVIDER`** (Lựa chọn: `gemini` | `foza` | `server`)
  - *Nhiệm vụ:* Lựa chọn nhà cung cấp mô hình chạy agent phân tầng triage.

### Cấu hình Khóa API (API Keys)
- **`GEMINI_API_KEY`**
  - *Nhiệm vụ:* Khóa API của Google Gemini dùng cho các tác vụ fallback, STT, TTS hoặc chatbot độc lập.
- **`FOZA_TOKEN`** & **`FOZA_TOKEN_2`**
  - *Nhiệm vụ:* Mã thông báo để truy cập API của đối tác Foza AI.
- **`NGROK_AUTH_TOKEN`**
  - *Nhiệm vụ:* Token xác thực tài khoản Ngrok, dùng để mở đường truyền từ Colab hoặc Local ra Internet công cộng.

### Cấu hình Cơ sở dữ liệu (Database Connections)
- **`DATABASE_URL`**
  - *Nhiệm vụ:* Chuỗi kết nối PostgreSQL (Neon.tech pooler hoặc Docker Postgres cục bộ). Dùng để lưu trữ lịch sử hội thoại của người dùng và thông tin lịch hẹn bác sĩ.
  - *Định dạng:* `postgres://<username>:<password>@<host>/<dbname>?sslmode=require`

### Cấu hình Audio (STT & TTS)
- **`TTS_PROVIDER`** (Lựa chọn: `auto` | `gemini` | `supertone`)
  - *Nhiệm vụ:* Chọn dịch vụ chuyển văn bản thành giọng nói (Text-to-Speech).
- **`SUPERTONIC_TTS_URL`** (Mặc định: `http://127.0.0.1:7788`)
  - *Nhiệm vụ:* Đường dẫn đến server chuyển giọng nói Supertone cục bộ.

---

## 3. Cách Thiết lập khi Deploy lên Vercel

Khi deploy lên Vercel, bạn cần cấu hình các biến môi trường trực tiếp trong Dashboard của Vercel (Project Settings -> Environment Variables) thay vì đẩy file `.env` lên Git:

1. **`LLM_PROVIDER`**: Thiết lập thành `gemini` để đảm bảo hệ thống luôn hoạt động ổn định nhờ serverless API của Google (không phụ thuộc vào máy local đang bật).
2. **`GEMINI_API_KEY`**: Điền khóa Gemini API của bạn.
3. **`DATABASE_URL`**: Điền chuỗi kết nối Neon Postgres (luôn bật chế độ pooling để tránh cạn kiệt connection do serverless function của Next.js).
4. **`NEXT_PUBLIC_APP_NAME`**: Điền tên ứng dụng của bạn (ví dụ: `AIMed`).
5. **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`**: Điền mã đăng nhập Google nếu sử dụng chức năng đăng nhập Google Auth.
