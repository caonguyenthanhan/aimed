# Tài liệu luận văn (cực chi tiết): Thiết kế Multi-Agent cho Hệ thống Trợ lý Y tế & Tâm lý (GraphRAG + Function Calling trên Llama/vLLM)

## 0) Mục đích tài liệu

Tài liệu này mô tả chi tiết phần **Multi-Agent** của hệ thống “Trợ lý Y tế & Tâm lý Đa tác tử” trong bối cảnh ứng dụng hiện có. Nội dung được trình bày theo kiểu “chương luận văn” và có thể dùng trực tiếp để viết phần thiết kế/kiến trúc, bao gồm:

- Lý do chọn Multi-Agent trong bài toán tư vấn y tế/tâm lý.
- Mô hình tác tử (agent roles), cơ chế điều phối (orchestrator).
- Giao thức trao đổi nội bộ, cách quản lý trạng thái/memory.
- Cách tích hợp Function Calling (Gemini và Llama/vLLM OpenAI-compatible).
- Cách kết nối GraphRAG (Retrieval Agent + citation/evidence contract).
- Quy tắc an toàn (safety) và cơ chế fallback GPU/CPU.
- Chiến lược đánh giá (evaluation) và quan sát hệ thống (observability).

Tài liệu không yêu cầu bạn phải dùng LangGraph; hệ thống hiện tại theo hướng “single orchestrator” + tool registry, và Multi-Agent được thiết kế theo “role-based agents” có thể chạy trong một hoặc nhiều vòng suy luận.

## 1) Bối cảnh hệ thống hiện tại (baseline)

### 1.1. Kiến trúc ứng dụng (tóm tắt)

Hệ thống gồm:

- **Frontend (Next.js)**: UI chat tư vấn, có “Agent mode” và có cơ chế thực thi actions an toàn (allowlist).
- **Backend Gateway (Next.js API routes)**: endpoint `/api/agent-chat` thực hiện routing GPU/CPU, gọi LLM, parse kết quả, trả contract chuẩn `{ response, actions, metadata }`.
- **Tool layer (MCP-lite)**: một số tools web/youtube được triển khai server-side và agent có thể “gọi tool” để lấy dữ liệu.
- **Chế độ runtime hybrid**: sử dụng SSOT `runtime-mode.json` để chọn target `gpu/cpu`, có fallback và ghi logs.

Các module code liên quan:

- Entry API agent: [route.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/api/agent-chat/route.ts)
- Tool schema cho Gemini function calling: [agent-tools.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts)
- Adapter local OpenAI-compatible (phù hợp Llama/vLLM): [agent-local-provider.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-local-provider.ts)
- Pattern contract và allowlist: xem docs [systemPatterns.md](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/docs/systemPatterns.md)

### 1.2. Contract giữa backend và frontend (điểm “xương sống”)

Hệ thống chuẩn hoá contract trả về:

```json
{
  "response": "Nội dung trả lời cho người dùng",
  "actions": [
    { "type": "navigate", "args": { "path": "/sang-loc" } }
  ],
  "metadata": {
    "mode": "gpu",
    "provider": "local|gemini",
    "..." : "..."
  }
}
```

Trong đó:

- `response`: text cho UI hiển thị.
- `actions`: danh sách hành động mà UI có thể thực thi (đã normalize + enforce allowlist).
- `metadata`: các thông tin runtime (cpu/gpu, provider, telemetry…).

Điểm quan trọng cho luận văn:

- Contract này giúp tách **“suy luận (LLM)”** khỏi **“thực thi (UI)”** theo nguyên tắc **policy enforcement**: agent chỉ “đề xuất”, UI chỉ “thực thi nếu hợp lệ”.
- Nó tạo tiền đề để nâng từ “single agent” lên “multi-agent”, vì dù nội bộ có bao nhiêu agent, đầu ra cuối vẫn là `{response, actions, metadata}`.

### 1.3. Function calling hiện tại

Hệ thống có 2 hướng:

1) **Gemini native function calling** (declarations trong [agent-tools.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts)):
   - Tools: `navigate`, `embed`, `ask_navigation`, `play_music`, `recommend_music`, `speak`, và một số legacy tools.
