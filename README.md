# Hệ thống Tư vấn Y tế AI (Medical Consulting System)

Hệ thống Chatbot Tư vấn Y tế thông minh hỗ trợ người dùng tra cứu thông tin sức khỏe, sàng lọc tâm lý và tư vấn sơ bộ dựa trên kiến trúc Hybrid AI (kết hợp xử lý CPU cục bộ và GPU đám mây).

## 🏆 3 Trụ Cột Cốt Lõi (Project Pillars)

Dự án được xây dựng dựa trên 3 trụ cột công nghệ và sáng tạo, giải quyết các bài toán thực tế:

### 1. Kiến trúc Hybrid (GPU-CPU Fallback)
> **Giải pháp tối ưu cho bối cảnh hạ tầng Việt Nam.**
*   **Đóng góp chính**: Thuật toán **Smart Routing** (Định tuyến thông minh).
*   **Giá trị**: Hệ thống không chỉ chạy AI mà còn có khả năng **tự phục hồi** khi mất kết nối máy chủ Cloud. Cơ chế Fallback đảm bảo tính sẵn sàng cao (**High Availability**) - Chatbot vẫn hoạt động (mode offline) ngay cả khi mất mạng hoặc GPU Server sập.

### 2. Bản địa hóa sâu (Vietnamese Medical Localization)
> **Hiểu người Việt hơn GPT-4.**
*   **Khác biệt**: Hệ thống được tinh chỉnh trên tập dữ liệu y tế tiếng Việt thực tế, không chỉ dịch thuật máy móc.
*   **Năng lực RAG**: Khả năng hiểu các **thuật ngữ dân gian** (như *"trúng gió"*, *"giời leo"*, *"nổi mề đay"*) và nhận diện chính xác **tên thuốc nội địa** đang lưu hành tại Việt Nam thông qua cơ chế RAG (Retrieval-Augmented Generation).

### 3. Tích hợp Sàng lọc tâm lý & Bạn tâm giao
> **Chăm sóc toàn diện: Thể chất & Tinh thần.**
*   **Vấn đề**: Đa số chatbot y tế hiện nay chỉ tập trung tư vấn triệu chứng vật lý.
*   **Giải pháp**: Đề tài nổi bật ở việc kết hợp **Y tế thể chất + Sức khỏe tâm thần**.
*   **Thực tiễn**: Số hóa các thang đo chuẩn y khoa (**PHQ-9**, **GAD-7**) vào hội thoại tự nhiên, giúp phát hiện sớm dấu hiệu trầm cảm/lo âu một cách tinh tế và riêng tư.

## 🚀 Tính Năng Nổi Bật

- **Tư vấn đa phương thức**: Hỗ trợ chat văn bản, giọng nói (Speech-to-Text/Text-to-Speech) và hình ảnh (Vision).
- **Kiến trúc Hybrid Linh hoạt**:
  - **Chế độ CPU (Local)**: Chạy nhẹ nhàng trên máy cá nhân cho các tác vụ cơ bản.
  - **Chế độ GPU (Cloud)**: Tự động chuyển tải sang Google Colab/GPU Server cho các mô hình nặng (RAG, Vision, TTS chất lượng cao).
- **RAG (Retrieval-Augmented Generation)**: Tra cứu thông tin y khoa chính xác từ cơ sở dữ liệu vector (ChromaDB) để giảm ảo giác AI.
- **Sàng lọc Tâm lý**: Tích hợp các bài test chuẩn y khoa (PHQ-9, GAD-7) để đánh giá sức khỏe tinh thần.
- **Chế độ Offline**: Tự động chuyển về xử lý cục bộ khi mất kết nối Internet hoặc Server GPU.

## � Giao Diện & Demo

### 1. Tổng quan & Tính năng chính
| Trang Chủ | Tư Vấn AI |
|:---:|:---:|
| ![Trang Chủ](screenshots/trang-chu.png) | ![Tư Vấn](screenshots/tu-van.png) |
| **Giao diện chính trực quan** | **Chatbot hỗ trợ đa phương thức** |

### 2. Tiện ích Y tế
| Tra Cứu Thuốc | Sàng Lọc Tâm Lý |
|:---:|:---:|
| ![Tra Cứu](screenshots/tra-cuu.png) | ![Sàng Lọc](screenshots/sang-loc.png) |
| **Tra cứu thông tin dược phẩm** | **Bài test PHQ-9/GAD-7** |

