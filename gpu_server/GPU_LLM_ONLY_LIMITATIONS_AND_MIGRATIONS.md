# GPU LLM-only: Hạn chế & Cách Giữ Các Chức Năng Mở Rộng (từ server_AI_MCS.ipynb)

## 1) server_AI_MCS.ipynb đang có gì?

Notebook `gpu_server/server_AI_MCS.ipynb` triển khai một “GPU all‑in‑one server” (monolithic) gồm nhiều endpoint ngoài chat LLM, ví dụ:

- Chat: `/v1/chat/completions`, `/v1/chat`
- Friend chat: `/v1/friend-chat/completions`
- RAG: `/v1/rag/qa` (retrieve + rerank + nhúng context vào prompt)
- Auto title: `/v1/auto-title`
- Health lookup: `/v1/health-lookup`
- Vision: `/v1/vision-multi`, `/v1/vision-chat` (Vintern-3B / OCR fallback)
- Document chat: `/v1/document-chat` (parse PDF/DOCX/txt + prompt chống hallucination)
- Speech: `/v1/tts/stream`, `/v1/stt/stream`
- Metrics/health: `/gpu/metrics`, `/health`

Trong đó, chỉ `/v1/chat/completions` là “OpenAI-like LLM host” đúng nghĩa. Phần còn lại là “chức năng mở rộng” (tools/services) được gói chung vào cùng server GPU.

## 2) Khi GPU server mới chỉ là LLM host thì xử lý “chức năng mở rộng” thế nào?

Nguyên tắc để vẫn giữ được tính năng:

- GPU host: chỉ chịu trách nhiệm suy luận văn bản theo chuẩn OpenAI-like `POST /v1/chat/completions`.
- CPU server (FastAPI) + Next.js API routes: trở thành lớp “orchestration” (tổ chức luồng), xử lý business logic, tiền/xử lý dữ liệu, và gọi GPU host khi cần tạo text.
- Các chức năng đa phương tiện (vision/STT/TTS/OCR) tách thành:
  - chạy CPU (nếu chấp nhận chậm hơn) hoặc
  - chạy thành service riêng (ưu tiên GPU) và CPU server chỉ proxy.

## 3) Mapping tính năng: giữ bằng cách nào?

### 3.1 Chat /v1/chat/completions

- Giữ nguyên bằng GPU LLM host OpenAI-like.
- FE/BE chỉ cần đọc `choices[0].message.content`.

### 3.2 /v1/chat (wrapper)

Trong notebook, `/v1/chat` thường là wrapper rút gọn.

Khuyến nghị:
- Không cần GPU host cung cấp `/v1/chat`.
- Giữ wrapper ở CPU server (hoặc Next.js API) để tương thích client cũ: nhận input đơn giản → chuyển thành `messages` → gọi GPU host `/v1/chat/completions`.

### 3.3 Friend chat /v1/friend-chat/completions

Trong notebook, đây chủ yếu là:
- set system prompt “nói chuyện đời thường” + gọi model chat.

Khuyến nghị:
- Vẫn giữ được 100% khi GPU host chỉ LLM, bằng cách đặt system prompt ở CPU server/Next.js rồi gọi `/v1/chat/completions`.
- Không cần endpoint riêng trên GPU host.

### 3.4 RAG /v1/rag/qa

Trong notebook, RAG gồm:
- retrieve passages
- (tuỳ chọn) rerank
- nhúng các đoạn vào prompt trước khi gọi LLM

Khuyến nghị để giữ tính năng khi GPU host chỉ LLM:
- Toàn bộ retrieve/rerank chạy ở CPU server (hoặc một RAG service riêng).
- Cuối cùng gọi GPU host `/v1/chat/completions` để “synthesis” (tổng hợp câu trả lời).
- Trả về thêm metadata `rag.used`, `rag.selected`, `rag.retrieved` ở lớp CPU/Next (không trông chờ GPU host).

### 3.5 Health lookup /v1/health-lookup

Đây là tra cứu dữ liệu (DB/CSV/KB), không phải suy luận GPU thuần.

Khuyến nghị:
- Chạy ở CPU server, dùng DB/knowledge base nội bộ.
- Nếu muốn “giải thích” kết quả tra cứu: CPU server lấy dữ liệu → gọi GPU LLM host để viết câu trả lời thân thiện.

### 3.6 Auto title /v1/auto-title

Notebook dùng LLM để tạo tiêu đề.

Khuyến nghị:
- Ưu tiên FE offline (cắt 6 từ đầu) khi offline.
- Khi online: CPU server/Next.js gọi GPU host `/v1/chat/completions` với prompt đặt tiêu đề.

### 3.7 Vision (vision-multi / vision-chat)

Notebook dùng VLM (ví dụ Vintern) hoặc OCR fallback rồi có thể gọi LLM để tóm tắt/giải thích.

