# Gói “bảo vệ” (Vercel → CPU local + ngrok)

Tài liệu này là checklist vận hành + smoke test để demo hội đồng ổn định theo mô hình:
- Frontend: Vercel
- Backend Agent/Tools/Graph: CPU server chạy local và expose qua ngrok
- Data: Postgres + Memgraph chạy Docker local

## 0) Điều kiện

- Docker Desktop đang chạy
- CPU server có FOZA env: `FOZA_TOKEN` và `LLM_MODEL_NAME`
- Nếu demo tool: có `GOOGLE_CSE_API_KEY/GOOGLE_CSE_CX` và/hoặc `YOUTUBE_API_KEY`

## 1) Bật hạ tầng local (DB + Graph)

- Postgres container: port 5432
- Memgraph: port 7687
- Memgraph Lab: port 3002

Kiểm tra nhanh:
- DB badge xanh trên UI (hoặc gọi `/api/db/ping`)
- Graph badge xanh và `graph.status nodes>0`

## 2) Import/Seed dữ liệu Graph (để evidence “có thịt”)

- Import graph dump lớn (nếu cần) và/hoặc seed demo CSV để có case dễ giải thích:
  - `cpu_server/scripts/ingest_demo_memgraph.py` (tạo `collection=demo`)
- Kiểm chứng:
  - `graph.evidence` với query `Tram cam` trả `entities[]` và `edges[]`

## 3) Chạy CPU server với ngrok (public)

Chạy CPU server (ngrok):
- `python cpu_server/launcher/run_cpu_server_ngrok.py --port 8000`

Sau đó lấy Public URL (ngrok) và test:
- `${PUBLIC}/health`
- `${PUBLIC}/v1/graph/status`

Lưu ý:
- Giữ terminal CPU+ngrok chạy xuyên suốt lúc demo. Nếu ngrok tắt, URL sẽ “offline” và Vercel sẽ báo `graph.status not connected`.

## 4) Cấu hình Vercel env (bắt buộc)

Set env trên Vercel (Project Settings → Environment Variables):
- `CPU_SERVER_URL = ${PUBLIC}` (public ngrok URL)

Gợi ý:
- Khi đổi URL ngrok, cần update env Vercel và redeploy (hoặc trigger redeploy).

## 5) Smoke test end-to-end (Vercel → CPU public)

Script smoke:
- `medical-consultation-app/scripts/demo-smoke-vercel.ps1`

Ví dụ:
- `powershell -ExecutionPolicy Bypass -File .\scripts\demo-smoke-vercel.ps1 -VercelUrl https://<your-app>.vercel.app -CpuPublicUrl https://<ngrok>.ngrok-free.app`

## 6) Test matrix & báo cáo (đính kèm luận văn)

Chạy matrix (CPU local):
- `powershell -ExecutionPolicy Bypass -File .\scripts\agent-matrix.ps1`

Outputs:
- `docs/reports/agent-matrix-latest.md`
- `docs/reports/agent-matrix-latest.json`

## 7) Checklist demo (kịch bản 5 phút)

- Case 1 (Triage): “Minh bi dau nguc va kho tho…” → `agent_profile=triage` + action điều hướng/báo khẩn.
- Case 2 (Thuốc): “ibuprofen + paracetamol…” → `agent_profile=medication` + `ask_navigation tra-cuu`.
- Case 3 (Kế hoạch): “Lap ke hoach theo doi huyet ap 2 tuan” → `agent_profile=care_plan` + `ask_navigation ke-hoach`.
- Case 4 (Tâm lý): “Minh lo au, mat ngu…” → `agent_profile=therapy` + `ask_navigation tri-lieu`.
- Case 5 (Graph): hỏi “Tram cam” và bật tool → agent gọi `graph.evidence` và trích quan hệ demo (HAS_SYMPTOM/TREATED_BY).
