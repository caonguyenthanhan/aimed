# AIMED - Báo Cáo So Sánh Tài Khoản Bác Sĩ và Bệnh Nhân

## Executive Summary
Hệ thống AIMED cung cấp hai loại tài khoản chính với quyền hạn và tính năng khác biệt để phục vụ nhu cầu của bác sĩ và bệnh nhân. Tài liệu này trình bày chi tiết sự khác biệt và các tính năng cụ thể của mỗi loại tài khoản.

---

## 1. Tài Khoản Bệnh Nhân (Patient Account)

### Thông Tin Cơ Bản
- **Vai trò**: Người sử dụng dịch vụ tư vấn sức khỏe
- **Mục đích chính**: Tìm kiếm thông tin y tế, tư vấn, sàng lọc tâm lý
- **Số lượng test**: 2 tài khoản

### Tài Khoản Test Bệnh Nhân

#### 1. Nguyễn Minh Anh
- **Username**: `patient.minh`
- **Email**: `minh.nguyen@gmail.com`
- **Password**: `Demo123!`
- **Tuổi**: 28 tuổi
- **Avata**: 👨‍💼

#### 2. Trần Linh Đan
- **Username**: `patient.linh`
- **Email**: `linh.tran@gmail.com`
- **Password**: `Demo123!`
- **Tuổi**: 25 tuổi
- **Avatar**: 👩‍💼

### Tính Năng Chính - Bệnh Nhân

#### 1. Trang Chủ (Home Page)
- Hiển thị các lựa chọn chính
- Truy cập nhanh đến các dịch vụ

#### 2. Tư Vấn (Tu-van)
- **Mô tả**: Giao tiếp với các bác sĩ/trợ lý y tế
- **Tính năng**:
  - Nhắn tin trực tiếp
  - Hỗ trợ ghi âm/phát âm
  - Lịch sử cuộc tư vấn
  - Tháo mã hóa (AI-powered responses)

#### 3. Tâm Sự (Tam-su)
- **Mô tả**: Cuộc trò chuyện cá nhân/đồng hành mạnh mẽ
- **Tính năng**:
  - Chatbot đồng hành chuyên biệt
  - Hỗ trợ cảm xúc
  - Lịch sử bảo mật

#### 4. Công Cụ - Tra Cứu (Tra-cuu)
- **Mô tả**: Tìm kiếm thông tin y tế
- **Tính năng**:
  - Tra cứu bệnh lý
  - Tra cứu thông tin thuốc
  - Lịch sử tìm kiếm
  - Danh mục phổ biến

#### 5. Công Cụ - Sàng Lọc (Sang-loc)
- **Mô tả**: Bài kiểm tra tâm lý
- **Tính năng**:
  - PHQ-9: Sàng lọc trầm cảm
  - GAD-7: Sàng lọc lo âu
  - PCL-5: Sàng lọc PTSD
  - Báo cáo kết quả ngay lập tức

#### 6. Công Cụ - Trị Liệu (Tri-lieu)
- **Mô tả**: Hướng dẫn liệu pháp
- **Tính năng**: (Cần nâng cấp)

#### 7. Công Cụ - Nhắc Nhở (Nhac-nho)
- **Mô tả**: Quản lý các sự kiện sức khỏe
- **Tính năng**: (Cần nâng cấp)

#### 8. Công Cụ - Tin Tức Y Khoa (Tin-tuc-y-khoa)
- **Mô tả**: Các bài viết y tế mới nhất
- **Tính năng**: (Cần nâng cấp)

#### 9. Tài Khoản (Account)
- **Quản lý hồ sơ**:
  - Chỉnh sửa thông tin cá nhân
  - Thay đổi mật khẩu
  - Quản lý quyền truy cập
  - Đặt lại mật khẩu

---

## 2. Tài Khoản Bác Sĩ (Doctor Account)

### Thông Tin Cơ Bản
- **Vai trò**: Chuyên gia y tế cung cấp tư vấn
- **Mục đích chính**: Quản lý bệnh nhân, xem báo cáo, phân tích dữ liệu
- **Số lượng test**: 2 tài khoản

### Tài Khoản Test Bác Sĩ

#### 1. Dr. Tuấn Anh
- **Username**: `doctor.tuan`
- **Email**: `dr.tuan@aimed.vn`
- **Password**: `Demo123!`
- **Chuyên môn**: Tâm lý học
- **Avatar**: 👨‍⚕️

#### 2. Dr. Linh Phương
- **Username**: `doctor.linh`
- **Email**: `dr.linh@aimed.vn`
- **Password**: `Demo123!`
- **Chuyên môn**: Sức khỏe tâm thần
- **Avatar**: 👩‍⚕️

### Tính Năng Chính - Bác Sĩ

