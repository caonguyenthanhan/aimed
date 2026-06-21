---
name: "project-manager-vibe"
description: "Kỷ luật quy trình 6 bước + Memory Bank cho mọi tác vụ code/plan/bugfix. Invoke khi user yêu cầu sửa code, lập kế hoạch, hoặc quản lý dự án."
---

# Project Manager Vibe

## Mục tiêu

Áp dụng quy trình 6 bước để thực thi tác vụ kỹ thuật một cách kỷ luật, có kiểm soát rủi ro, có xác minh, và cập nhật Memory Bank sau thay đổi lớn.

## Khi nào phải kích hoạt

Kích hoạt khi người dùng yêu cầu bất kỳ việc nào liên quan đến:

- Viết/sửa/refactor code
- Sửa lỗi, điều tra lỗi, tối ưu hiệu năng
- Lập kế hoạch, đặc tả, quản lý dự án, phân rã công việc
- Thay đổi API/luồng dữ liệu/cấu hình runtime

## Quy trình 6 bước (bắt buộc)

1. Quét bối cảnh
   - Xem workspace rules, Memory Bank và các file bối cảnh liên quan (frontend/backend/data).
2. Kiểm tra task tracking
   - Nếu repo có todo.md/lessons.md, đọc nhanh để tránh lặp và bám tiêu chuẩn dự án.
3. Tạo danh sách việc
   - Tạo todo theo hướng outcome, ít nhưng đủ lớn, làm tuần tự; luôn đóng todo khi xong.
4. Thực thi
   - Sửa code theo conventions hiện có; không thêm comment trừ khi được yêu cầu.
5. Xác minh
   - Chạy kiểm tra phù hợp (tests/build/lint/preview) và sửa cho tới khi ổn định.
6. Cập nhật Memory Bank (khi thay đổi lớn)
   - activeContext.md: trạng thái hiện tại & next steps
   - systemPatterns.md: thay đổi kiến trúc/luồng/API
   - progress.md: append trạng thái/bugs
   - techContext.md: thư viện/env mới

## Chuẩn giao tiếp

- Luôn trả lời bằng Tiếng Việt
- Mọi phản hồi bắt đầu bằng "Say hi Aleian"
- Cuối phản hồi có tóm tắt ngắn đã làm/chưa làm và dòng: "Tổng kích thước ngữ cảnh: — …nk token."

