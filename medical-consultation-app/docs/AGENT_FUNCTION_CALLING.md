# AI Agent Function Calling (Demo)

## Mục tiêu demo

- LLM trả về hành động (action) rõ ràng để UI thực thi.
- Tối thiểu: mở trang sàng lọc khi agent quyết định.
- Hiện dùng Gemini API; tương lai có thể chuyển sang LLM local bằng cách giữ nguyên contract `actions`.

## Contract response (API → UI)

API trả JSON:

```json
{
  "response": "string",
  "actions": [
    { "type": "navigate", "args": { "path": "/sang-loc" } }
  ],
  "conversation_id": "string",
  "metadata": { "mode": "gpu", "provider": "gemini", "model": "...", "duration_ms": 123 }
}
```

- `response`: nội dung assistant để hiển thị.
- `actions`: danh sách hành động UI được phép thực thi (allowlist).
- `conversation_id`: id hội thoại (demo).
- `metadata.mode`: `cpu|gpu` để UI đồng bộ trạng thái runtime mode.
- `metadata.provider`: `gemini|local|...` (để debug).

## Tools/functions (Gemini function calling)

Tool declarations hiện có:

- `navigate({ path })`
- `speak({ text })`
- `open_screening()`
- `open_therapy()`
- `open_reminders()`

Gemini trả `functionCall` trong `content.parts[]`, server map sang `actions`. Ở phía server, các tool `open_*` được chuẩn hoá về action `navigate` để frontend chỉ cần thực thi một kiểu điều hướng.

## Parsing & execution

Frontend chỉ thực thi allowlist:

- `/sang-loc`, `/tri-lieu`, `/nhac-nho`, `/tin-tuc-y-khoa`, `/tam-su`, `/tu-van`, `/bac-si`, `/doctor`, `/ke-hoach`

Nếu action là `navigate`, path phải bắt đầu bằng `/` và nằm trong allowlist.

## Switching Gemini → Local LLM (tương lai)

Mục tiêu là giữ nguyên contract `actions` ở response.

- Gemini: dùng function calling native (tools).
- Local: dùng OpenAI-compatible `/v1/chat/completions` và prompt ép model xuất JSON `{response, actions}`.

Biến cấu hình:

- `AGENT_PROVIDER=gemini|local`
- `LOCAL_AGENT_URL` (optional): URL đầy đủ tới `/v1/chat/completions` (nếu không set sẽ dùng `INTERNAL_LLM_URL` hoặc `CPU_SERVER_URL`).
- `LOCAL_AGENT_MODEL` (optional): tên model (tuỳ backend local hỗ trợ/ignore).
