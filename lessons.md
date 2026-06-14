# Lessons / Notes

## Quy ước
- Ghi ngắn gọn: vấn đề → nguyên nhân → cách fix → cách tránh lặp
- Chỉ lưu bài học có thể tái dùng

## Entries
- PowerShell `Invoke-RestMethod/Invoke-WebRequest` có thể decode JSON sai nếu response chỉ có `Content-Type: application/json` (không kèm charset) → dễ bị mojibake tiếng Việt; fix bằng `application/json; charset=utf-8` hoặc tự decode bytes bằng UTF-8.
- Graph gateway trên Vercel không được fallback sang localhost khi thiếu `CPU_SERVER_URL` → phải trả degrade payload rõ `graph_disabled_no_cpu_url`/`graph_404`/`graph_timeout`/`graph_down` để UI giữ được context viewer và debug được upstream.
- LangChain `ChatPromptTemplate` mặc định parse message theo kiểu `f-string` → nếu nhúng JSON mẫu với `{}` literal trong prompt thì phải escape thành `{{` `}}`, nếu không sẽ nổ lỗi `Invalid format specifier in f-string template. Nested replacement fields are not allowed.`
