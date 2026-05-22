# ENV Guide (Local)

File môi trường thật dùng khi chạy local là `.env.local` và không được commit. Repo có sẵn file mẫu để copy:

- Copy: `.env.sample` → `.env.local`
- Điền các khóa (Gemini/Foza/YouTube/CSE/DB) theo nhu cầu

## 1) Hybrid routing (GPU/CPU)

- `GPU_SERVER_URL`: Base URL server GPU (OpenAI-like). Dùng khi runtime-mode chọn `gpu`. Ví dụ: `https://<ngrok>/v1`
- `CPU_SERVER_URL`: Base URL server CPU (FastAPI). Ví dụ: `http://localhost:8000`
- `BACKEND_URL`: Alias cho `CPU_SERVER_URL` (để tương thích một số route). Nếu để trống, hệ thống ưu tiên `CPU_SERVER_URL`.
- `DEFAULT_GPU_URL`: Fallback GPU URL khi runtime-mode không có `gpu_url` hoặc registry không khả dụng.

## 2) Provider selection

- `LLM_PROVIDER`: Provider cho chat thường (`/api/llm-chat`, `/api/tam-su-chat`, lookup). Giá trị hay dùng: `server` | `gemini` | `foza`
- `AGENT_PROVIDER`: Provider cho Agent mode (`/api/agent-chat`). Giá trị hay dùng: `gemini` | `foza` | `local`

## 3) OpenAI-compatible endpoints (local/vLLM/GPU/CPU)

- `INTERNAL_LLM_URL`: Override endpoint chat completions (OpenAI-like) cho `/api/llm-chat`.
- `INTERNAL_FRIEND_CHAT_URL`: Override endpoint friend-chat completions (OpenAI-like) cho `/api/tam-su-chat`.
- `LOCAL_AGENT_URL`: Endpoint OpenAI-like cho Agent (khi provider là `local` hoặc khi fallback).
- `LOCAL_AGENT_MODEL`: Model name gửi lên `LOCAL_AGENT_URL` (nếu server cần).
- `LOCAL_LLM_MODEL`: Model name cho nhánh local LLM (nếu dùng).
- `GPU_OPENAI_MODEL`, `GPU_LLM_MODEL`, `DEFAULT_GPU_MODEL`: Model names cho nhánh GPU/OpenAI-like (dùng khi routing sang GPU).

## 4) Gemini

- `GEMINI_API_KEY`: API key Gemini.
- `GEMINI_MODEL`: Model chat chính.
- `GEMINI_STT_MODEL`: Model speech-to-text.
- `GEMINI_TTS_MODEL`: Model text-to-speech.
- `GEMINI_TTS_VOICE`: Giọng TTS (ví dụ: `Kore`).
- `PROMPT_CONFIG_PATH`: Path tới `data/prompt-config.json` (mặc định: `data/prompt-config.json`).

## 5) FOZA (OpenAI-compatible cloud)

- `FOZA_BASE_URL`: Base URL (mặc định `https://api.foza.ai/v1`).
- `FOZA_TOKEN`: Bearer token.
- `LLM_MODEL_NAME`: Tên model Foza, ví dụ `cinb/gemini-3.1-flash-lite`.

### FOZA budgets/timeouts (Agent)

- `FOZA_TOOL_MAX_ROUNDS`: số vòng tool-calling tối đa trước khi ép finalize JSON.
- `FOZA_TOOL_MAX_CALLS`: số tool calls tối đa mỗi vòng (chỉ áp dụng cho MCP tools).
- `FOZA_REQUEST_TIMEOUT_MS`: timeout mỗi request gọi Foza.
- `FOZA_MCP_TOOL_TIMEOUT_MS`: timeout mỗi lần gọi `/api/mcp/call` khi Foza đang chạy.
- `FOZA_AGENT_TIMEOUT_MS`: deadline tổng cho 1 lượt `/api/agent-chat` khi dùng Foza.

## 6) Budgets/timeouts (Agent mode – chung)

Các biến này áp dụng cho Gemini + OpenAI-like + MCP trong `/api/agent-chat`:

- `AGENT_CHAT_TIMEOUT_MS`: deadline tổng cho 1 lượt agent.
- `AGENT_CHAT_LOCAL_TIMEOUT_MS`: timeout mỗi request OpenAI-like (local/vLLM/GPU/CPU).
- `AGENT_CHAT_GEMINI_TIMEOUT_MS`: timeout mỗi request Gemini.
- `AGENT_CHAT_MCP_TOOL_TIMEOUT_MS`: timeout mỗi call `/api/mcp/call`.
- `AGENT_CHAT_MCP_MAX_CALLS`: số tool calls tối đa mỗi lượt Gemini trước khi tổng hợp kết quả.

## 7) Agent tuning

- `AGENT_FORCE_ACTIONS`: `1` bật heuristic forced-actions (dùng khi LLM hay ra text thuần).
- `AGENT_HYDRATE_YOUTUBE`: `0` để tắt hydrate `recommend_music` từ YouTube service.

## 8) Ngrok

- `NGROK_SKIP_BROWSER_WARNING`: `1` để tự set header `ngrok-skip-browser-warning` khi gọi endpoint ngrok.

## 9) MCP/Search/Media keys

- `YOUTUBE_API_KEY`: dùng cho YouTube service (hydrate nhạc).
- `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX`: dùng cho Google Custom Search (web-search MCP).

## 10) Auth/DB/Team tools

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client id (frontend).
- `DATABASE_URL`: Postgres connection string (nếu bật các tính năng DB).
- `TEAM_TODO_PASSWORD`: mật khẩu cho team todo endpoint (nếu dùng).

## 11) Gợi ý cấu hình nhanh

### Local (CPU) + Gemini

- `LLM_PROVIDER=gemini`
- `AGENT_PROVIDER=gemini`
- `CPU_SERVER_URL=http://localhost:8000`
- `GEMINI_API_KEY=...`

### Local (CPU) + FOZA

- `LLM_PROVIDER=foza`
- `AGENT_PROVIDER=foza`
- `FOZA_TOKEN=...`
- `LLM_MODEL_NAME=cinb/gemini-3.1-flash-lite`

