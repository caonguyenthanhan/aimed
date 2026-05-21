## Agent function calling (pattern)

- Contract ổn định giữa backend và frontend: API trả `{ response, actions, metadata }`, frontend chỉ thực thi action trong allowlist.
- Allowlist điều hướng lấy từ 1 nguồn SSOT (`ALLOWED_PATH_PREFIXES`) và được dùng đồng thời cho local-agent prompt và server enforcement.
- Tool calling ở Gemini được chuẩn hoá thành action `navigate` để frontend chỉ xử lý một kiểu điều hướng.
- Metadata `mode: cpu|gpu` được dùng để đồng bộ UI với runtime mode.
- Agent routing đọc `data/runtime-mode.json` (SSOT) để quyết định ưu tiên GPU/CPU và fallback; các chuyển mode được ghi vào `runtime-events.jsonl` và `runtime-metrics.jsonl`.
- Tool “server-side” được gom theo pattern mcp-lite: agent gọi tool name (web/youtube) → /api/mcp/call thực thi → trả kết quả về agent để tổng hợp phản hồi.
- Có thể mở rộng action dạng “tool nặng” (ví dụ `speak`) nhưng vẫn qua allowlist/schema.
- Các heuristic “forced actions” được điều khiển bằng env flag để tránh gây nhiễu luồng (mặc định tắt trong production).
- `recommend_music` có thể được hydrate bằng YouTube service (cache TTL) để trả danh sách đề xuất thực tế thay vì hardcode.
- Agent Profiles (persona routing): UI gửi `agent_id`, gateway inject persona vào Gemini/local provider và trả `metadata.agent_profile` để quan sát và debug theo profile.
- Provider portability: local provider giữ chuẩn OpenAI-compatible `/v1/chat/completions` + output JSON schema để dễ thay GPU endpoint sang vLLM self-host (vllm-openai).
- FOZA stability: giữ UI actions trong JSON-in-content `{response, actions}`; tool_calls chỉ dùng cho MCP tools (web/youtube) rồi luôn finalize bằng JSON để UI parse ổn định.
- Timeout policy: `/api/agent-chat` có env budgets/timeouts chung cho Gemini/OpenAI-like/MCP để tránh request treo và giữ fallback mượt.