Nếu GPU host mới chỉ là text LLM thì:
- Không thể “native” đọc ảnh.

Các cách giữ tính năng:
1) OCR-first (CPU hoặc service riêng):
   - OCR ảnh → text → gọi GPU LLM host để trả lời dựa trên text OCR.
2) Multimodal service riêng (GPU):
   - Triển khai một endpoint VLM riêng (có thể là service khác) cho `/v1/vision-*`.
   - CPU server proxy đến service VLM, sau đó (tuỳ trường hợp) gọi text LLM để diễn giải.

### 3.8 Document chat /v1/document-chat

Notebook:
- parse PDF/DOCX/txt từ base64
- làm sạch text
- prompt chống hallucination + gọi LLM

Khuyến nghị:
- Parse tài liệu + OCR (nếu scan) chạy ở CPU server (hoặc “ocr-server” riêng).
- Sau đó gọi GPU LLM host để trả lời.
- Nên giữ prompt chống hallucination ở CPU server để kiểm soát chặt.

### 3.9 Speech (STT/TTS)

Notebook đang có:
- STT: faster-whisper (thường chạy CPU int8)
- TTS: gTTS/edge-tts

Khuyến nghị:
- STT/TTS không nên phụ thuộc GPU LLM host.
- Triển khai STT/TTS ở CPU server (đã phù hợp với kiến trúc hybrid), hoặc tách service chuyên dụng.

### 3.10 Metrics /gpu/metrics

GPU LLM host “thuần OpenAI-like” thường không có `/gpu/metrics`.

Khuyến nghị:
- Nếu cần: CPU server thu thập latency/error và ghi log metrics (đã có runtime-metrics.jsonl/runtime-events.jsonl).
- Nếu muốn GPU metrics thật (VRAM/throughput): phải bổ sung endpoint metrics ở GPU host hoặc chạy sidecar exporter.

## 4) Hạn chế khi GPU chỉ là LLM host

1) Không có multimodal: không xử lý ảnh/audio/tài liệu “native”.
2) Không có RAG built-in: retrieve/rerank phải chạy bên ngoài.
3) Không có “business endpoints” như friend-chat/auto-title/health-lookup nếu bạn không tự làm ở CPU/Next.
4) Khác biệt model naming: GPU host có thể yêu cầu `model` dạng vLLM/HF ID; UI lại dùng `flash/pro`.
5) Streaming: nếu GPU host không hỗ trợ stream, các tính năng “live streaming” phải mô phỏng bằng chunking ở FE/Next.
6) Observability hạn chế: thiếu metrics chi tiết nếu host không cung cấp.

## 5) Gợi ý khắc phục (khuyến nghị theo mức)

### Mức A (nhanh nhất, ít thay đổi)

- Giữ GPU host chỉ `/v1/chat/completions`.
- Tất cả endpoint mở rộng giữ ở CPU server/Next.js:
  - friend-chat = system prompt
  - auto-title = prompt + gọi LLM
  - RAG = retrieve/rerank ở CPU, LLM chỉ tổng hợp
  - vision/doc = OCR ở CPU/service, LLM trả lời theo text
  - STT/TTS = CPU/service riêng

## 6) Chạy song song GPU+CPU (Hybrid) để giảm tải CPU

Mục tiêu: CPU làm orchestration + I/O, còn GPU xử lý suy luận nặng; các service chạy song song ở cấp hệ thống.

- GPU LLM host (text): chỉ `POST /v1/chat/completions`
- GPU tools server (tuỳ chọn): vision/stt/tts/document (có thể dùng notebook server_AI_MCS)
- CPU server: gateway thống nhất, giữ auth/logging/fallback và proxy đến đúng server theo loại tác vụ

Khuyến nghị cấu hình:
- `runtime-mode.json`/`GPU_SERVER_URL`: trỏ vào GPU LLM host (text)
- `GPU_LLM_ONLY=1`: báo cho CPU server rằng GPU url hiện tại chỉ hỗ trợ chat (không proxy vision/stt/tts/document vào đây)
- `GPU_TOOLS_URL=<url>` (nếu có): trỏ vào GPU tools server để proxy các endpoint như `/v1/vision-multi`, `/v1/stt/stream`, `/v1/tts/stream`, `/v1/document-chat`

### Mức B (tối ưu hiệu năng)

- Tách các service nặng:
  - VLM service (GPU) cho ảnh
  - STT service (GPU/CPU tuỳ budget)
  - OCR service chuyên dụng
- CPU server làm gateway thống nhất: auth, rate limit, logging, và fallback.

### Mức C (quay lại “GPU all‑in‑one”)

- Nếu bạn muốn giữ nguyên API như notebook (nhiều endpoint trên GPU):
  - GPU host phải triển khai thêm các endpoint (vision/stt/tts/rag/auto-title).
  - Khi đó GPU server không còn là “LLM-only” nữa và bạn phải quản lý thêm model + VRAM + cold start.
