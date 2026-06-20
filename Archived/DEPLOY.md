# Deploy & Environment Checklist (Local + Vercel)

## 1) Biến môi trường (Vercel)

**Bắt buộc (tối thiểu để chạy UI + gọi backend CPU)**
- `CPU_SERVER_URL` (VD: `https://<ngrok-or-vps>` hoặc `http://127.0.0.1:8000` khi chạy local)
- `GRAPH_API_KEY` (phải khớp CPU server; nếu không dùng graph vẫn nên set để tool không lỗi do thiếu key)
- DB (để lưu hội thoại): ít nhất 1 trong:
  - `POSTGRES_URL` (khuyến nghị cho Neon/Vercel Postgres)
  - `DATABASE_URL`

**Khuyến nghị (routing GPU/CPU)**
- `LLM_PROVIDER` (VD: `server`/`foza`)
- `AGENT_PROVIDER` (VD: `gemini`)
- `GPU_SERVER_URL` / `DEFAULT_GPU_URL` (nếu có GPU host OpenAI-like; nếu không để trống và hệ thống sẽ fallback CPU)

**Khuyến nghị (DB)**
- `DB_POOL_MAX` (VD: `5`)
- `DB_POOL_IDLE_TIMEOUT_MS` (VD: `30000`)
- `DB_POOL_CONN_TIMEOUT_MS` (VD: `5000`)
- Nếu Neon có “pooler/unpooled”, set thêm:
  - `DATABASE_URL_UNPOOLED` hoặc `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL_NO_SSL` (chỉ dùng khi DB bắt buộc tắt SSL; ưu tiên cấu hình SSL đúng trước)

**LLM (tuỳ chọn theo mode)**
- FOZA:
  - `FOZA_BASE_URL`
  - `FOZA_TOKEN` (khuyến nghị)
  - `FOZA_TOKEN_2` (tuỳ chọn, credential dự phòng)
  - `LLM_MODEL_NAME`
- Gemini:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`

**Speech (tuỳ chọn)**
- `GEMINI_STT_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`

**Tích hợp ngoài (tuỳ chọn)**
- YouTube hydrate: `YOUTUBE_API_KEY`
- Google CSE: `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`

**Test (chỉ dùng khi muốn chạy integration test gọi LLM thật)**
- `RUN_LLM_INTEGRATION_TESTS=1`

## 2) Biến môi trường (Local)

- Copy file mẫu: `medical-consultation-app/.env.sample` → `medical-consultation-app/.env.local`
- Chỉ điền giá trị, không cần thêm key mới nếu đã có trong `.env.sample`.

## 3) Kiểm tra nhanh sau deploy

**DB**
- Mở UI (đăng nhập) → sidebar “Lịch sử” có badge `db: ok (..ms)` hoặc `db: down`.
- API ping: `GET /api/db/ping`

**Graph**
- Bật Agent mode → banner có trạng thái graph (ok/down).
- API: `POST /api/mcp/call` với tool `graph.status` / `graph.evidence`

**Conversations**
- `GET/POST /api/conversations/list`
- `GET/POST /api/conversations/load`
- `POST /api/conversations/save`
- Nếu DB lỗi: API trả `{ skipped: true }` và UI fallback localStorage (không crash).

## 4) CPU server (FastAPI)

**Yêu cầu**
- CPU server phải chạy và public được (ngrok/vps) nếu deploy Vercel cần gọi ra internet.

**LangGraph (orchestrator CPU)**
- `LG_MAX_TOOL_CALLS` (mặc định `3`, tối đa `6`)
- `LG_WEB_TIMEOUT_S` (mặc định `10`)
- `LG_YOUTUBE_TIMEOUT_S` (mặc định `10`)
- `LG_GRAPH_TIMEOUT_S` (mặc định `12`)

**Graph backend (nếu bật graph)**
- CPU server cần cấu hình kết nối graph DB (Neo4j/Memgraph gateway) và nhận `GRAPH_API_KEY`.

## 5) Troubleshooting nhanh

- Badge `db: down`: kiểm tra đã set DB URL (`POSTGRES_URL`/`DATABASE_URL`) và pool tuning (`DB_POOL_*`); thử `GET /api/db/ping` để xem `metadata.source` + lỗi chi tiết.
- Tool graph lỗi 401/403: kiểm tra `GRAPH_API_KEY` ở cả Vercel và CPU server.
- CPU server không gọi được trên Vercel: đảm bảo `CPU_SERVER_URL` là public URL (ngrok/vps) và không bị firewall/chặn CORS upstream.
