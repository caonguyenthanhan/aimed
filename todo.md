# TODO (Repo root) — Kế hoạch theo outcome

## EPIC 0 — Deploy & Environment “chạy là được”
- [ ] Chuẩn hoá toàn bộ biến môi trường (local + Vercel) và hướng dẫn deploy (DB + CPU_SERVER_URL + GRAPH_API_KEY + FOZA/Gemini)
- [ ] Đảm bảo runtime SSOT đúng (runtime-mode.json) và luôn trả metadata mode/provider/fallback
- [ ] Chuẩn hoá log runtime (events/metrics) để demo hội đồng truy xuất được

## EPIC 1 — DB ổn định + Hội thoại “không mất”
- [ ] Ổn định Postgres serverless (pooling/timeout/retry) + endpoint conversations không lỗi chập chờn
- [ ] Tự động đặt tên hội thoại (LLM ưu tiên, fallback offline) và đồng bộ sidebar ổn định
- [ ] Kịch bản lỗi có kiểm soát: thiếu DB vẫn dùng localStorage mượt, không spam 500/404

## EPIC 2 — UI/FE “cố định & không nhảy”
- [ ] Khung chat + khung nhập cố định (sticky) + scroll anchoring chuẩn trên mobile/desktop
- [ ] Tối ưu danh sách dài: virtual list không giật; hành vi auto-scroll nhất quán
- [ ] Trải nghiệm demo: context viewer, tool outputs, actions render không làm vỡ layout

## EPIC 3 — Agent “trợ lý y tế thật”
- [ ] Agent intro/preamble rõ ràng, hỏi follow-up tối thiểu, có nhắc an toàn/red flags
- [ ] Hiển thị trạng thái Agent (profile/mode/provider/graph/tools) + fallback rõ ràng khi tool/graph lỗi
- [ ] Agent hiểu ngữ nghĩa để tự chọn profile + sinh actions hợp lệ (allowlist) cho các luồng demo chính

## EPIC 4 — Trang giới thiệu Agent + Kịch bản demo
- [ ] Trang “Agent Hub”: giới thiệu agent/profiles + năng lực tool + nút chạy kịch bản 1-click
- [ ] Bộ kịch bản demo chuẩn (ít nhất 5): triage, thuốc, kế hoạch, trị liệu, gọi bác sĩ + xem context
- [ ] Checklist demo hội đồng (pass/fail) và script trình bày

## EPIC 5 — Bác sĩ & Phân quyền
- [ ] Chuẩn hoá role SSOT (DOCTOR/PATIENT/ADMIN) và enforcement thống nhất (không dựa localStorage)
- [ ] Doctor directory (danh bạ bác sĩ) + trang public profile + luồng hẹn lịch end-to-end
- [ ] Nâng cấp quyền truy cập dữ liệu (chỉ bác sĩ sở hữu mới xem/duyệt được appointment)

## EPIC 6 — Graph “hoạt động tốt & ổn định”
- [ ] Healthcheck graph + indicator UI + degrade gracefully khi graph down
- [ ] Retry/backoff ở gateway + reconnect driver ở CPU server để giảm “lúc có lúc không”
- [ ] Graph evidence chất lượng: trả subgraph có ý nghĩa + inject vào prompt có kiểm soát độ dài

## Backlog nhóm (nguồn tham chiếu)
- medical-consultation-app/data/team-todo.json
