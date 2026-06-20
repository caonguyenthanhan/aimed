# SONNET CODING GUIDE — Sửa toàn bộ lỗi Agent

> Tài liệu này do Opus soạn để Sonnet thực thi code. Sonnet PHẢI đọc anchor cụ thể trước khi sửa, sửa surgical (≤300 dòng/lần), và verify sau mỗi phase.
> Tham chiếu plan tổng: `_workspace/AGENT_FIX_PLAN.md`.

## 0. BỐI CẢNH (đọc trước)
- File trung tâm: `medical-consultation-app/app/api/agent-chat/route.ts`
- File graph tool: `medical-consultation-app/app/api/mcp/call/route.ts`
- File UI: `medical-consultation-app/components/chat-interface.tsx`
- Provider priority (CHỐT): **FOZA → Gemini → CPU(openai_like) → GPU**
- Quy ước: comment chỉ giải thích "WHY", code/comment bằng English, không thêm docstring thừa.

## 1. ROOT CAUSE (đã xác nhận từ code, KHÔNG được sửa khác đi)
| ID | Mô tả | Anchor |
|---|---|---|
| BUG-1 | Proxy CPU `/v1/agent-chat` fail bị `catch {}` nuốt lỗi | `route.ts` ~L109-L113 |
| BUG-2 | Gemini fail (non-429) trả câu chung chung, UI không thấy `gemini_error` | `route.ts` ~L1360-L1373 |
| BUG-3 | `graph.evidence` gọi `127.0.0.1:8000` khi thiếu CPU_SERVER_URL → 404 trên live | `mcp/call/route.ts` ~L261-L262 |
| BUG-4 | `graph_injected=false` gộp mọi nguyên nhân, thiếu reason/status_code/endpoint | nhiều nhánh trả `llm_context` |

## 2. NGUYÊN TẮC BẮT BUỘC
1. KHÔNG đổi contract `{response, actions, metadata}`.
2. KHÔNG phá circuit breaker FOZA hiện có (`fozaCircuit`).
3. Mọi nhánh fail PHẢI gắn `root_cause` + đẩy vào `fallback_chain`.
4. Live thiếu CPU URL: graph degrade rõ ràng, KHÔNG gọi localhost.
5. Sửa từng phase, verify rồi mới sang phase sau.

## 3. PHASE 1 — Observability (làm trước tiên)

### Task 1.1 — Bỏ catch rỗng ở proxy CPU (BUG-1)
- Anchor: `route.ts` block proxy, đoạn `} catch {` ~L109-L113.
- Hiện tại:
```
} catch {
} finally {
  clearTimeout(t)
}
```
- Sửa thành: bắt error vào biến module-scope để dùng cho metadata sau:
```
} catch (e: any) {
  cpuProxyError = String(e?.message || e || "").slice(0, 200)
} finally {
  clearTimeout(t)
}
```
- Khai báo `let cpuProxyError: string | undefined` ở đầu hàm POST (gần `let rootCause`).
- LƯU Ý: proxy này nằm TRƯỚC orchestration nội bộ. Nếu proxy fail thì code chạy tiếp xuống FOZA/Gemini — giữ nguyên hành vi này, chỉ thêm ghi nhận lỗi.

### Task 1.2 — Helper phân loại lỗi graph (BUG-4)
- Thêm biến cạnh `graphInjected`: `let graphReason: string | undefined`, `let graphStatusCode: number | undefined`, `let graphEndpoint: string | undefined`.
- Tại block `graph.evidence` (~L491-L512), khi `out.result.ok === false` hoặc exception, set:
  - `graphReason` = một trong: `graph_disabled_no_cpu_url | graph_404 | graph_timeout | graph_down | graph_empty`.
  - `graphStatusCode`, `graphEndpoint` lấy từ `metadata.upstream` / error status trả về từ mcp/call.
- Khi `ent.length || edges.length` = 0 nhưng gọi OK → `graphReason = "graph_empty"`.

### Task 1.3 — Nhúng vào MỌI llm_context
- Tìm tất cả `llm_context: { ... graph_injected: graphInjected }` (FOZA, openai_like, gemini, fallback).
- Thêm 3 field: `graph_reason: graphReason, graph_status_code: graphStatusCode, graph_endpoint: graphEndpoint`.
- Thêm `cpu_proxy_error: cpuProxyError` và `gemini_error` (đã có ở vài nhánh) vào cấp `metadata` cho mọi nhánh trả về.

## 4. PHASE 2 — Graph degrade gracefully

### Task 2.1 — mcp/call: không gọi localhost trên production (BUG-3)
- Anchor: `mcp/call/route.ts` ~L261-L262.
- Hiện tại default `http://127.0.0.1:8000`.
- Sửa: tách rõ env và môi trường:
```
const cpuBaseRaw = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || "").trim().replace(/\/$/, "")
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
if (!cpuBaseRaw) {
  if (isProd) {
    return NextResponse.json({
      result: { ok: false, query: q, entities: [], edges: [], reason: "graph_disabled_no_cpu_url" },
      metadata: { tool: name, upstream: null, reason: "graph_disabled_no_cpu_url" },
    })
  }
}
const cpuBase = cpuBaseRaw || "http://127.0.0.1:8000"
```
- Áp dụng tương tự cho nhánh `graph.status`.

### Task 2.2 — Map status code → reason
- Khi `out.ok === false`: nếu `out.status === 404` → `reason: "graph_404"`; timeout/abort → `graph_timeout`; còn lại → `graph_down`.
- Trả `reason` + `status_code` trong cả `result` và `metadata` để agent-chat đọc lại.

