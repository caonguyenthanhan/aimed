# Dàn ý luận văn (gợi ý)

Bạn có thể dùng dàn ý này cho đề tài “Hệ thống tư vấn y tế AI” (Hybrid Local CPU + Cloud GPU) và tinh chỉnh theo mẫu khoa/viện.

## Chương 1. Mở đầu

- Lý do chọn đề tài, bối cảnh và vấn đề
- Mục tiêu, phạm vi, đối tượng nghiên cứu
- Phương pháp tiếp cận và đóng góp
- Cấu trúc luận văn

## Chương 2. Cơ sở lý thuyết & liên quan

- Tổng quan LLM, RAG, Agent/tool-calling, safety/PII
- Tổng quan kiến trúc triển khai (local vs cloud, gateway)
- Công trình/giải pháp liên quan và so sánh

## Chương 3. Phân tích yêu cầu & thiết kế

- Yêu cầu chức năng và phi chức năng
- Use-case/actor chính (bệnh nhân, bác sĩ, admin)
- Thiết kế tổng thể: module, luồng dữ liệu, SSOT runtime-mode
- Thiết kế an toàn: fallback, rate-limit, scan PII, logging

## Chương 4. Xây dựng hệ thống

- Frontend (Next.js): UI chat, auto-title offline, toggle compute mode
- Backend CPU (FastAPI): gateway chat, proxy GPU, contract với GPU host
- GPU host (vLLM OpenAI-like): endpoint, giới hạn, cách tích hợp
- Lưu trữ & đồng bộ: hội thoại, thiết bị, dữ liệu demo

## Chương 5. Thực nghiệm & đánh giá

- Kịch bản test (QA, patient scenarios)
- Đo lường: độ đúng, độ an toàn, độ trễ, tính ổn định fallback
- Kết quả và phân tích

## Chương 6. Kết luận & hướng phát triển

- Tổng kết đóng góp
- Hạn chế
- Hướng mở rộng (streaming, tool execution trên GPU, RAG nâng cao, giám sát)

## Phụ lục (gợi ý)

- A: API spec & luồng endpoint
- B: Mô hình dữ liệu / schema
- C: Hướng dẫn cài đặt & triển khai
- D: Bộ test & báo cáo kết quả