2) **Local LLM OpenAI-compatible**:
   - Adapter [runLocalAgent](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-local-provider.ts#L46-L137) ép model trả về **JSON duy nhất** có schema `{ response, actions }`.
   - Có allowlist trong system prompt để giảm rủi ro “bẻ luật”.

Trong luận văn, đây là phần quan trọng để chứng minh hệ thống có thể:

- “Tool/Function calling” thống nhất theo schema.
- Chạy hybrid (GPU/CPU) và có fallback.
- Không phụ thuộc vào một provider (Gemini vs Llama/vLLM).

## 2) Vì sao Multi-Agent phù hợp bài toán tư vấn y tế & tâm lý

### 2.1. Đặc thù bài toán y tế

Tư vấn y tế có nhiều ràng buộc:

- **Safety-critical**: sai lệch có thể gây hại.
- **Không được chẩn đoán chắc chắn** khi thiếu dữ kiện.
- **Nhiều ngữ cảnh**: triệu chứng, tiền sử, thuốc đang dùng, chống chỉ định, tương tác…
- **Cần “giải thích có nguồn”** (đặc biệt khi dùng GraphRAG) để giảm ảo giác.

Nếu dùng single-agent “một phát trả lời”, thường gặp:

- lẫn lộn ưu tiên (triage vs giải thích vs hỏi thêm),
- thiếu kiểm tra chéo (self-verification),
- khó kiểm soát policy và hành động.

### 2.2. Đặc thù bài toán tâm lý

Tư vấn tâm lý cần:

- giao tiếp hỗ trợ (empathy, active listening),
- sàng lọc nguy cơ tự hại/hại người,
- can thiệp phù hợp mức độ khẩn (SOS),
- tránh kích hoạt nội dung nhạy cảm.

Multi-Agent giúp tách rõ:

- agent “hỗ trợ” (support style) khác agent “kiểm tra rủi ro” (risk assessment),
- agent “safety review” ở bước cuối có quyền veto.

### 2.3. Lợi ích Multi-Agent (tổng hợp)

- **Phân vai rõ ràng**: mỗi agent có mục tiêu/biên trách nhiệm.
- **Kiểm tra chéo**: safety agent hoặc verifier agent giảm rủi ro.
- **Tăng khả năng mở rộng**: thêm agent mới (GraphRAG, Web search, Triage) mà không phá contract cuối.
- **Tăng tính tái sử dụng**: prompt, tool schema, rubric đánh giá theo agent.

## 3) Thiết kế Multi-Agent: nguyên tắc & mục tiêu

### 3.1. Nguyên tắc thiết kế (design principles)

1) **Single output contract**: Dù nội bộ multi-agent, đầu ra cuối vẫn `{response, actions, metadata}` để UI ổn định.
2) **Policy-first**: action allowlist và safety enforcement nằm ở server/UI, không “tin” agent tuyệt đối.
3) **Retrieval before generation**: câu hỏi factual ưu tiên gọi Retrieval Agent để có evidence.
4) **Separation of concerns**:
   - Triage (phân loại mức độ khẩn),
   - Retrieval (GraphRAG/web),
   - Synthesis (tổng hợp trả lời),
   - Safety/Compliance (rà soát cuối),
   - UX Actions (điều hướng/nhúng/tương tác).
5) **Hybrid runtime**: ưu tiên GPU, fallback CPU mượt; metadata phản ánh mode.
6) **Observability**: log event/metric cho từng bước để phục vụ đánh giá và debug.

### 3.2. Mục tiêu kỹ thuật (thesis-oriented)

Bạn có thể ghi trong luận văn các mục tiêu:

- M1: Thiết kế mô hình Multi-Agent cho tư vấn y tế/tâm lý có kiểm soát safety.
- M2: Chuẩn hoá Function Calling để tác tử có thể gọi tools và UI actions.
- M3: Kết hợp GraphRAG: truy xuất bằng chứng (evidence) từ graph và đưa vào trả lời.
- M4: Triển khai hybrid GPU/CPU với fallback, đảm bảo độ sẵn sàng.
- M5: Định nghĩa thước đo đánh giá (accuracy, groundedness, safety, latency, UX success).

## 4) Kiến trúc Multi-Agent đề xuất (logical architecture)

### 4.1. Tổng quan luồng xử lý

Một vòng xử lý (one “turn”) có thể mô tả như sau:

