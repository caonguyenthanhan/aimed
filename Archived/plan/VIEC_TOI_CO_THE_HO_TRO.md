# Việc tôi có thể hỗ trợ bạn thực hiện (AI-assisted)

Tài liệu này liệt kê các hạng mục có thể làm trong repo bằng cách viết/sửa code, tạo script, chuẩn hoá cấu hình, thêm test, và hướng dẫn thao tác theo checklist.

## 1) Tự động hoá vận hành (CPU/GPU)

- Viết/hoàn thiện script chạy local CPU server + (tuỳ chọn) ngrok + (tuỳ chọn) graph stack, giảm thao tác tay. (Đã hoàn thành)
  - cpu_server/launcher/run_cpu_server_ngrok.py: tự start Memgraph docker compose + import nền + chạy CPU server/ngrok (one-click).
- Chuẩn hoá cấu hình SSOT (runtime-mode.json/server-registry.json) và đồng bộ UI ↔ runtime metadata theo rules của dự án.
- Tạo “healthcheck” endpoint, log chuẩn hoá, và script chẩn đoán nhanh (latency, fallback, quota…).

## 2) GraphRAG (Neo4j/Vector DB) trong codebase

- Viết/hoàn thiện pipeline ingest:
  - Chuẩn hoá dữ liệu → trích xuất entity/relation → export Cypher → import Neo4j/Memgraph
  - Mở rộng/chuẩn hoá script hiện có: cpu_server/scripts/ingest_vihealthqa_neo4j.py, graph/memgraph-export.cypherl
- Thêm backend endpoint cho truy vấn graph và wiring vào frontend/agent. (Đã hoàn thành)
  - CPU server: `/v1/graph/status`, `/v1/graph/evidence`
  - Next.js: MCP tools `graph.status`, `graph.evidence` gọi về CPU server
  - Agent mode: tự gọi `graph.evidence` và inject evidence vào prompt; trả `metadata.llm_context` để UI debug/demo
- UI: có nút xem “context gửi cho LLM” để demo hội đồng. (Đã hoàn thành)
- Tạo bộ truy vấn mẫu + bộ test hồi quy cho GraphRAG (Cypher + semantic retrieval), kèm dataset nhỏ để chạy offline.

## 3) Multi-agent orchestration (không/hoặc có LangGraph)

- Chuẩn hoá contract agent `{response, actions, metadata}` và mở rộng action schema theo allowlist (điều hướng, speak, mở module…).
- Viết thêm agent profiles/persona prompts, rule-based fallback, và test cho routing theo intent/profile.
- Nếu bạn muốn bám plan “LangGraph”: tôi có thể đề xuất kiến trúc, viết skeleton, và tích hợp dần vào API hiện có (giữ fallback).

## 4) Tooling & MCP

- Thiết kế/chuẩn hoá tool schema (inputs/outputs), gom “tool agents rời rạc” về 1 entrypoint, logging & metrics nhất quán.
- Tích hợp thêm tool mới (web/youtube/knowledge lookup/triage rules), có kiểm soát timeout và fallback.

## 5) Data engineering (không đụng secret)

- Viết script làm sạch dữ liệu, chuẩn hoá schema, detect trùng lặp, và xuất file phục vụ import/train.
- Viết bộ kiểm tra chất lượng dữ liệu (lint dữ liệu) và báo cáo (thống kê phân bố nhãn, coverage triệu chứng/bệnh/thuốc…).
- Tạo bộ prompt/regex để hỗ trợ ẩn PII (bạn duyệt cuối).

## 6) Test/QA/CI nội bộ

- Thêm unit/integration tests (mặc định skip test gọi LLM thật; bật bằng env), tăng độ ổn định trước demo.
- Viết kịch bản test E2E nhẹ (không cần browser) cho các API routes quan trọng.
- Chuẩn hoá lint/build để `next build`/FastAPI chạy ổn trong môi trường thiếu biến (theo pattern hiện có).

## 7) Tài liệu hoá & checklist

- Tạo checklist “chạy demo 5 phút”, “chạy demo 30 phút”, “chuẩn bị bảo vệ”, “A/B testing plan”.
- Chuyển plan master.md thành WBS có tiêu chí nghiệm thu (Definition of Done) cho từng hạng mục.
- Viết hướng dẫn thao tác tay dạng từng bước (đặc biệt: Colab/ngrok/HF) để bạn làm nhanh và ít sai.