#### 1. Bảng Điều Khiển (Doctor Dashboard)
- **URL**: `/doctor`
- **Tính năng chính**:
  - Thống kê tổng quát:
    - Số bệnh nhân: 24
    - Báo cáo hôm nay: 8
    - Cuộc tư vấn chưa xử lý: 5
    - Trường hợp khẩn cấp: 2
  - Hiển thị các cuộc tư vấn gần đây
  - Cảnh báo và thông báo
  - Biểu đồ xu hướng

#### 2. Quản Lý Bệnh Nhân (Patients Management)
- **URL**: `/doctor/patients`
- **Tính năng**:
  - Danh sách đầy đủ bệnh nhân
  - Tìm kiếm và lọc bệnh nhân
  - Xem chi tiết hồ sơ bệnh nhân
  - Lịch sử tư vấn với bệnh nhân
  - Ghi chú y tế cá nhân
  - Trạng thái sức khỏe hiện tại

#### 3. Báo Cáo (Reports)
- **URL**: `/doctor/reports`
- **Tính năng báo cáo**:
  - **Báo cáo hàng tháng** (Monthly):
    - Tổng số bệnh nhân: 24
    - Tư vấn hoàn thành: 18
    - Sàng lọc được thực hiện: 12
    - Tỷ lệ thỏa mãn: 92%
  - **Báo cáo hàng quý** (Quarterly):
    - Phân tích xu hướng 3 tháng
    - So sánh hiệu suất
    - Thống kê bệnh lý chính
  - **Báo cáo hàng năm** (Yearly):
    - Tổng kết năm
    - Phân tích dài hạn
    - Dự báo xu hướng

#### 4. Xuất Dữ Liệu (Export)
- **Định dạng**: PDF, Excel
- **Nội dung**: Các báo cáo đầy đủ
- **Tính năng**: Một cú nhấp để tải về

#### 5. Công Cụ - Tra Cứu, Sàng Lọc, v.v.
- Bác sĩ có thể sử dụng tất cả công cụ giống như bệnh nhân
- **Mục đích**: Tìm kiếm thông tin y tế tham khảo

---

## 3. So Sánh Chi Tiết

### Bảng So Sánh Tính Năng

| Tính Năng | Bệnh Nhân | Bác Sĩ | Ghi Chú |
|-----------|----------|--------|--------|
| **Trang Chủ** | ✅ | ✅ | Nội dung khác nhau |
| **Tư Vấn** | ✅ | ✅ | Bác sĩ: chế độ xem bệnh nhân |
| **Tâm Sự** | ✅ | ❌ | Chỉ cho bệnh nhân |
| **Tra Cứu** | ✅ | ✅ | Công cụ chung |
| **Sàng Lọc** | ✅ | ✅ | Công cụ chung |
| **Trị Liệu** | ✅ | ✅ | Công cụ chung |
| **Nhắc Nhở** | ✅ | ✅ | Công cụ chung |
| **Tin Tức** | ✅ | ✅ | Công cụ chung |
| **Dashboard** | ❌ | ✅ | Chỉ cho bác sĩ |
| **Quản Lý Bệnh Nhân** | ❌ | ✅ | Chỉ cho bác sĩ |
| **Báo Cáo** | ❌ | ✅ | Chỉ cho bác sĩ |
| **Tài Khoản** | ✅ | ✅ | Quản lý cá nhân |

### Sự Khác Biệt Chính

#### Quyền Truy Cập
- **Bệnh Nhân**: Tập trung vào tự chăm sóc và truy cập công cụ
- **Bác Sĩ**: Quản lý toàn bộ, phân tích dữ liệu, tạo báo cáo

#### Quy Trình Xác Thực
- Cả hai loại tài khoản được xác thực thông qua hệ thống login chung
- Role được lưu trong `localStorage` dưới khóa `userRole`
- Định tuyến tự động dựa trên role

#### Bảo Mật
- Mật khẩu: `Demo123!` (chỉ cho testing)
- Token lưu trữ: `authToken` + `userId`
- Chuyển hướng: Nếu role không khớp, chuyển về login

---

## 4. Điểm Khác Biệt trong UI/UX

### Thanh Điều Hướng (Header)
- **Bệnh Nhân**: 
  - Trang Chủ | Tư Vấn | Tâm Sự | Công Cụ (dropdown)
- **Bác Sĩ**: 
  - Bảng Điều Khiển | Bệnh Nhân | Báo Cáo | Công Cụ (dropdown)

### Công Cụ Dropdown
- **Mục chứa**: Tra Cứu, Sàng Lọc, Trị Liệu, Nhắc Nhở, Tin Tức
- **Hiển thị**: Riêng lẻ trên desktop, menu trên mobile

---

## 5. Tính Năng Cần Nâng Cấp