1) **Input Normalization**: lấy message + history + context UI.
2) **Safety Pre-check**: chặn nội dung nguy hiểm ngay từ đầu (rule-based/regex/PII scan).
3) **Triage Agent**: phân loại:
   - Y tế: mức độ khẩn, cần hỏi thêm gì.
   - Tâm lý: nguy cơ tự hại/hại người, khuyến nghị hỗ trợ khẩn.
4) **Routing (Planner/Orchestrator)**: quyết định pipeline:
   - Có cần Retrieval không?
   - Có gọi tool nào (web/youtube/graph) không?
   - Có cần action điều hướng/nhúng không?
5) **Retrieval Agent (GraphRAG/Web)**: lấy evidence bundle.
6) **Answer Synthesis Agent**: viết câu trả lời dựa trên evidence + guidelines.
7) **Safety/Compliance Agent (Post-check)**:
   - kiểm tra tính an toàn,
   - kiểm tra citation (không bịa nguồn),
   - loại bỏ khuyến nghị kê đơn/điều trị nguy hiểm.
8) **Action Normalization + Allowlist**: lọc actions, ép schema.
9) **Persist + Emit**: ghi events/metrics, lưu hội thoại nếu cần, trả `{response, actions, metadata}`.

Điểm quan trọng để trình bày trong luận văn:

- Multi-Agent không nhất thiết “nhiều model khác nhau”; có thể dùng **cùng một model** nhưng **nhiều prompt khác nhau** (role-based).
- Orchestrator có thể chạy “sequential” (tuần tự) hoặc “iterative” (nhiều vòng) tuỳ độ phức tạp.

### 4.2. Định nghĩa vai trò tác tử (agent roles)

#### 4.2.1. Orchestrator Agent (điều phối trung tâm)

Trách nhiệm:

- Quyết định agent nào chạy trước/sau.
- Quyết định có gọi tool không.
- Kết hợp kết quả, tạo output cuối.

Đầu vào:

- user message, conversation history.
- runtime mode (cpu/gpu), user tier, category.
- allowlist paths, tool registry.

Đầu ra:

- “plan” nội bộ (không nhất thiết trả về UI): danh sách bước.
- quyết định `actions` (navigate/embed/ask_navigation…).

Gợi ý mô tả thuật toán điều phối (pseudo):

1) run pre-safety
2) triage
3) if factual_question or needs_sources: retrieval
4) synthesize answer
5) safety-review
6) finalize response/actions/metadata

#### 4.2.2. Medical Triage Agent (phân loại y tế)

Mục tiêu:

- Xác định mức độ khẩn: “có cần cấp cứu/đi khám ngay không?”
- Xác định thiếu dữ kiện: cần hỏi thêm (tuổi, triệu chứng, thuốc đang dùng…).
- Đưa ra lời khuyên an toàn: không chẩn đoán, khuyến nghị khám.

Output gợi ý (structured):

```json
{
  "urgency": "emergency|urgent|routine|unknown",
  "risk_flags": ["chest_pain", "shortness_of_breath"],
  "missing_info_questions": ["Bạn bao nhiêu tuổi?", "Triệu chứng kéo dài bao lâu?"],
  "suggested_next": ["recommend_screening", "recommend_doctor_visit"]
}
```

#### 4.2.3. Psychological Support Agent (hỗ trợ tâm lý)

Mục tiêu:

- Duy trì phong cách giao tiếp hỗ trợ.
- Nếu phát hiện dấu hiệu tự hại/hại người → kích hoạt luồng SOS.
- Đề xuất bài tập thở/grounding đơn giản, hoặc điều hướng tính năng phù hợp (trị liệu, nhạc).

Output gợi ý:

```json
{
  "style": "empathetic|neutral",
  "risk_level": "high|medium|low",
  "support_steps": ["breathing_exercise", "grounding_5_4_3_2_1"],
  "recommended_actions": [
    { "type": "recommend_music", "args": { "mood": "calm" } }
  ]
}
```

#### 4.2.4. Graph Retrieval Agent (GraphRAG)

Mục tiêu:

- Nhận câu hỏi và trích entity mentions/candidates.
- Gọi tools truy vấn graph (do nhóm khác đảm nhiệm DB cụ thể), trả về evidence.
- Không tự “sáng tác”; chỉ trả evidence có provenance.

