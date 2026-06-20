# KẾ HOẠCH KIỂM THỬ HỆ THỐNG — Medical Consulting System

> Phạm vi: Frontend (Next.js) · Backend CPU (FastAPI + LangGraph) · API LLM/GPU · Kịch bản demo hội đồng.
> Mục tiêu: xác nhận toàn hệ thống chạy ổn định end-to-end trước demo, có tiêu chí PASS/FAIL rõ ràng.

## 0. KIẾN TRÚC CẦN TEST (tóm tắt)
```
[Browser/UI] → [Next.js /api/agent-chat] → (proxy) → [CPU server /v1/agent-chat]
                                          ↘ (fallback) → [FOZA / Gemini]
[CPU server] → [LangGraph] → [graph.evidence] → [Memgraph Bolt]
[CPU server] → [FOZA API] / [GPU tools URL]
SSOT: data/runtime-mode.json, server-registry.json
```

## 0.1. MÔI TRƯỜNG TEST
| Layer | Local | Live |
|---|---|---|
| FE | http://localhost:3000 | https://aimed-one.vercel.app |
| BE-CPU | http://127.0.0.1:8000 | ngrok URL (CPU_SERVER_URL) |
| Graph | bolt://127.0.0.1:7687 | (qua CPU local) |
| LLM | FOZA api.foza.ai / Gemini | giống local |

## 0.2. NGUYÊN TẮC PASS/FAIL
- PASS: đúng output mong đợi + không lỗi runtime + metadata nhất quán.
- WARN: chạy được nhưng lệch nhẹ (latency cao, fallback kích hoạt).
- FAIL: lỗi runtime, sai output, hoặc state không nhất quán.

---

## 1. KIỂM THỬ FRONTEND (FE)

### 1.1. Smoke UI (load trang)
| ID | Test | Bước | PASS khi |
|---|---|---|---|
| FE-01 | Trang chủ load | Mở `/` | Render, không lỗi console |
| FE-02 | Trang tư vấn | Mở `/tu-van` | Chat UI hiện, ô input enable |
| FE-03 | Điều hướng menu | Click các link nav | Đúng route, không 404 |
| FE-04 | i18n | Đổi ngôn ngữ | Text đổi đúng |

### 1.2. Chat flow (agent UI)
| ID | Test | PASS khi |
|---|---|---|
| FE-05 | Gửi message | Hiện message user + spinner |
| FE-06 | Nhận phản hồi | Hiện câu trả lời agent (≤60s) |
| FE-07 | Auto-title | Hội thoại mới có tiêu đề |
| FE-08 | Badge trạng thái | mode/provider/graph hiển thị đúng |
| FE-09 | Xem context | Panel mở, JSON llm_context đầy đủ |
| FE-10 | Diagnostic lỗi | Khi fallback, hiện error/reason |

### 1.3. Tính nhất quán state
| ID | Test | PASS khi |
|---|---|---|
| FE-11 | Graph badge vs context | Badge header khớp graph_injected |
| FE-12 | Sidebar kết nối | Không lệch với graph.status |
| FE-13 | Lịch sử hội thoại | Load/save đúng |

### 1.4. Công cụ phụ
| ID | Test | PASS khi |
|---|---|---|
| FE-14 | TTS (nghe tin nhắn) | Phát audio hoặc báo lỗi rõ |
| FE-15 | STT (ghi âm) | Ghi + chuyển text |
| FE-16 | Responsive | Mobile/desktop không vỡ layout |

---

## 2. KIỂM THỬ BACKEND CPU (BE-CPU)

### 2.1. Health & runtime
| ID | Test | Endpoint | PASS khi |
|---|---|---|---|
| BE-01 | Server alive | `GET /` hoặc `/v1/graph/status` | 200 OK |
| BE-02 | DB ping | `/api/db/ping` (FE) | `db: ok` + latency |
| BE-03 | Runtime mode SSOT | đọc `data/runtime-mode.json` | tồn tại, hợp lệ |
| BE-04 | Auto-create runtime | xóa file → gọi lại | tự tạo lại file |

### 2.2. Agent chat (LangGraph)
| ID | Test | PASS khi |
|---|---|---|
| BE-05 | `/v1/agent-chat` cơ bản | trả `{response, actions, metadata}` |
| BE-06 | provider = foza | metadata.provider = foza |
| BE-07 | graph auto-inject | graph_injected = true (query có entity) |
| BE-08 | FOZA timeout fallback | fallback=foza_unreachable, có safety content |
| BE-09 | llm_context đầy đủ | graph/graph_injected/graph_reason có mặt |
| BE-10 | conversation persist | conversation_id ổn định |

### 2.3. Graph Gateway
| ID | Test | PASS khi |
|---|---|---|
| BE-11 | `/v1/graph/status` | connected=true, nodes>0, latency |
| BE-12 | `/v1/graph/evidence` query có dấu | entities>0 |
| BE-13 | `/v1/graph/evidence` không dấu | fuzzy match trả entities>0 |
| BE-14 | Memgraph down | trả reason rõ (graph_down), không crash |
| BE-15 | Encoding UTF-8 | entity name tiếng Việt đúng |

### 2.4. Fallback chain
| ID | Test | PASS khi |
|---|---|---|
| BE-16 | FOZA OK | dùng FOZA, fallback=None |
| BE-17 | FOZA timeout | degrade gracefully, không sập graph |
| BE-18 | Thiếu FOZA env | báo missing_foza_env, sang provider khác |