## 5. PHASE 3 — Provider chain FOZA → Gemini → CPU → GPU

### Bối cảnh hiện tại (đã đọc code)
- `agentProvider` lấy từ body.provider hoặc `AGENT_PROVIDER` env (~L260-L263).
- Nếu `agentProvider === "foza"` → chạy nhánh FOZA (~L577+) có circuit breaker.
- Sau FOZA là `openai_like` (CPU/GPU) rồi `gemini`.
- VẤN ĐỀ: live đang rơi thẳng xuống Gemini và fail, vì FOZA không được chọn hoặc thiếu token/model.

### Task 3.1 — Chuẩn hóa thứ tự ưu tiên
- ĐẢM BẢO default priority khi `requestedProvider === "auto"`: thử **FOZA → Gemini → CPU → GPU**.
- Mỗi lần chuyển provider PHẢI: `fallbackChain.push("<provider>:<reason>")` và set `rootCause` lần fail đầu tiên.
- KHÔNG xóa circuit breaker; khi circuit open thì `fallbackChain.push("skip_foza")` (đã có) rồi sang Gemini.

### Task 3.2 — Gemini fail (BUG-2) giữ thông báo thân thiện + đính lỗi
- Anchor: `route.ts` ~L1360-L1373.
- Giữ câu "Mình gặp sự cố khi gọi agent (Gemini)..." NHƯNG:
  - đảm bảo `metadata.gemini_error` luôn có (đã có).
  - thêm `metadata.cpu_proxy_error` nếu CPU proxy cũng từng fail.
  - đảm bảo `fallback_chain` phản ánh: `["auto","foza:<reason>","gemini:<reason>","rule_based"]`.

### Task 3.3 — Fallback rule-based y tế an toàn (BUG-2 nâng cấp)
- Khi cả FOZA + Gemini + CPU/GPU đều fail → `ruleBasedActionsGuess()` hiện trả câu rỗng nghĩa.
- Nâng cấp `ensureAssistantText` fallback content: với intent triage/medication, trả khung an toàn có cấu trúc:
  - nhắc theo dõi triệu chứng, red flags cần đi khám, disclaimer.
  - KHÔNG chẩn đoán cụ thể (đúng guardrail y tế đã có ở `lib/medical-disclaimer.ts`).
- Đây là nội dung tĩnh an toàn, KHÔNG gọi LLM (vì mọi provider đã fail).

## 6. PHASE 4 — UI hiển thị lý do lỗi + rà profile

### Task 4.1 — Context panel hiển thị reason
- Anchor: `components/chat-interface.tsx`, panel "Context gửi cho LLM" (~L168-L208 đọc `ctx`).
- Thêm hiển thị (nếu có): `gemini_error`, `cpu_proxy_error`, `graph_reason`, `graph_status_code`, `graph_endpoint`.
- Badge graph (~L2240): map `graph_reason` → nhãn người đọc được:
  - `graph_disabled_no_cpu_url` → "graph: tắt (chưa cấu hình CPU)"
  - `graph_404` → "graph: lỗi 404"
  - `graph_timeout` → "graph: timeout"
  - `graph_empty` → "graph: không có dữ liệu"

### Task 4.2 — Rà profile routing
- Kiểm tra intent detection (triage/medication/plan/therapy/doctor_referral) chọn đúng profile.
- KHÔNG đổi logic nếu đang đúng; chỉ thêm test case nếu phát hiện sai.

## 7. PHASE 5 — Verify & Memory Bank

### Task 5.1 — Build + typecheck
```
cd medical-consultation-app
npm run build
```
- Sửa hết lỗi TypeScript do thêm field metadata.

### Task 5.2 — Smoke local
- Chạy `medical-consultation-app/smoke.ps1` (db ping, conversations, graph.status, agent-chat).
- Xác nhận agent-chat trả `metadata.fallback_chain` đúng và `graph_reason` rõ ràng.

### Task 5.3 — Reproduce kịch bản fail
- Gửi: "Tôi bị sốt nhẹ, đau họng và mệt 2 ngày nay. Tôi nên làm gì trước?"
- PASS khi: không còn câu fail chung chung mà có nội dung y tế an toàn HOẶC câu trả lời thật từ provider; context panel hiện reason rõ ràng.

### Task 5.4 — Cập nhật Memory Bank
- `docs/activeContext.md`: ghi trạng thái mới + next step.
- `docs/systemPatterns.md`: cập nhật pattern provider chain + graph degrade.
- `docs/progress.md`: append mục ngày 2026-06-12 (bugfix agent).
- `_workspace/00_logic.md`: cập nhật provider priority FOZA→Gemini→CPU→GPU + graph reason taxonomy.

## 8. DEFINITION OF DONE
- [ ] Không còn `catch {}` rỗng ở proxy CPU.
- [ ] `metadata` mọi nhánh có `fallback_chain`, `root_cause`, `gemini_error?`, `cpu_proxy_error?`.
- [ ] `llm_context` có `graph_reason/status_code/endpoint`.
- [ ] Live thiếu CPU URL → graph trả `graph_disabled_no_cpu_url`, KHÔNG gọi localhost.
- [ ] UI context panel hiển thị lý do lỗi.
- [ ] Fallback cuối là nội dung y tế an toàn, không phải câu rỗng.
- [ ] `npm run build` pass + smoke test pass.
- [ ] Memory Bank cập nhật.

## 9. CHECKPOINT BÁO CÁO (Sonnet phải làm)
Sau MỖI phase, báo: files changed, lý do, kết quả build/test. KHÔNG gộp 5 phase vào 1 lần commit.