Output gợi ý:

```json
{
  "entities": [
    { "id": 324992, "name": "hen phế quản", "labels": ["Entity","BỆNH_LÝ"], "collection": "benh" }
  ],
  "evidence_edges": [
    { "from": "hen phế quản", "rel": "BIẾN_CHỨNG", "to": "viêm cơ tim", "id_doc": 1645, "id_chunk": "ee3510eb", "collection": "benh" }
  ],
  "sources": [
    { "src": "Cúm mùa: Triệu chứng. nguyên nhân và cách phòng ngừa", "id_doc": 1645, "collection": "benh" }
  ]
}
```

Trong hệ thống hiện có, provenance kiểu này khớp với dữ liệu export CypherL (id_doc/id_chunk/src/collection).

#### 4.2.5. Safety/Compliance Agent (kiểm duyệt cuối)

Mục tiêu:

- Kiểm tra câu trả lời có:
  - kê đơn/khuyến nghị nguy hiểm,
  - lời khuyên vượt thẩm quyền,
  - nội dung kích hoạt tự hại,
  - “bịa nguồn” (citation hallucination).
- Có quyền sửa câu trả lời hoặc yêu cầu Orchestrator “regenerate with constraints”.

Output gợi ý:

```json
{
  "safe": true,
  "violations": [],
  "required_disclaimer": "Đây không phải chẩn đoán...",
  "redactions": [],
  "actions_allowed": true
}
```

### 4.3. Multi-Agent topology: Sequential vs Hierarchical

Trong luận văn, bạn có thể mô tả 2 topology:

1) **Sequential pipeline** (phù hợp hệ hiện tại):
   - Orchestrator gọi Triage → Retrieval → Synthesis → Safety.
2) **Hierarchical**:
   - Orchestrator (manager) phân nhiệm cho “worker agents”, mỗi worker trả structured output.
   - Manager hợp nhất và quyết định actions.

Ưu điểm sequential:

- Dễ debug, dễ log theo step.
- Dễ đảm bảo policy enforcement.

## 5) Giao thức giao tiếp nội bộ (Internal Agent Protocol)

### 5.1. Tại sao cần protocol

Multi-Agent cần một cách chuẩn hoá trao đổi:

- giảm “lẫn lộn format” giữa agent,
- cho phép Orchestrator parse được output,
- thuận lợi cho evaluation (so sánh theo field).

### 5.2. Chuẩn hoá output theo “structured JSON”

Khuyến nghị:

- Mỗi agent nội bộ trả JSON theo schema riêng (không markdown).
- Orchestrator là nơi hợp nhất.

Ví dụ: “AgentResult envelope” (không nhất thiết implement ngay, nhưng dùng cho luận văn):

```json
{
  "agent": "medical_triage",
  "ok": true,
  "result": { "...": "..." },
  "meta": { "latency_ms": 1234, "provider": "gpu", "model": "..." }
}
```

### 5.3. Hợp nhất kết quả (result merging)

Nguyên tắc hợp nhất:

- Triage tạo “ràng buộc”: nếu `urgency=emergency` → response bắt buộc có khuyến cáo cấp cứu và actions không được điều hướng lan man.
- Retrieval cung cấp evidence: Synthesis chỉ được dùng facts có evidence (hoặc phải nói rõ “chưa đủ thông tin”).
- Safety có quyền override response và chặn actions.

## 6) Quản lý trạng thái & memory

### 6.1. Các loại “memory”

Trong hệ chat, có 4 loại thông tin:

1) **Conversation history**: tin nhắn user/assistant.
2) **Session state**: mode cpu/gpu, category friend/consultation, tier…
3) **Tool state**: kết quả gọi tool trong turn hiện tại.
4) **Long-term memory** (tuỳ chọn): hồ sơ người dùng, thói quen, bệnh sử (nếu có).

Trong hệ thống hiện tại, “state” chủ yếu nằm ở request body + persistence layer, còn “runtime mode” nằm trong file SSOT.

### 6.2. Memory trong Multi-Agent (đề xuất viết luận)

Bạn có thể mô tả memory như sau:

- Orchestrator nhận:
  - `history` (rút gọn theo token budget),
  - “patient summary” (nếu có module tóm tắt),
  - “risk flags” từ triage,
  - “evidence bundle” từ retrieval.
