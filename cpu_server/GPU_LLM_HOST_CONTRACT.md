# GPU LLM Host (OpenAI-like) Contract

## Endpoint

`POST /v1/chat/completions`

## Request (tối thiểu)

```json
{
  "model": "vllm:hugging-quants/Meta-Llama-3.1-8B-Instruct-AWQ-INT4",
  "messages": [
    { "role": "system", "content": "Bạn là trợ lý kỹ sư." },
    { "role": "user", "content": "Câu hỏi của tôi ..." }
  ],
  "max_tokens": 400,
  "temperature": 0.3
}
```

## Headers (khuyến nghị)

- `Content-Type: application/json`
- `ngrok-skip-browser-warning: true` (nếu dùng ngrok free để tránh trang cảnh báo)
- `Authorization: <token>` (nếu GPU host có bảo vệ)

## Response (tối thiểu)

Hệ thống hiện tại chỉ cần đọc được nội dung tại:

```json
{
  "choices": [
    { "message": { "role": "assistant", "content": "..." } }
  ]
}
```

Ngoài ra, nếu GPU host trả về dạng khác (ví dụ `response`/`reply`) thì BE sẽ cố gắng trích xuất theo thứ tự:

1. `choices[0].message.content`
2. `response`
3. `reply`

## BE Adapter (đã có sẵn trong repo)

- Module: `cpu_server/gpu_llm_host.py`
- Hàm chính:
  - `post_openai_chat_completions(base_url, payload, auth, timeout)`
  - `build_openai_chat_payload(model, messages, max_tokens, temperature)`
  - `extract_openai_chat_content(data)`

## Lưu ý tích hợp

- GPU host chỉ là LLM host nên không yêu cầu endpoint phụ như `/v1/chat`, `/v1/friend-chat/completions`, `/gpu/metrics`.
- Fallback (CPU/Gemini) được xử lý ở lớp gateway (UI/CPU server), không phụ thuộc GPU host.
