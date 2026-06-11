# Nhật ký Kiểm thử & Xác minh Giai đoạn 3 (Backend Proxy Mode Verification)

**Dự án:** Aimed Consulting System  
**Website:** [aimed-one.vercel.app](https://aimed-one.vercel.app/)  
**Phiên bản mã nguồn:** Commit `cf5810c` (“Tach demo/prod mode cho proxy /api/backend va cau hinh stub”)  
**Thời gian xác minh:** 11/06/2026 02:45 PM (ICT)  

---

## 1. Xác minh 3 Kịch bản Cấu hình (Case A, B, C)

Chúng tôi đã kiểm tra và đối chiếu cả trên giao diện thực tế (Vercel) và phân tích luồng xử lý mã nguồn tại [route.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/api/backend/%5B...path%5D/route.ts):

### Case A — Demo mode, không có CPU server (Mặc định hiện tại)
- **Cấu hình Vercel:** `MCS_DEPLOY_MODE` không set hoặc để `demo`, `CPU_SERVER_URL` để trống/localhost.
- **Trạng thái thực tế:** **PASS**. 
- **Chi tiết xác minh:**
  - Trang `/account` tải thành công thông tin người dùng từ dữ liệu stub mặc định (`full_name: "Minh Anh"`, `nickname: "patient.minh"`).
  - Không còn lỗi 404 cho `/api/backend/v1/user` và `/api/backend/v1/consent`.
  - **Lưu chỉnh sửa:** Sửa biệt danh sang `patient.minh.demo` và bấm lưu hoạt động hoàn hảo. Dữ liệu được lưu trữ tạm thời trong stub store và được cập nhật cục bộ, thông tin thay đổi được duy trì chính xác sau khi reload trang.
  - **Consent Settings:** Bấm lưu cấu hình đồng ý (consent) được lưu trữ đúng trạng thái và không báo lỗi.

---

### Case B — Prod mode, không có CPU server
- **Cấu hình kiểm tra:** `MCS_DEPLOY_MODE=prod` và `CPU_SERVER_URL` để trống.
- **Phân tích mã nguồn:** **PASS**.
- **Luồng logic xử lý:**
  - Hàm `proxy()` xác định `mode = 'prod'` (`isDemo = false`).
  - Khi không cấu hình base URL (`base = null`), API lập tức bỏ qua phần stub và trả về mã **503 Service Unavailable** cùng thông báo hướng dẫn cấu hình rõ ràng:
    ```json
    {
      "error": "CPU server not configured",
      "mode": "prod",
      "hint": "Set CPU_SERVER_URL in Vercel env to a reachable backend (https://...) or switch to MCS_DEPLOY_MODE=demo"
    }
    ```

---

### Case C — Có CPU server qua ngrok (Kết nối thật)
- **Cấu hình kiểm tra:** `CPU_SERVER_URL=https://...` (đường dẫn ngrok public đến CPU server chạy local).
- **Phân tích mã nguồn:** **PASS**.
- **Luồng logic xử lý:**
  - API Gateway sẽ gửi yêu cầu trực tiếp đến địa chỉ `CPU_SERVER_URL` thông qua lệnh gọi `fetch(target, ...)`.
  - Nếu CPU server phản hồi thành công, Next.js sẽ chuyển tiếp (forward) kết quả này về trình duyệt và không sử dụng dữ liệu stub.
  - Cải tiến mới: Sử dụng `fallbackReq = req.clone()` cho phép đọc lại request body mà không làm crash luồng kết nối nếu fetch sang CPU server bị lỗi và cần nhảy xuống block `handleStub`.

---

## 2. Thử nghiệm Giao diện và Kiểm tra UX

1. **Ẩn nút nổi `+` thành công:** Trên hai trang chat `/tu-van` và `/tam-su`, nút nổi màu xanh vướng víu ở góc phải bên dưới đã được ẩn hoàn toàn theo danh sách `HIDDEN_PATHS` mới.
2. **Text bong bóng chat hiển thị tốt:** Văn bản của tin nhắn người dùng hiển thị rõ ràng, không còn bị ẩn hay đè chữ.

---

## 3. Hình ảnh Minh chứng Thực tế (Sau khi chia Mode)

### 📸 Kiểm tra chỉnh sửa Thông tin & Quyền đồng ý (Case A)
````carousel
![Profile Pre-Edit](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/account_details_pre_edit_1781163803629.png)
<!-- slide -->
![Profile Editing](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/account_details_editing_1781163837580.png)
<!-- slide -->
![Profile Post-Edit & Persisted](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/account_details_post_edit_1781163864855.png)
<!-- slide -->
![Consent Pre-Change](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/consent_pre_change_1781163890372.png)
<!-- slide -->
![Consent Post-Change & Saved](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/consent_post_change_1781163947982.png)
````

### 📸 Kiểm tra Trực quan trang Chat (Nút nổi đã ẩn)
````carousel
![Tu Van Chat Interface](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/tu_van_page_1781163985731.png)
<!-- slide -->
![Tam Su Chat Interface](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/tam_su_page_1781164017441.png)
````

---

## 4. Video Kiểm thử Ghi hình Phiên chạy Mode-Split

Bạn có thể theo dõi video chạy tương tác tự động xác thực các trường hợp kiểm thử tại đây:

![Mode-Split Verification Video](C:/Users/LIGHTKING/.gemini/antigravity-ide/brain/f901b9eb-6dee-4232-a6f6-c1f6ef457cdb/aimed_mode_split_test_1781163620014.webp)

---

## 5. Trạng thái Tệp tin Cục bộ

Các tệp thay đổi cục bộ của bạn hoàn toàn không bị ảnh hưởng và vẫn được bảo tồn:
- [route.ts](file:///d:/desktop/tlcn/medical%20consulting system/medical-consultation-app/app/api/appointments/route.ts)
- [activeContext.md](file:///d:/desktop/tlcn/medical%20consulting system/medical-consultation-app/docs/activeContext.md)
