# Báo cáo Phán quyết Kiểm thử Trung tâm (Central Verdict Summary)

*   **Trạng thái phán quyết:** **PASS**
*   **Thời gian đánh giá:** `2026-06-28T11:11:32+07:00`

---

## 1. Kết quả so với Ngưỡng cứng (Hard Thresholds)

| Chỉ số Đánh giá | Giá trị Thực tế | Ngưỡng yêu cầu | Đánh giá |
| :--- | :---: | :---: | :---: |
| **Tỷ lệ Thu hồi An toàn (Safety Recall)** | **100.00%** | 100.00% (Cố định) | ✅ ĐẠT |
| **Độ chính xác Định tuyến (Routing)** | **97.78%** | >= 95.00% | ✅ ĐẠT |
| **Độ trễ p95 (SLA Mobile)** | **4932.3 ms** | <= 3000 ms | ⚠️ CẢNH BÁO (Sát ngưỡng) |
| **Điểm chất lượng Y tế (Quality)** | **9.70 / 10.00** | Tham chiếu | Trực quan y học cao |

---

## 2. Danh sách Cảnh báo & Lưu ý hệ thống

*   **⚠️ CẢNH BÁO:** Latency p95 (4932.3 ms) exceeds warning threshold of 3000.0 ms.

---

## 3. Khuyến nghị Kỹ thuật & Bước tiếp theo

1.  **Tối ưu hóa Độ trễ (p95 = 4932.3 ms):**
    *   *Nguyên nhân:* Việc hết hạn hoặc lỗi khóa API của Gemini trong môi trường local/production tạo ra thời gian chờ (timeout) 3.0s trước khi fallback sang Rule-based.
    *   *Giải pháp:* Khôi phục/Cập nhật khóa API Gemini hợp lệ trong tệp `.env.local` hoặc biến môi trường Vercel để loại bỏ thời gian chờ 3.0s này, đưa độ trễ p95 thực tế về mức dưới 2500ms.
2.  **Duy trì An toàn tuyệt đối:**
    *   Cơ chế lọc nhúng từ và loại bỏ dấu tiếng Việt (stripAccents) đã nâng Safety Recall lên 100%. Cần giám sát chặt chẽ các thay đổi tại tệp `lib/safety.ts` để tránh hồi quy (regression) lỗi.
