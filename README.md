# Hệ thống Tư vấn Y tế AI (Medical Consulting System)

Hệ thống tư vấn y tế & sức khỏe tinh thần chạy theo kiến trúc Hybrid (GPU-first + CPU fallback), có sàng lọc tâm lý, tra cứu, voice/vision, và công cụ quản trị vận hành (runtime mode, logs, team todo).

## 🌐 Demo (Vercel)

- Trang sàng lọc (entry-point): `/sang-loc`
- Trang chủ (landing): `/trang-chu`
- Tin tức y khoa (tìm & nhúng link): `/tin-tuc-y-khoa`
- Team TODO (mật khẩu): `/ke-hoach`

## ✅ Tính năng

- Tư vấn y tế AI: chat văn bản (có gateway chọn GPU/CPU + fallback).
- Tâm sự (companion): luồng trò chuyện riêng cho hỗ trợ cảm xúc.
- Voice: speech chat, TTS/STT (stream endpoints trong Next).
- Sàng lọc tâm lý: PHQ-9, GAD-7, PCL-5, MDQ, SCOFF, ASRS; mở trang không auto hiện “kết quả mẫu”.
- Tin tức y khoa:
  - Mặc định tìm theo `tin-tuc-y-khoa` + có nút mở Google News mặc định.
  - Gợi ý chủ đề dựa trên kết quả sàng lọc gần nhất (localStorage) và có thông điệp trấn an khi chủ đề nhạy cảm/tiêu cực.
- Team TODO có lịch sử:
  - Sửa nội dung markdown, tick checkbox nhanh trong preview.
  - Đồng bộ từ seed file.
  - Lưu DB + lưu lịch sử sửa đổi (revisions), khôi phục theo revision, bình luận nội bộ.
- Vận hành:
  - SSOT mode: `medical-consultation-app/data/runtime-mode.json`
  - Logs: `runtime-events.jsonl`, `runtime-metrics.jsonl`

## 🧱 Kiến trúc tổng quan

- Frontend: `medical-consultation-app` (Next.js App Router + shadcn/ui + Tailwind)
- Backend CPU: `cpu_server` (FastAPI)
- GPU server scripts: `gpu_server` (Colab/Ngrok)
- Archived: mã/thuật toán cũ và thử nghiệm
- Test: scripts kiểm thử

Luồng chat chính (khái quát):
- UI → `POST /api/llm-chat` → thử GPU theo runtime mode → lỗi thì fallback sang CPU backend → trả `metadata.mode`.

## 🛠️ Cài đặt (Windows)

### Yêu cầu

- Node.js 18+
- Python 3.10+

### 1) Backend (CPU FastAPI)

```powershell
cd cpu_server
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

### 2) Frontend (Next.js)

```powershell
cd medical-consultation-app
npm install
npm run dev
```

Mở: `http://localhost:3000`

## 🔐 Biến môi trường (Vercel / Local)

### Bắt buộc cho Team TODO (Neon Postgres)

- `DATABASE_URL`: connection string Postgres (Neon).
- `TEAM_TODO_PASSWORD`: mật khẩu vào `/ke-hoach` và gọi API `/api/team-todo`.

### Auth & Ethics (CPU FastAPI)

- `DATABASE_URL`: dùng chung Neon Postgres cho Auth/Consent/Conversations/Knowledge.
- `JWT_SECRET`: bắt buộc đổi khỏi giá trị mặc định.
- `JWT_ALG`: mặc định `HS256`.
- `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`: tự tạo user ADMIN lần đầu khởi động backend.

### Tùy chọn cho Tin tức y khoa (Google Programmable Search)

- `GOOGLE_CSE_API_KEY`: API key của Custom Search API.
- `GOOGLE_CSE_CX`: Search Engine ID (cx) của Programmable Search Engine.

Nếu thiếu 2 biến này, gọi `/api/web-search` sẽ trả lỗi `Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX`.

## 🧪 Test nhanh (không cần UI)

- Web search:
  - `GET /api/web-search?q=tin-tuc-y-khoa&num=5`
- Team todo:
  - `GET /api/team-todo` (header `x-team-todo-pass`)
  - `GET /api/team-todo/revisions`

- Seed kho tri thức (GraphRAG virtual graph):
  - `python cpu_server/scripts/seed_knowledge_base.py --entities <MedicalEntities.csv> --relations <MedicalRelations.csv> --interventions <InterventionContent.json>`

- Demo data (để trình diễn nhanh):
  - Seed kho tri thức mẫu (CSV/JSON đã chuẩn bị sẵn):
    - `python cpu_server/scripts/seed_knowledge_base.py --entities medical-consultation-app/data/demo/MedicalEntities.csv --relations medical-consultation-app/data/demo/MedicalRelations.csv --interventions medical-consultation-app/data/demo/InterventionContent.json`
  - Seed tài khoản + consent + hội thoại + tóm tắt mẫu:
    - `python cpu_server/scripts/seed_demo_data.py`

- Neo4j (GraphRAG) ingest ViHealthQA (JSONL):
  - ENV: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`
  - `python cpu_server/scripts/ingest_vihealthqa_neo4j.py --input <vihealthqa.jsonl> --limit 0`

## 📌 Lưu ý

- Nội dung y khoa do AI sinh ra chỉ mang tính tham khảo, không thay thế chẩn đoán/điều trị của bác sĩ.
- Không commit file `.env*`, URL GPU riêng tư, hoặc dữ liệu nhạy cảm.

## 👥 Nhóm thực hiện

KHÓA LUẬN TỐT NGHIỆP 2026 – Hệ thống Trợ lý Y tế và Tâm lý

- GVHD: TS. PHAN THỊ HUYỀN TRANG
- 21110116 – Cao Nguyễn Thành An (Leader)
- 21144449 – Cao Thọ Phú Thịnh

---
© 2026 Medical Consulting System
