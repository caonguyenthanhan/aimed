# Lessons / Notes

## Quy ước
- Ghi ngắn gọn: vấn đề → nguyên nhân → cách fix → cách tránh lặp
- Chỉ lưu bài học có thể tái dùng

## Entries
- PowerShell `Invoke-RestMethod/Invoke-WebRequest` có thể decode JSON sai nếu response chỉ có `Content-Type: application/json` (không kèm charset) → dễ bị mojibake tiếng Việt; fix bằng `application/json; charset=utf-8` hoặc tự decode bytes bằng UTF-8.
- Graph gateway trên Vercel không được fallback sang localhost khi thiếu `CPU_SERVER_URL` → phải trả degrade payload rõ `graph_disabled_no_cpu_url`/`graph_404`/`graph_timeout`/`graph_down` để UI giữ được context viewer và debug được upstream.
- LangChain `ChatPromptTemplate` mặc định parse message theo kiểu `f-string` → nếu nhúng JSON mẫu với `{}` literal trong prompt thì phải escape thành `{{` `}}`, nếu không sẽ nổ lỗi `Invalid format specifier in f-string template. Nested replacement fields are not allowed.`
- Vercel CLI hiện có bug non-interactive với `vercel env add <NAME> preview --value ... --yes` → lệnh có thể vẫn đòi `git branch`; nếu chỉ cần dọn typo thì `vercel env rm <NAME> preview --yes` vẫn chạy được, còn `FOZA_BASE_URL` cho Preview có thể tạm dựa vào fallback mặc định trong code.
- Nếu project trên Vercel dùng `rootDirectory=medical-consultation-app` nhưng CLI detect repo root cha chứa model/dataset lớn, `vercel --prod` có thể fail với `ERR_FS_FILE_TOO_LARGE` dù chạy trong thư mục app → workaround an toàn là deploy từ một workspace tạm chỉ chứa root repo tối thiểu + thư mục con `medical-consultation-app/`.
- Rule-based fallback cho `agent-chat` không được chỉ dựa vào `triageMeta.active` hoặc từ khóa đặt hẹn; với red-flag thô như `đau ngực`, `khó thở`, fallback vẫn phải sinh `ask_navigation -> bac-si` để giữ hành vi an toàn khi upstream AI unavailable.
