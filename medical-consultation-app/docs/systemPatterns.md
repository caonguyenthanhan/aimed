## Agent function calling (pattern)

- Contract ổn định giữa backend và frontend: API trả `{ response, actions, metadata }`, frontend chỉ thực thi action trong allowlist.
- Tool calling ở Gemini được chuẩn hoá thành action `navigate` để frontend chỉ xử lý một kiểu điều hướng.
- Metadata `mode: cpu|gpu` được dùng để đồng bộ UI với runtime mode.
- Có thể mở rộng action dạng “tool nặng” (ví dụ `speak`) nhưng vẫn qua allowlist/schema.