### Ưu Tiên 1 - Cao (High Priority)
1. **Nâng cấp Báo Cáo cho Bác Sĩ**:
   - Thêm biểu đồ dạng trực quan
   - Tùy chọn lọc chi tiết hơn
   - Dữ liệu phân tích sâu hơn

2. **Cải Thiện Quản Lý Bệnh Nhân**:
   - Tìm kiếm nâng cao
   - Lọc theo chuyên môn, trạng thái
   - Export danh sách bệnh nhân

3. **Tính Năng Trị Liệu (Tri-lieu)**:
   - Hướng dẫn liệu pháp chi tiết
   - Video hướng dẫn
   - Lịch sử trị liệu

### Ưu Tiên 2 - Trung (Medium Priority)
1. **Nâng cấp Nhắc Nhở (Nhac-nho)**:
   - Thêm lịch sử nhắc nhở
   - Tùy chỉnh thời gian nhắc
   - Hỗ trợ thông báo push

2. **Nâng cấp Tin Tức (Tin-tuc-y-khoa)**:
   - Tìm kiếm bài viết
   - Danh mục chuyên đề
   - Lưu tin ưa thích

3. **Giao Diện Tâm Sự**:
   - Ghi lại cảm xúc hàng ngày
   - Biểu đồ tâm trạng
   - Gợi ý dựa trên mô hình

### Ưu Tiên 3 - Thấp (Low Priority)
1. Tích hợp thêm API
2. Hỗ trợ ngôn ngữ khác
3. Chủ đề tối (Dark Mode) - Đã có sơ bộ

---

## 6. Kiến Trúc Hệ Thống

### Cấu Trúc Thư Mục
```
/app
  /doctor          # Trang bác sĩ
    /page.tsx      # Dashboard
    /patients/     # Quản lý bệnh nhân
    /reports/      # Báo cáo
  /tu-van          # Tư vấn
  /tam-su          # Tâm sự
  /tra-cuu         # Tra cứu
  /sang-loc        # Sàng lọc
  /tri-lieu        # Trị liệu
  /nhac-nho        # Nhắc nhở
  /tin-tuc-y-khoa  # Tin tức
  /account         # Tài khoản
  /login           # Đăng nhập
  /speech-chat     # Tư vấn giọng nói

/components
  /site-header.tsx # Thanh điều hướng chính
  /health-lookup.tsx # Tra cứu
  /psychological-screening.tsx # Sàng lọc
  
/lib
  /test-accounts.ts # Dữ liệu tài khoản test
```

### Flow Đăng Nhập
```
1. Người dùng truy cập /login
2. Nhập username/password
3. Hệ thống kiểm tra test accounts trước
4. Lưu: authToken, userId, username, userFullName, userRole
5. Chuyển hướng dựa trên role:
   - doctor → /doctor
   - patient → /
```

### Flow Điều Hướng
```
1. Header kiểm tra userRole từ localStorage
2. Hiển thị menu phù hợp
3. Công cụ dropdown luôn hiển thị
4. Bác sĩ không thể truy cập /tam-su
5. Bệnh nhân không thể truy cập /doctor/*
```

---

## 7. Hướng Dẫn Sử Dụng Test

### Đăng Nhập Bệnh Nhân
```
Chọn "Nguyễn Minh Anh" (28 tuổi) hoặc "Trần Linh Đan" (25 tuổi)
Chuyển hướng: Trang chủ (/)
Quyền truy cập: Tư vấn, Tâm sự, Công cụ, Tài khoản
```

### Đăng Nhập Bác Sĩ
```
Chọn "Dr. Tuấn Anh" (Tâm lý học) hoặc "Dr. Linh Phương" (Sức khỏe tâm thần)
Chuyển hướng: Dashboard bác sĩ (/doctor)
Quyền truy cập: Dashboard, Bệnh nhân, Báo cáo, Công cụ, Tài khoản
```

---

## 8. Tóm Tắt

Hệ thống AIMED hiện có hai loại tài khoản với chức năng phân biệt rõ ràng:

- **Bệnh Nhân**: Tập trung vào tự chăm sóc, tư vấn, và công cụ sàng lọc
- **Bác Sĩ**: Tập trung vào quản lý bệnh nhân, phân tích báo cáo, và tác vụ quản trị

Cả hai loại tài khoản chia sẻ công cụ chung (tra cứu, sàng lọc, v.v.) nhưng có giao diện chính khác nhau.

Các tính năng phần lớn đã được triển khai cơ bản, nhưng cần nâng cấp để tăng cường trải nghiệm người dùng và tính năng phân tích.

---

**Ngày cập nhật**: 18/03/2026
**Phiên bản**: 1.0
**Trạng thái**: Sẵn sàng để nâng cấp