- Worker agents không cần full history, chỉ cần:
  - triage: 1–3 turn gần nhất,
  - retrieval: query + entity hints,
  - safety: response draft + evidence list.

Lợi ích:

- giảm token,
- giảm nguy cơ leakage,
- tăng kiểm soát.

### 6.3. Kỹ thuật giảm token & tăng ổn định

Trong luận văn, bạn có thể nêu:

- “history windowing”: chỉ lấy N turn gần nhất.
- “summary memory”: tóm tắt hội thoại định kỳ.
- “evidence-first”: đưa evidence vào prompt thay vì toàn bộ tài liệu.

## 7) Function Calling & Tools trong Multi-Agent

### 7.1. Tool taxonomy: UI actions vs Data tools

Nên chia tools thành 2 nhóm:

1) **UI actions** (được frontend thực thi):
   - `navigate`, `embed`, `ask_navigation`, `play_music`, `recommend_music`, `speak`.
2) **Data tools** (server-side):
   - `web.search`, `youtube.search`, `graph.query`, `graph.search`…

Trong hệ hiện tại, UI actions đã có schema rõ trong [agent-tools.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts).

### 7.2. Gemini function calling (hiện có)

Gemini nhận `functionDeclarations`, trả về tool calls → backend chuyển thành actions bằng `toolCallsToActions`:

- Chỗ khai báo: [geminiToolDeclarations](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts#L8-L150)
- Chỗ convert tool call → action: [toolCallsToActions](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts#L152-L257)

### 7.3. Llama/vLLM function calling (OpenAI-compatible) trong hệ này

Do vLLM phục vụ API kiểu OpenAI `/v1/chat/completions`, có 2 chiến lược:

1) **JSON-only contract** (đang dùng trong [agent-local-provider.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-local-provider.ts)):
   - system prompt yêu cầu trả “một JSON object duy nhất” với keys `response/actions`.
   - tool calling được mô hình hoá thành `actions`.
2) **OpenAI tool calling native** (nếu vLLM/model hỗ trợ):
   - dùng `tools` schema, parse `tool_calls`.
   - vẫn convert sang `actions` và allowlist.

Trong luận văn, bạn có thể chọn mô tả (1) như baseline vì:

- dễ triển khai,
- ít phụ thuộc model/tool-calling feature,
- kiểm soát format bằng schema parse.

### 7.4. Đề xuất schema tools cho GraphRAG trong Multi-Agent

Bạn có thể đưa vào luận văn 2 tools cơ bản:

- `graph.search_entities(q, collection?)`
- `graph.get_evidence(center_ids, depth=1, rel_allowlist?)`

Và một “citation contract” tối thiểu:

```json
{
  "evidence_edges": [
    {
      "from": "string",
      "rel": "string",
      "to": "string",
      "provenance": {
        "collection": "benh|thuoc",
        "id_doc": 123,
        "id_chunk": "abcd1234",
        "src": "title"
      }
    }
  ]
}
```

## 8) Cơ chế an toàn (Safety) trong Multi-Agent

### 8.1. Lớp an toàn nhiều tầng (multi-layer safety)

Trong luận văn, nên trình bày safety theo 3 tầng:

1) **Pre-check (rule-based)**:
   - chặn nội dung rõ ràng nguy hiểm, PII, prompt injection thô.
2) **Model-level constraints**:
   - system prompt: không kê đơn, không chẩn đoán chắc chắn.
   - allowlist actions paths trong prompt.
3) **Post-check (Safety agent + enforcement)**:
   - Safety agent rà soát.
   - Backend/UI enforce allowlist, schema validation.

### 8.2. Luồng SOS (tâm lý/khẩn cấp)

Luồng SOS là điểm phải có trong tư vấn tâm lý.

Khuyến nghị mô tả:

- Nếu Psychological Agent hoặc rule-based detect `risk_level=high`:
  - response ưu tiên khuyến cáo liên hệ người thân/cơ sở y tế,
  - cung cấp hotline khẩn cấp theo địa phương (nếu có),
  - hạn chế actions sang nội dung khác.

### 8.3. Kiểm soát action và điều hướng

Actions phải:

- tuân schema,
- path thuộc allowlist,
- không thực thi tự động khi “chưa xin phép” (đã có tool `ask_navigation`).

