# vLLM self-host (OpenAI-compatible) cho Agent

## Mục tiêu

- Chạy một GPU endpoint tự host theo chuẩn OpenAI-compatible (`/v1/chat/completions`) để `/api/agent-chat` có thể gọi như “openai_like” provider.
- Giữ nguyên contract `{ response, actions, metadata }` ở gateway; chỉ thay provider backend.

## Contract cần đáp ứng

### 1) LLM endpoint

- URL: `http(s)://<host>:<port>/v1/chat/completions`
- Input: OpenAI chat format (`{ model, messages, temperature, ... }`)
- Output: `choices[0].message.content` phải chứa 1 JSON parse được theo schema:

```json
{
  "response": "string",
  "actions": [
    { "type": "navigate", "args": { "path": "/..." } },
    { "type": "speak", "args": { "text": "..." } }
  ]
}
```

Gateway local provider đã inject system prompt + allowlist, nên model chỉ cần tuân thủ output JSON.

### 2) Agent profiles

- UI gửi `agent_id` (default/medication/care_plan).
- Gateway inject persona tương ứng vào system prompt khi gọi OpenAI-compatible endpoint.

## Cách chạy vLLM (định hướng)

### Option A: vllm-openai (khuyến nghị)

- Chạy `vllm serve` với OpenAI-compatible API.
- Bảo đảm expose `/v1/chat/completions`.

Ví dụ (tham khảo, cần điều chỉnh theo môi trường GPU/model):

```bash
python -m vllm.entrypoints.openai.api_server --host 0.0.0.0 --port 8001 --model <your_model_id>
```

### Option B: Docker/WSL2

- Windows nên chạy vLLM qua WSL2 hoặc Docker + NVIDIA Container Toolkit.

## Kết nối vào app (SSOT)

### 1) Chỉ định GPU URL theo SSOT

- SSOT: `medical-consultation-app/data/runtime-mode.json`
- Có thể set bằng API:
  - `POST /api/runtime/mode` với `{ target: "gpu", gpu_url: "http://<host>:8001" }`

`/api/agent-chat` sẽ dùng:

- `gpu_url` trong `runtime-mode.json`, hoặc
- server registry `data/server-registry.json` (latest active), hoặc
- env fallback `GPU_SERVER_URL` / `DEFAULT_GPU_URL`.

### 2) Đưa vLLM host vào server registry (tuỳ chọn)

- `POST /api/servers` để thêm server `{ url, status: "active" }`.
- UI compute-toggle sẽ lấy server “latest active” để đổi mode.

## Smoke test nhanh

- Bật Agent mode trong `/tu-van`.
- Chọn profile:
  - “Thuốc & Tương tác”: hỏi “paracetamol tương tác gì?”
  - “Kế hoạch chăm sóc”: hỏi “lập kế hoạch theo dõi huyết áp 7 ngày”
- Quan sát:
  - `metadata.provider` là `openai_like` khi gọi vLLM.
  - `metadata.agent_profile` đúng với profile đã chọn.

