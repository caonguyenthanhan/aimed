# AGENT LIVE FIX PLAN — Khắc phục lỗi trên Vercel live

> Mục tiêu: agent chạy ổn định end-to-end trên `aimed-one.vercel.app/tu-van`, không còn lỗi LangGraph, graph state nhất quán.
> Cơ sở: đã đọc code thật, không phỏng đoán.

## 1. LỖI GHI NHẬN (từ live test 2026-06-13)
| ID | Lỗi | Mức độ |
|---|---|---|
| L1 | "gặp sự cố khi chạy LangGraph" — exception bị nuốt, chỉ lưu `metadata.error`, UI không hiện | CRITICAL |
| L2 | Graph state lệch: header `ok` nhưng response `tắt` | HIGH |
| L3 | `Xem context` disable khi agent fail | MEDIUM |
| L4 | Sidebar `Không kết nối được` dù header graph ok | MEDIUM |

## 2. ROOT CAUSE (xác nhận từ code)
- **L1**: `server.py` L1517-L1531 — `except Exception as e` trả message tĩnh, `metadata.error = str(e)[:400]` nhưng UI không render `metadata.error`. Không biết exception thật là gì.
  - Nghi ngờ exception đến từ thay đổi mới trong `runtime.py` (đọc `out.get("tool_results")`) hoặc `graph.py` (auto-inject `graph.evidence`) — chưa được test qua đường Vercel→ngrok.
- **L2**: header poll `graph.status` (OK) nhưng `graph_injected` trong response do `runtime.py` build — nếu LangGraph fail trước khi tới `runtime.py` return, llm_context không có → UI hiện "tắt".
- **L3**: context panel chỉ enable khi có `llm_context`; agent fail → không có context.
- **L4**: sidebar dùng nguồn trạng thái khác header, chưa re-sync.

## 3. NGUYÊN TẮC
- Lộ lỗi thật trước (observability), KHÔNG vá mù.
- Không phá flow local đang chạy đúng (đã verify `graph_injected: True`).
- Sửa nhỏ, test lại từng bước qua đường Vercel→ngrok.

## 4. KẾ HOẠCH THỰC THI

### PHASE 1 — Lộ lỗi thật (observability, ưu tiên cao nhất)
- [ ] P1.1: `server.py` L1517 — log full traceback (`traceback.format_exc()`) vào `runtime-events.jsonl`, không chỉ `str(e)[:400]`.
- [ ] P1.2: Giữ `metadata.error` + thêm `metadata.error_type` (tên class exception) để phân loại.
- [ ] P1.3: UI `chat-interface.tsx` — khi `metadata.fallback === "langgraph_failed"`, hiển thị `metadata.error` ở context panel/diagnostic block (đã có cơ chế từ fix trước).

### PHASE 2 — Reproduce lỗi qua đường ngrok
- [ ] P2.1: Gọi trực tiếp ngrok URL `/v1/agent-chat` từ máy local bằng Python (giống Vercel gọi) để bắt traceback thật.
- [ ] P2.2: So sánh: gọi `localhost:8000/v1/agent-chat` (PASS) vs ngrok URL (FAIL?) để khoanh vùng do ngrok hay do code.
- [ ] P2.3: Đọc `runtime-events.jsonl` mới nhất lấy error thật.

### PHASE 3 — Sửa nguyên nhân gốc L1
- [ ] P3.1: Nếu lỗi do `runtime.py` (key `tool_results` không tồn tại trong `out`) → bọc try/except an toàn, default `{}`.
- [ ] P3.2: Nếu lỗi do timeout ngrok/Vercel → tăng timeout phía Next.js proxy hoặc giảm thời gian LangGraph (cache, giảm tool calls).
- [ ] P3.3: Nếu lỗi do FOZA call trong LangGraph → đồng bộ env FOZA giữa local và CPU server.

### PHASE 4 — Đồng bộ graph/context state (L2, L3)
- [ ] P4.1: Đảm bảo `runtime.py` luôn return `llm_context` kể cả khi tool fail (đã làm 1 phần).
- [ ] P4.2: UI: chỉ hiện "graph: tắt" khi thực sự `graph_injected=false` AND `graph.status` down; nếu lệch thì ưu tiên `graph.status`.
- [ ] P4.3: Enable `Xem context` ngay cả khi agent fail (hiện `metadata.error`).

### PHASE 5 — Đồng bộ sidebar (L4)
- [ ] P5.1: Tìm nguồn state sidebar "Không kết nối được", re-sync với `graph.status` poll.

### PHASE 6 — Verify live
- [ ] P6.1: Test lại ca "sốt nhẹ, đau họng" + ca "đau ngực" qua browser subagent.
- [ ] P6.2: PASS khi: agent trả tư vấn y tế, graph state nhất quán, context xem được.
- [ ] P6.3: Cập nhật Memory Bank.

## 5. THỨ TỰ ƯU TIÊN
1. PHASE 1 + 2 (lộ + reproduce lỗi thật) — BẮT BUỘC trước.
2. PHASE 3 (sửa root cause LangGraph).
3. PHASE 4 (graph/context state).
4. PHASE 5 (sidebar).
5. PHASE 6 (verify + memory bank).

## 6. FILES SẼ ĐỘNG
- `cpu_server/server.py` — log traceback, error_type.
- `cpu_server/langgraph_agent/runtime.py` — guard tool_results, đảm bảo llm_context.
- `medical-consultation-app/components/chat-interface.tsx` — hiển thị error, đồng bộ graph badge, enable context.
- Memory Bank: `activeContext.md`, `progress.md`, `00_logic.md`.

## 7. LƯU Ý QUAN TRỌNG
- Local đã chạy đúng (`graph_injected: True`, FOZA OK). Lỗi CHỈ xuất hiện qua đường Vercel→ngrok → nghi ngờ cao nhất là **timeout** hoặc **env khác biệt** giữa tiến trình CPU server hiện tại và code mới (CPU server cần restart để load code `runtime.py`/`graph.py` mới nhất).
- KIỂM TRA ĐẦU TIÊN: CPU server đang chạy có phải bản code mới nhất không (đã restart sau khi sửa runtime.py chưa).
