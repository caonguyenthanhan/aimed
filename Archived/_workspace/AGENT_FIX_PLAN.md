# AGENT FIX PLAN — Sửa toàn bộ lỗi xoay quanh Agent

> Mục tiêu: Agent chạy ổn định end-to-end trên cả local lẫn live (Vercel), không còn lỗi "Mình gặp sự cố khi gọi agent (Gemini)" và `graph_injected=false` khi demo.

## 1. ROOT CAUSE (xác nhận từ code, không phỏng đoán)

### BUG-1 — Proxy CPU nuốt lỗi (silent fallback)
- File: `app/api/agent-chat/route.ts` (block proxy `/v1/agent-chat`).
- Khi proxy CPU thất bại, `catch {}` nuốt lỗi hoàn toàn → không log, không gắn `root_cause`.
- Hệ quả: rơi xuống Gemini mà không ai biết vì sao CPU fail.

### BUG-2 — Gemini fail trả thông báo chung chung
- File: `app/api/agent-chat/route.ts` (nhánh `if (!r)` sau `callGemini`).
- Khi Gemini lỗi (không phải 429) → trả "Mình gặp sự cố khi gọi agent (Gemini)".
- `gemini_error` có trong metadata nhưng UI không hiển thị → khó debug khi demo.

### BUG-3 — Graph evidence 404 trên live
- File: `app/api/mcp/call/route.ts` (`graph.evidence`).
- Mặc định `CPU_SERVER_URL` rỗng → gọi `http://127.0.0.1:8000/v1/graph/evidence`.
- Trên Vercel, localhost không tồn tại → 404 → `graphInjected` không bao giờ `true`.

### BUG-4 — Không phân loại lỗi graph
- `graph_injected=false` gộp chung mọi nguyên nhân: graph tắt, 404, timeout, evidence rỗng.
- Thiếu `graph_status_code`, `graph_endpoint`, `graph_reason` để chẩn đoán.

## 2. NGUYÊN TẮC SỬA
- Không che lỗi: mọi nhánh fail phải gắn `root_cause` + chi tiết.
- Fallback minh bạch: `fallback_chain` phải phản ánh đúng thực tế đã thử.
- Live an toàn: thiếu `CPU_SERVER_URL` thì graph phải "degrade gracefully" (tắt rõ ràng), không spam 404.
- UI nói thật: hiển thị lý do graph không inject + provider error tóm tắt.

## 3. KẾ HOẠCH THỰC THI (theo pha, làm tuần tự)

### PHASE 0 — Triage & Reproduce (chốt lỗi)
- [ ] P0.1: Kiểm tra `CPU_SERVER_URL` trên Vercel + `.env.local` (có/không, còn sống không).
- [ ] P0.2: Chạy smoke `graph.status` + `graph.evidence` trên live để chốt 404.
- [ ] P0.3: Bắt `gemini_error` thực tế từ metadata (đọc response JSON, không chỉ UI text).

### PHASE 1 — Quan sát được (Observability trước khi sửa)
- [ ] P1.1: Bỏ `catch {}` rỗng ở proxy CPU → log error + set biến `cpuProxyError`.
- [ ] P1.2: Thêm `graph_status_code`, `graph_endpoint`, `graph_reason` vào `metadata.llm_context`.
- [ ] P1.3: UI `/tu-van`: hiển thị tóm tắt `gemini_error` / `cpu_proxy_error` / `graph_reason` ở panel context (đã có nút "Xem context").

### PHASE 2 — Sửa Graph (BUG-3, BUG-4)
- [ ] P2.1: Nếu `CPU_SERVER_URL` rỗng trên production → KHÔNG gọi localhost; trả `graph: { ok:false, reason:"graph_disabled_no_cpu_url" }` (degrade rõ ràng, không 404 nhiễu).
- [ ] P2.2: Phân loại lỗi graph: `graph_down` | `graph_404` | `graph_timeout` | `graph_empty`.
- [ ] P2.3: Thêm endpoint/health rõ ràng cho graph (driver/bolt/dataset/latency) — chỉ khi có CPU URL.

### PHASE 3 — Sửa Provider chain (BUG-1, BUG-2)
- [ ] P3.1: Proxy CPU fail → ghi `root_cause="cpu_unreachable:<msg>"` vào fallback_chain trước khi xuống Gemini.
- [ ] P3.2: Gemini fail (non-429) → thông báo thân thiện NHƯNG vẫn đính `gemini_error` rút gọn cho UI.
- [ ] P3.3: Khi cả CPU + Gemini fail → fallback rule-based phải trả nội dung y tế an toàn có cấu trúc (không chỉ "thử lại").

### PHASE 4 — Skill / Profile Agent (sửa đúng skill)
- [ ] P4.1: Rà profile routing (triage/medication/plan/therapy/doctor_referral) — đảm bảo intent detection không chọn sai profile.
- [ ] P4.2: Khi thiếu graph evidence với profile rủi ro (triage/thuốc) → agent HỎI THÊM thông tin thay vì đoán (đúng guardrail đã có).
- [ ] P4.3: Chuẩn hóa action allowlist + speak/navigate để skill không sinh action ngoài luồng.

### PHASE 5 — Verify & Demo
- [ ] P5.1: Smoke test 1 lệnh cho live: db / agent-chat / graph.status / graph.evidence.
- [ ] P5.2: Chạy lại đúng kịch bản đã fail ("sốt nhẹ, đau họng, mệt 2 ngày").
- [ ] P5.3: Cập nhật Memory Bank (activeContext / systemPatterns / progress) + `00_logic.md`.

## 4. CONTRACT METADATA MỚI (chuẩn hóa)
```
metadata: {
  mode, provider,
  requested_provider, root_cause, fallback, fallback_chain,
  cpu_proxy_error?,            // BUG-1
  gemini_error?,               // BUG-2
  llm_context: {
    graph, graph_injected,
    graph_status_code?,        // BUG-4
    graph_endpoint?,           // BUG-4
    graph_reason?              // BUG-4: graph_down|graph_404|graph_timeout|graph_empty|graph_disabled_no_cpu_url
  }
}
```

## 5. THỨ TỰ ƯU TIÊN
1. PHASE 0 + 1 (nhìn thấy lỗi thật) — bắt buộc trước.
2. PHASE 3 (provider chain) — để agent không còn fail chung chung.
3. PHASE 2 (graph) — để demo grounding ổn định.
4. PHASE 4 (skill/profile) — nâng chất lượng.
5. PHASE 5 — verify + demo + memory bank.

## 6. FILES SẼ ĐỘNG TỚI
- `app/api/agent-chat/route.ts` — proxy log, fallback chain, metadata.
- `app/api/mcp/call/route.ts` — graph degrade + phân loại lỗi.
- `components/chat-interface.tsx` — hiển thị lý do lỗi ở context panel.
- `data/runtime-mode.json` / env — cấu hình CPU_SERVER_URL.
- `scripts/demo-smoke-vercel.ps1` — smoke verify.
- Memory Bank: `docs/activeContext.md`, `docs/systemPatterns.md`, `docs/progress.md`, `_workspace/00_logic.md`.