### 3. Tính năng Nâng cao
| Phân Tích Hình Ảnh | Bạn Tâm Giao |
|:---:|:---:|
| ![Vision AI](screenshots/phan-tich-hinh-anh.png) | ![Companion](screenshots/ban-tam-giao.png) |
| **Chẩn đoán sơ bộ qua ảnh** | **Trò chuyện cảm xúc** |

### 4. Cơ chế hoạt động (Hybrid Architecture)
![Fallback Mechanism](screenshots/fallback-mechanism.png)
*Sơ đồ luồng xử lý lỗi và cơ chế tự động chuyển đổi giữa GPU (Cloud) và CPU (Local)*

### 5. Kiến trúc Hệ thống Tổng quan (System Architecture)
![AI Healthcare Advisory System Architecture](screenshots/AI-Healthcare-Advisory.png)
*Sơ đồ tổng quan các phân hệ chức năng và luồng dữ liệu (Mermaid Chart)*

> 📘 **Chi tiết kỹ thuật**: Xem tài liệu kiến trúc đầy đủ và mã nguồn Mermaid tại [docs/system-architecture.md](docs/system-architecture.md).

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Shadcn/UI, Tailwind CSS
- **State Management**: React Hooks, Server Actions

### Backend
- **Framework**: FastAPI (Python)
- **AI Engine**: Llama.cpp (Local LLM), Transformers (HuggingFace)
- **Vector DB**: ChromaDB
- **Speech**: gTTS (Google TTS), SpeechRecognition
- **Connectivity**: Ngrok (Tunneling cho Colab)

## 📦 Cài Đặt & Chạy Dự Án

### Yêu Cầu Tiên Quyết
- **Node.js**: v18 trở lên
- **Python**: 3.10 trở lên
- **Trình duyệt**: Chrome/Edge/Firefox mới nhất

### 1. Cài đặt Backend (Local Server)

```powershell
# Tại thư mục gốc của dự án
pip install -r requirements.txt
```

### 2. Cài đặt Frontend

```powershell
cd medical-consultation-app
npm install
```

## 🚀 Hướng Dẫn Chạy

### Bước 1: Khởi chạy Backend (Local API)
Mở một terminal tại thư mục gốc và chạy:

```powershell
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```
*Server sẽ chạy tại: `http://127.0.0.1:8000`*

### Bước 2: Khởi chạy Frontend
Mở một terminal khác tại thư mục `medical-consultation-app` và chạy:

```powershell
cd medical-consultation-app
npm run dev
```
*Truy cập ứng dụng tại: `http://localhost:3000`*

### Bước 3: Kết nối GPU Server (Tùy chọn - Khuyên dùng)
Để sử dụng các tính năng nâng cao (RAG, Vision, TTS xịn):
1. Upload thư mục `DB_ALL` và notebook `server_AI_MCS.ipynb` lên Google Drive.
2. Mở notebook trên Google Colab, kết nối GPU (T4).
3. Chạy các cell để khởi động server và lấy **Ngrok URL**.
4. Cập nhật URL vào file `medical-consultation-app/data/runtime-mode.json` (trường `gpu_url`) hoặc nhập trực tiếp trên giao diện Web.

### Cấu hình GPU & Headers
- Khi gọi tới Colab Ngrok, luôn thêm header `ngrok-skip-browser-warning: true` để tránh trang cảnh báo.
- Các endpoint GPU hỗ trợ:
  - `POST /v1/chat/completions` (Tư vấn y tế)
  - `POST /v1/friend-chat/completions` (Tâm sự bạn bè)
  - `POST /v1/health-lookup` (Tra cứu thuốc/bệnh thông minh)
  - `POST /v1/document-chat` (Phân tích tài liệu PDF/DOC)
  - `POST /v1/vision-multi` (Phân tích hình ảnh)
  - `GET /v1/benh`, `GET /v1/thuoc` (Danh mục dữ liệu y khoa)
  - `GET /gpu/metrics` (Thông tin GPU cho hiển thị trạng thái)

### Đồng bộ chế độ xử lý
- Nguồn sự thật: `medical-consultation-app/data/runtime-mode.json` với các trường:
  - `target`: `"gpu"` hoặc `"cpu"`
  - `gpu_url`: URL Ngrok Colab, ví dụ: `https://miyoko-trichomonadal-reconditely.ngrok-free.dev`
  - `updated_at`: thời điểm cập nhật

## 📂 Cấu Trúc Thư Mục

