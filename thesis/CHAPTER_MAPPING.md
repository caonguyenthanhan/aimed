# Mapping chương ↔ tài liệu có sẵn trong repo

Mục tiêu: bạn viết theo “chương”, còn nội dung kỹ thuật thì lấy từ các tài liệu đã có trong repo.

## Chương 1 (Mở đầu)

- Tổng quan hệ thống: [README.md](../README.md)
- Hướng dẫn nhanh: [QUICK_REFERENCE.md](../QUICK_REFERENCE.md), [FEATURE_USAGE_GUIDE.md](../FEATURE_USAGE_GUIDE.md)

## Chương 2 (Cơ sở lý thuyết & liên quan)

- Tài liệu multi-agent/tool-calling: [THESIS_MULTI_AGENT_DETAILED.md](../medical-consultation-app/docs/THESIS_MULTI_AGENT_DETAILED.md), [AGENT_FUNCTION_CALLING.md](../medical-consultation-app/docs/AGENT_FUNCTION_CALLING.md)
- Tài liệu RAG (lưu trữ tham khảo): [Archived/RAG/README.md](../Archived/RAG/README.md)

## Chương 3 (Yêu cầu & thiết kế)

- Kiến trúc tổng thể: [ARCHITECTURE.md](../ARCHITECTURE.md), [CHAT_STORAGE_ARCHITECTURE.md](../CHAT_STORAGE_ARCHITECTURE.md)
- SSOT runtime mode + routing: [systemPatterns.md](../medical-consultation-app/docs/systemPatterns.md), [activeContext.md](../medical-consultation-app/docs/activeContext.md)
- Hợp đồng GPU host: [GPU_LLM_HOST_CONTRACT.md](../cpu_server/GPU_LLM_HOST_CONTRACT.md), [GPU_LLM_ONLY_LIMITATIONS_AND_MIGRATIONS.md](../gpu_server/GPU_LLM_ONLY_LIMITATIONS_AND_MIGRATIONS.md)

## Chương 4 (Xây dựng hệ thống)

- Frontend UI overview: [UI_OVERVIEW_FE_HANDOFF.md](../medical-consultation-app/docs/UI_OVERVIEW_FE_HANDOFF.md)
- Backend CPU (FastAPI): [server.py](../cpu_server/server.py)
- Gateway LLM (Next API route): [route.ts](../medical-consultation-app/app/api/llm-chat/route.ts)
- Chat UI: [chat-interface.tsx](../medical-consultation-app/components/chat-interface.tsx), [compute-toggle.tsx](../medical-consultation-app/components/compute-toggle.tsx)
- VLLM self-host: [VLLM_SELF_HOST.md](../medical-consultation-app/docs/VLLM_SELF_HOST.md)

## Chương 5 (Thực nghiệm & đánh giá)

- Báo cáo test: [TEST_REPORT.md](../medical-consultation-app/TEST_REPORT.md), [QA_TESTING_GUIDE.md](../medical-consultation-app/QA_TESTING_GUIDE.md)
- Kịch bản test: [PATIENT_SCENARIOS_TEST_EXAMPLES.md](../medical-consultation-app/docs/PATIENT_SCENARIOS_TEST_EXAMPLES.md), [TEST_PATIENT_SCENARIOS_REPORT.md](../medical-consultation-app/TEST_PATIENT_SCENARIOS_REPORT.md)
- Audit/Evaluation: [SYSTEM_AUDIT_2026-04-08.md](../SYSTEM_AUDIT_2026-04-08.md), [SYSTEM_TEST_REPORT_2026-04-10.md](../SYSTEM_TEST_REPORT_2026-04-10.md)

## Phụ lục (tài liệu nền)

- Progress & nhật ký thay đổi: [progress.md](../medical-consultation-app/docs/progress.md)
- Tài liệu triển khai môi trường: [ENV_SETUP.md](../medical-consultation-app/ENV_SETUP.md), [README_INFERENCE.md](../README_INFERENCE.md)
- Biểu đồ/flowchart: [flowchart TD.mmd](../flowchart%20TD.mmd), [PROJECT_VISUALIZATION.html](../medical-consultation-app/docs/PROJECT_VISUALIZATION.html)
- Đồ thị tri thức: [REPORT_memgraph-export.cypherl.md](../graph/REPORT_memgraph-export.cypherl.md)

