## Agent function calling (pattern)

- Contract ổn định giữa backend và frontend: API trả `{ response, actions, metadata }`, frontend chỉ thực thi action trong allowlist.
- Allowlist điều hướng lấy từ 1 nguồn SSOT (`ALLOWED_PATH_PREFIXES`) và được dùng đồng thời cho local-agent prompt và server enforcement.
- Tool calling ở Gemini được chuẩn hoá thành action `navigate` để frontend chỉ xử lý một kiểu điều hướng.
- Metadata `mode: cpu|gpu` được dùng để đồng bộ UI với runtime mode.
- Có thể mở rộng action dạng “tool nặng” (ví dụ `speak`) nhưng vẫn qua allowlist/schema.
- Các heuristic “forced actions” được điều khiển bằng env flag để tránh gây nhiễu luồng (mặc định tắt trong production).
- `recommend_music` có thể được hydrate bằng YouTube service (cache TTL) để trả danh sách đề xuất thực tế thay vì hardcode.
