# Graph (Memgraph export)

## Nội dung

- `memgraph-export.cypherl`: snapshot graph dạng CypherL (~92MB).
- `REPORT_memgraph-export.cypherl.md`: báo cáo schema + truy vấn gợi ý.

## Chạy nhanh (local)

1) Bật Docker Desktop.
2) Chạy CPU server launcher (script sẽ tự `docker compose up -d` và import graph vào Memgraph qua `mgconsole`):
   - `cpu_server/launcher/run_cpu_server_ngrok.py` (tuỳ chọn `--no-ngrok` nếu không cần public URL)
3) CPU server có API graph:
   - `GET /v1/graph/status`
   - `POST /v1/graph/evidence`

## Biến môi trường liên quan

- CPU server kết nối graph qua Bolt:
  - `GRAPH_BOLT_URL` (mặc định `bolt://127.0.0.1:7687`)
  - `GRAPH_USER`, `GRAPH_PASSWORD` (có thể để trống với Memgraph mặc định)
- Bảo vệ endpoint graph evidence (tuỳ chọn):
  - `GRAPH_API_KEY` (nếu set thì cần gửi header `x-api-key`)

