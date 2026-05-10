## Agent providers

- Gemini API: dùng native tool/function calling (generateContent + functionDeclarations).
- Local LLM: dùng OpenAI-compatible `/v1/chat/completions`, ép output JSON `{response, actions}`, bật bằng `AGENT_PROVIDER=local`.

## Agent flags

- `AGENT_FORCE_ACTIONS=1`: bật heuristic forced-actions (mặc định tắt).
- `AGENT_HYDRATE_YOUTUBE=0`: tắt việc hydrate `recommend_music` từ YouTube service (mặc định bật).

## YouTube

- YouTube service có cache TTL in-memory (search/details/wellness) để giảm quota/latency và ổn định kết quả khi đề xuất.

## MCP-lite

- `/api/mcp/tools`: trả danh sách tools + JSON schema (web.search, youtube.search, youtube.video, youtube.recommend_music).
- `/api/mcp/call`: thực thi tool theo `{ name, args }` và trả `{ result, metadata }`.

## Audio (Vercel)

- STT/TTS dùng Gemini server-side bằng `@google/genai` cho `/api/speech-to-text` và `/api/text-to-speech` (kèm stream).