Điểm này có thể trích dẫn từ mô tả tool `ask_navigation` trong [agent-tools.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/agent-tools.ts#L44-L68).

## 9) Hybrid GPU/CPU & Fallback (độ sẵn sàng hệ thống)

### 9.1. Lý do cần hybrid

- GPU: latency tốt, model mạnh.
- CPU/local: fallback khi GPU host down, giảm phụ thuộc mạng.

### 9.2. SSOT runtime-mode.json

Hệ hiện tại đọc SSOT để quyết định target mode (cpu/gpu) và chọn base URL, xem logic trong [route.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/api/agent-chat/route.ts#L48-L79).

Trong luận văn, bạn có thể mô tả:

- SSOT đảm bảo UI và backend “đồng bộ trạng thái runtime”.
- Khi fallback xảy ra, metadata trả về phản ánh mode để UI hiển thị.

### 9.3. Fallback strategy trong Multi-Agent

Đề xuất mô tả:

- Nếu GPU LLM fail:
  - Orchestrator chuyển provider sang CPU/local.
  - Ghi `runtime-events.jsonl` và `runtime-metrics.jsonl`.
- Nếu tool call fail:
  - Retrieval Agent trả evidence rỗng, Synthesis buộc phải nói “không tìm thấy nguồn”.

## 10) Đánh giá hệ Multi-Agent (Evaluation)

### 10.1. Tiêu chí đánh giá chính

Bạn có thể dùng 5 nhóm tiêu chí:

1) **Correctness (đúng về mặt logic)**:
   - câu trả lời không mâu thuẫn nội bộ.
2) **Groundedness (bám nguồn)**:
   - có evidence/citation khi trả lời factual.
   - không bịa `src/id_doc/id_chunk`.
3) **Safety & compliance**:
   - không kê đơn, không khuyến cáo nguy hiểm.
   - xử lý đúng tình huống SOS.
4) **Tool/action success**:
   - action hợp lệ (đúng allowlist).
   - UI thực thi được (navigate/embed…).
5) **Latency & stability**:
   - thời gian phản hồi,
   - tỉ lệ fallback,
   - tỉ lệ lỗi tool call.

### 10.2. Bộ kịch bản test (scenario-based)

Khuyến nghị trong luận văn liệt kê scenario:

- Y tế:
  - “đau ngực + khó thở” → emergency triage.
  - “uống thuốc X có tương tác với Y không?” → retrieval + safety.
- Tâm lý:
  - “mình muốn tự tử” → SOS flow.
  - “mình lo âu, khó ngủ” → support + recommend_music + breathing exercise.
- UX action:
  - “mở sàng lọc” → ask_navigation hoặc navigate `/sang-loc`.

### 10.3. Observability & logs (để chứng minh trong luận văn)

Trong hệ hiện tại đã có:

- event/metric logs ở `data/runtime-events.jsonl` và `data/runtime-metrics.jsonl` trong API agent.

Bạn có thể mô tả thêm:

- Mỗi step của orchestrator ghi:
  - `step_name`, `provider`, `latency_ms`, `ok/fail`.
- Với GraphRAG:
  - `evidence_count`, `unique_sources`, `collections`.

## 11) Hạn chế & hướng phát triển

### 11.1. Hạn chế hiện tại

- Chưa có “chunk text store” cho citation theo đoạn văn bản gốc (mới có id_doc/id_chunk/src).
- Label/relationship type trong graph có lỗi chuẩn hoá → cần canonicalization layer.
- Multi-Agent ở mức “conceptual + role-based”; nếu muốn “true parallel agents” cần tăng hạ tầng điều phối và cache.

### 11.2. Hướng phát triển

- Chuẩn hoá tool schema theo chuẩn OpenAI tools để dễ swap model.
- Thêm verifier agent kiểm tra chéo y khoa (rule-based + retrieval).
- Thêm memory module (patient summary) và privacy policy.

## 12) Phụ lục A: Liên kết tài liệu Graph (đã có)

- Báo cáo khám phá CypherL export (phục vụ GraphRAG phần graph): [REPORT_memgraph-export.cypherl.md](file:///d:/desktop/tlcn/medical%20consulting%20system/graph/REPORT_memgraph-export.cypherl.md)

