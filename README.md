# AIMed — Medical Consulting System (Tư vấn y tế & sức khỏe tinh thần)

Hệ thống tư vấn y tế & hỗ trợ sức khỏe tinh thần theo kiến trúc **Hybrid LLM Routing** (GPU-first → Gemini → CPU), có **Safety Layer**, **Clinical Memory**, **GraphRAG/Knowledge**, **Digital Phenotyping**, và **Digital Therapeutics (dTx)** cho mobile-first.

> Lưu ý: Nội dung do AI sinh ra chỉ mang tính tham khảo, không thay thế chẩn đoán/điều trị của bác sĩ.

## 🌐 Demo
- Production (Vercel): https://aimed-one.vercel.app
- Entry-points:
  - Sàng lọc: `/sang-loc`
  - Tư vấn: `/tu-van`
  - Tâm sự: `/tam-su`
  - Trị liệu (Mood/Journaling): `/tri-lieu`
  - Nhắc nhở hành vi: `/nhac-nho`

## ✨ Tính năng nổi bật

**Core AI**
- Tư vấn y tế AI (text chat) với routing + fallback và ghi nhận runtime metrics.
- Tâm sự (companion chat) tách luồng riêng, lưu hội thoại local-first.
- Safety Layer deterministic: chặn từ khóa nguy hiểm và trả về hướng dẫn an toàn ngay (không gọi LLM).

**Clinical**
- Clinical Memory: tóm tắt hội thoại lâm sàng + metadata rủi ro.
- SOAP Note generator: tạo báo cáo dạng SOAP phục vụ handover.
- Knowledge Search (GraphRAG virtual graph) + ingest Neo4j (ViHealthQA) cho pipeline GraphRAG.

**Senses**
- Voice: STT/TTS qua backend CPU (Next API gateway) + Voice mode trong UI.
- (Tuỳ cấu hình) vision/voice streams và tool APIs.

**Mobile & dTx**
- Mobile-first navigation: **Bottom Sheet Menu** (touch-first).
- Mood Tracker + Journaling: module ghi chép cá nhân hoá (local-first).
- PWA cơ bản + Notifications: nhắc bài tập hành vi (Behavioral Activation).

## 🧱 Kiến trúc

**Monorepo**
- `medical-consultation-app`: Next.js (App Router) + shadcn/ui + Tailwind + API routes (gateway).
- `cpu_server`: FastAPI (CPU backend) — Auth/Consent, chat fallback, STT/TTS, clinical endpoints, phenotyping.
- `gpu_server`: scripts Colab/Ngrok (tuỳ chọn).
- `Archived`: mã thử nghiệm/đồ án cũ.

**Luồng chat (tóm tắt)**
- UI → `POST /api/llm-chat` (Next API) → GPU nếu available → fallback Gemini → fallback CPU.
- UI (tâm sự) → `POST /api/tam-su-chat` → `/v1/friend-chat/completions` (GPU/CPU) → trả `conversation_id`.

## 🚀 Chạy local (Windows)

### Yêu cầu
- Node.js 18+
- Python 3.10+
- (Tuỳ chọn) Postgres (Neon) nếu bật Team TODO / Auth DB
- (Tuỳ chọn) Neo4j nếu chạy GraphRAG ingest

### 1) CPU Backend (FastAPI)
```powershell
cd cpu_server
python -m pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

Tuỳ chọn: chạy kèm ngrok (script helper)
```powershell
python -m pip install -r cpu_server/requirements.txt
.\cpu_server\launcher\run.ps1 -Port 8000 -Reload
```

### 2) Frontend (Next.js)
```powershell
cd medical-consultation-app
npm install
npm run dev
```
Mở: http://localhost:3000

## 🔐 Biến môi trường

### Frontend (Next.js)
File mẫu: [env.example](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/env.example)

- `CPU_SERVER_URL`: base URL của CPU backend (vd: `http://127.0.0.1:8000`)
- `GPU_SERVER_URL`: base URL của GPU backend (ngrok/colab) (không commit URL riêng tư)
- `LLM_PROVIDER`: `server` hoặc `gemini`
- `GEMINI_API_KEY`, `GEMINI_MODEL`: nếu dùng Gemini

### Backend (CPU FastAPI)
- `DATABASE_URL`: Postgres (Neon) cho Auth/Consent/Conversations/Knowledge/Clinical Memory
- `JWT_SECRET`: bắt buộc đổi khỏi giá trị mặc định
- `JWT_ALG`: mặc định `HS256`
- `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`: tự tạo tài khoản ADMIN lần đầu

### Team TODO (Neon Postgres)
- `DATABASE_URL`
- `TEAM_TODO_PASSWORD`: mật khẩu vào `/ke-hoach` và gọi API `/api/team-todo` (header `x-team-todo-pass`)

### Web search (Google Programmable Search)
- `GOOGLE_CSE_API_KEY`
- `GOOGLE_CSE_CX`

## 🧪 Scripts & kiểm thử nhanh

**Web search**
- `GET /api/web-search?q=tin-tuc-y-khoa&num=5`

**Team todo**
- `GET /api/team-todo` (header `x-team-todo-pass`)
- `GET /api/team-todo/revisions`

**Seed Knowledge Base (GraphRAG virtual graph)**
- `python cpu_server/scripts/seed_knowledge_base.py --entities <MedicalEntities.csv> --relations <MedicalRelations.csv> --interventions <InterventionContent.json>`

**Demo data**
- Seed kho tri thức mẫu:
  - `python cpu_server/scripts/seed_knowledge_base.py --entities medical-consultation-app/data/demo/MedicalEntities.csv --relations medical-consultation-app/data/demo/MedicalRelations.csv --interventions medical-consultation-app/data/demo/InterventionContent.json`
- Seed tài khoản + consent + hội thoại + tóm tắt:
  - `python cpu_server/scripts/seed_demo_data.py`

**Neo4j ingest ViHealthQA (JSONL)**
- ENV: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`
- `python cpu_server/scripts/ingest_vihealthqa_neo4j.py --input <vihealthqa.jsonl> --limit 0`

## 📱 PWA & Notifications (trạng thái hiện tại)
- PWA cơ bản đã có manifest + service worker tối thiểu (install/activate/notification click).
- Notifications hiện hỗ trợ “nhắc khi người dùng đang mở ứng dụng”; để push background thực sự cần thêm push subscription + server push (VAPID keys).

## 🛡️ Bảo mật & an toàn
- Không commit file `.env*`, URL GPU riêng tư, hoặc dữ liệu nhạy cảm.
- Safety Layer ưu tiên phản hồi an toàn tức thời với nội dung tự hại/bạo lực.

## 👥 Nhóm thực hiện
KHÓA LUẬN TỐT NGHIỆP 2026 – Hệ thống Trợ lý Y tế và Tâm lý
- GVHD: TS. PHAN THỊ HUYỀN TRANG
- 21110116 – Cao Nguyễn Thành An (Leader)
- 21144449 – Cao Thọ Phú Thịnh

---
© 2026 AIMed / Medical Consulting System