```
medical-consulting-system/
├── medical-consultation-app/   # Frontend (Next.js) + Gemini API key mode
├── cpu_server/                 # CPU server + backend (FastAPI) + launcher ngrok
├── gpu_server/                 # Script triển khai GPU server (Colab/Ngrok)
├── Archived/                   # Bản lưu trữ cũ (RAG/notebook/đóng góp trước đây)
├── test/                       # Test cases + script kiểm thử + báo cáo test
└── README.md                   # Tài liệu hướng dẫn
```

## 🧭 Tổng quan kỹ thuật (để tiếp tục phát triển)

### 1) Kiến trúc Hybrid (GPU-first + CPU fallback)
- **Frontend (Next.js)**: giao diện chat, tra cứu, sàng lọc tâm lý, voice/vision.
- **Gateway (Next.js API Routes)**: đóng vai trò “API Gateway”, quyết định gọi **GPU server** hay **Local backend** dựa trên `runtime-mode.json`.
- **Local Backend (FastAPI - `cpu_server/server.py`)**: cung cấp API `/v1/*`, vừa xử lý CPU (llama-cpp GGUF) vừa proxy sang GPU (Colab/Ngrok).
- **GPU Server (Colab/Ngrok)**: chạy các tác vụ nặng (LLM lớn/Vision/TTS-STT/RAG) và expose `/v1/*` + `/gpu/metrics`.

Luồng phổ biến:
- UI → `POST /api/llm-chat` → (GPU `/v1/chat/completions`) → nếu lỗi → fallback CPU `http://127.0.0.1:8000/v1/chat/completions`.
- UI nhận `metadata.mode` và phát event `runtime_mode_changed` để cập nhật indicator CPU/GPU.

### 2) Nguồn cấu hình & “Single Source of Truth”
- `medical-consultation-app/data/runtime-mode.json`
  - `target`: `"gpu"` hoặc `"cpu"`
  - `gpu_url`: base URL của GPU server (Ngrok)
  - `updated_at`: thời điểm cập nhật
- `medical-consultation-app/data/server-registry.json`: danh sách GPU URLs (dùng khi chưa set `gpu_url`).

### 3) Các điểm chạm quan trọng khi sửa/điều tra lỗi
- UI Chat (offline-first title + đồng bộ mode):
  - `medical-consultation-app/components/chat-interface.tsx`
  - Khi **không có token/offline**, title tạm thời lấy **6 từ đầu** của tin nhắn và lưu `localStorage` (`conv_title_<id>`).
- Nút chuyển CPU/GPU (event-driven + đọc runtime state/metrics):
  - `medical-consultation-app/components/compute-toggle.tsx`
- Gateway Chat (đọc runtime-mode/registry + fallback + log metrics/events):
  - `medical-consultation-app/app/api/llm-chat/route.ts`
- Local Backend endpoints (FastAPI):
  - `cpu_server/server.py` (các endpoint chính: `/v1/chat/completions`, `/v1/friend-chat/completions`, `/v1/health-lookup`, `/v1/vision-chat`, `/v1/document-chat`, TTS/STT, runtime mode/state, auth, conversations…)
- GPU Server (Colab):
  - `gpu_server/colab_server/demo/server_ai_mcs.py` và các script trong `gpu_server/colab_server/server_ai_mcs/`

### 4) Log/Quan sát (phục vụ debug fallback & hiệu năng)
- `medical-consultation-app/data/runtime-events.jsonl`: ghi sự kiện (fallback, mode_change, gpu_metrics, frontend_call…)
- `medical-consultation-app/data/runtime-metrics.jsonl`: thời gian phản hồi theo mode (cpu/gpu) và endpoint

### 5) Tài liệu kỹ thuật trong repo
- Inference scripts (fine-tuned/LoRA): `README_INFERENCE.md`
- Tài liệu nội bộ (không public) và dữ liệu lớn được để local và không theo dõi bởi git.

## ⚠️ Lưu Ý Quan Trọng
- **Dữ liệu Y tế**: Các câu trả lời của AI chỉ mang tính chất tham khảo, **không thay thế lời khuyên của bác sĩ chuyên khoa**.
- **Bảo mật**: Không chia sẻ file `.env` hoặc URL Ngrok công khai.

## 👥 Tác Giả
KHÓA LUẬN TỐT NGHIỆP 2026 - Hệ thống Trợ lý Y tế và Tâm lý Đa tác tử (Multi-Agent) ứng dụng GraphRAG và Function Calling trên nền tảng Llama
- **GVHD** - TS. PHAN THỊ HUYỀN TRANG

- **21110116** - Cao Nguyễn Thành An (Leader)
- **21144449** - Cao Thọ Phú Thịnh

---
*© 2026 Medical Consulting System. All rights reserved.*