---

## 3. KIỂM THỬ API LLM / GPU

### 3.1. FOZA
| ID | Test | PASS khi |
|---|---|---|
| LLM-01 | FOZA chat completions | trả content hợp lệ |
| LLM-02 | FOZA latency | đo thời gian (WARN nếu >30s) |
| LLM-03 | FOZA retry | retry khi 408/429/5xx |
| LLM-04 | FOZA circuit breaker | mở circuit sau N lần fail |

### 3.2. Gemini (fallback)
| ID | Test | PASS khi |
|---|---|---|
| LLM-05 | Gemini fallback | khi FOZA fail, gọi Gemini |
| LLM-06 | Gemini 429 | xử lý quota, không crash |
| LLM-07 | Gemini error | metadata.gemini_error rõ |

### 3.3. GPU tools (nếu có)
| ID | Test | PASS khi |
|---|---|---|
| GPU-01 | GPU_TOOLS_URL config | đọc đúng từ env/registry |
| GPU-02 | Vision/multimodal | xử lý ảnh (hoặc báo 503 rõ) |
| GPU-03 | GPU unavailable | fallback CPU mượt |
| GPU-04 | Round-robin GPU | chọn server từ registry |

---

## 4. KỊCH BẢN DEMO (END-TO-END)

> Chạy trên live `aimed-one.vercel.app/tu-van`, có CPU server + ngrok + Memgraph bật.

| ID | Kịch bản | Input | PASS khi |
|---|---|---|---|
| DEMO-01 | Triệu chứng thường gặp | "Tôi bị sốt nhẹ, đau họng, mệt 2 ngày" | Tư vấn y tế thật, graph_injected=true, ≤30s |
| DEMO-02 | Red-flag tim mạch | "Đau ngực dữ dội lan ra tay trái, khó thở" | Cảnh báo khẩn, khuyên gọi 115 |
| DEMO-03 | Hỏi về thuốc | "Paracetamol uống bao nhiêu là an toàn?" | Liều an toàn + disclaimer |
| DEMO-04 | Phòng ngừa | "Cách phòng ngừa cảm cúm?" | Lời khuyên có cấu trúc |
| DEMO-05 | Tâm lý / lo âu | "Tôi hay lo lắng, mất ngủ" | Hỗ trợ + gợi ý chuyên khoa |
| DEMO-06 | Graph grounding | câu có entity trong graph | Context panel hiện entities thật |
| DEMO-07 | Fallback minh bạch | (khi FOZA chậm) | Safety content, không câu rỗng |
| DEMO-08 | Đa lượt hội thoại | hỏi tiếp nối ngữ cảnh | Giữ context, không mất mạch |

### 4.1. Tiêu chí demo hội đồng
- Mọi câu hỏi y tế phải có disclaimer.
- Không chẩn đoán xác định, chỉ tư vấn tham khảo.
- Ca khẩn cấp luôn ưu tiên hướng dẫn gọi 115.
- Graph grounding hiển thị được khi demo (context panel).
- Latency chấp nhận: ≤30s (WARN 30-50s, FAIL >60s).

---

## 5. QUY TRÌNH THỰC THI TEST

### 5.1. Thứ tự
1. **Tầng dưới trước**: Graph → CPU → LLM → FE.
2. **Smoke trước, sâu sau**: chạy smoke toàn bộ, rồi test chi tiết phần fail.
3. **Local trước, live sau**: verify local PASS rồi mới test Vercel.

### 5.2. Công cụ
- `scripts/demo-smoke-vercel.ps1` — smoke live.
- `smoke.ps1` — smoke local.
- `test_ngrok_agent.py` — test agent qua ngrok.
- Browser subagent — test UI thực tế.

### 5.3. Checklist tiền demo (bắt buộc)
- [ ] Docker Desktop running + Memgraph up.
- [ ] CPU server + ngrok chạy, graph nodes>0.
- [ ] CPU_SERVER_URL cập nhật trên Vercel env.
- [ ] `npm run build` pass.
- [ ] DEMO-01 PASS trên live (smoke chính).
- [ ] FOZA latency kiểm tra trước (warm-up 1 request).

### 5.4. Ghi nhận kết quả
- Lưu pass/fail vào bảng, append vào `progress.md`.
- Lỗi mới → ghi `lessons.md`.
- Cập nhật Memory Bank sau khi test xong.

---

## 6. MA TRẬN ƯU TIÊN
| Mức | Nhóm test | Lý do |
|---|---|---|
| P0 | DEMO-01, BE-05~09, FE-05~10 | Luồng demo chính |
| P1 | BE-11~15, LLM-01~04, FE-11~13 | Graph + LLM ổn định |
| P2 | DEMO-02~08, FE-01~04 | Mở rộng kịch bản |
| P3 | GPU-01~04, FE-14~16 | Tính năng phụ |

## 7. RỦI RO ĐÃ BIẾT
- FOZA latency cao (30-45s) → cần warm-up trước demo.
- ngrok free tier có thể đổi URL khi restart → cập nhật lại Vercel env.
- Memgraph cần Docker chạy trước.
- Vercel maxDuration=60 — nếu FOZA >60s sẽ timeout.

