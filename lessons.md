# Lessons / Notes

## Quy ước
- Ghi ngắn gọn: vấn đề → nguyên nhân → cách fix → cách tránh lặp
- Chỉ lưu bài học có thể tái dùng

## Entries
- PowerShell `Invoke-RestMethod/Invoke-WebRequest` có thể decode JSON sai nếu response chỉ có `Content-Type: application/json` (không kèm charset) → dễ bị mojibake tiếng Việt; fix bằng `application/json; charset=utf-8` hoặc tự decode bytes bằng UTF-8.
