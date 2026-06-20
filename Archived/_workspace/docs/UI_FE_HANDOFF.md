# Tài liệu Hướng dẫn Giao diện (UI/UX Style Guide & Handoff)

Tài liệu này tổng hợp toàn bộ các thiết kế, phong cách, màu sắc, và cấu trúc giao diện của Hệ thống Tư vấn Y tế AI. Kỹ sư Frontend (FE) vui lòng sử dụng tài liệu này làm kim chỉ nam để duy trì tính đồng nhất, sửa lỗi UI, và phát triển các component mới mà không làm vỡ giao diện.

## 1. Tổng quan Công nghệ (Tech Stack)
- **Framework:** React / Next.js (App Router).
- **Styling:** Tailwind CSS v4 (`tailwindcss@^4.1.9`).
- **UI Library:** shadcn/ui (Base color: `neutral`, Style: `new-york`).
- **Icons:** `lucide-react`.

## 2. Typography (Phông chữ)
Hệ thống sử dụng hai phông chữ chính được nạp qua `next/font/google`:
- **Font Sans (Mặc định):** `Inter` (CSS Variable: `--font-sans`)
- **Font Mono (Code/Mã):** `GeistMono` (CSS Variable: `--font-mono`)

**Quy tắc:**
- Text mặc định tuân theo class `font-sans`.
- Cấu trúc văn bản: Ưu tiên các câu ngắn, tránh những đoạn text dài lê thê (wall of text).
- Responsive Text: Tiêu đề thường sử dụng các mốc `text-3xl`, `text-5xl lg:text-6xl`, v.v.

## 3. Bảng Màu (Color Palette) & CSS Variables
Hệ thống hỗ trợ cả Light Mode và Dark Mode (dựa vào class `.dark` ở thẻ cha), được định nghĩa trong `app/globals.css`.

### 3.1. Light Mode (Mặc định)
- **Background:** `#f8fafb` (Xanh xám cực nhạt)
- **Foreground:** `#1a1a1a` (Xám đậm/Đen)
- **Card/Popover:** `#ffffff` (Trắng)
- **Primary:** `#1447E6` (Xanh dương đậm - Strong Blue)
- **Secondary:** `#f0f4fb` (Xanh dương nhạt)
- **Accent:** `#0088FF` (Xanh dương rực rỡ)
- **Muted:** `#e8f0ff` (Xanh nhạt)
- **Destructive:** `#e63946` (Đỏ)

### 3.2. Dark Mode
- **Background:** `#0f1419` (Đen ánh xanh)
- **Foreground:** `#f5f5f5` (Trắng xám)
- **Card/Popover:** `#1a1f2e` (Xanh đen)
- **Primary:** `#3d7ee6` (Xanh dương sáng)
- **Secondary:** `#1f2937` (Xám đen)
- **Accent:** `#0088FF` (Xanh dương)
- **Destructive:** `#ff6b6b` (Đỏ nhạt)

### 3.3. Màu sắc riêng cho Chat (Chat Specific Colors)
- **User Bubble:** Nền Primary (`#1447E6` / `#0088FF`), chữ Trắng (`#ffffff` / `#f5f5f5`).
- **Bot Bubble:** Nền Secondary (`#f0f4fb` / `#1f2937`), chữ Đen/Trắng xám.

## 4. Bố cục & Layout (Layout Structure)
Cấu trúc layout gốc (`app/layout.tsx`) được thiết kế đặc biệt với các đặc điểm:
- **Fixed Height & No Scroll:** `h-screen flex flex-col overflow-hidden`. Container cha không cuộn (no scroll) để tạo cảm giác giống 1 native app. Cuộn chỉ diễn ra bên trong các thành phần con cụ thể (như `ScrollArea` hoặc `flex-1 overflow-auto`).
- **Padding Top:** Layout chừa không gian cho header cố định (`pt-16 sm:pt-18 md:pt-20`).
- **Background Animations (Blob):** Nền tảng sử dụng các khối tròn gradient làm mờ (`blur-[120px]`) di chuyển tự động (`animate-blob`) để tạo hiệu ứng không gian 3D hiện đại.
- **Global Components:** Tích hợp sẵn `SiteHeader`, `MobileBottomNav` (cho mobile), `FloatingQuickMenu` và `Toaster` (thông báo) ở cấp độ Root.

## 5. UI/UX Patterns & Animations
Dự án áp dụng nhiều class tùy chỉnh và quy tắc thiết kế chung:

### 5.1. Glassmorphism (Hiệu ứng kính)
Sử dụng cho các Panel hoặc Header nổi:
- Class `.glass-panel`: Nền trắng 80% (`rgba(255,255,255,0.8)`), backdrop blur `10px`, viền trắng mờ.
- Class `.glass-panel-dark`: Nền xanh đen 80% (`rgba(30,41,59,0.8)`).

### 5.2. Card & Nút bấm (Cards & Buttons)
- **Feature Card Hover:** Sử dụng group hover để phóng to icon (`group-hover:scale-110`), đổi màu text, hiển thị dải màu gradient mượt mà (`bg-gradient-to-br from-blue-50/0 to-teal-50/0`), bóng đổ đổi màu.
- **Gradient Text:** Tiêu đề thường sử dụng text gradient để nhấn mạnh: `bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent`.
- **Button Shadow:** Các nút CTA chính có hiệu ứng nâng nhẹ (`hover:-translate-y-1`) và tăng bóng đổ.

### 5.3. Chat Bubbles
Được bo góc bất đối xứng để phân biệt rõ chiều hội thoại:
- **User (`.chat-bubble-user`):** Bo tròn 3 góc, góc dưới phải nhọn (`border-radius: 1.25rem 1.25rem 0.25rem 1.25rem`).
- **Bot (`.chat-bubble-bot`):** Bo tròn 3 góc, góc dưới trái nhọn (`border-radius: 1.25rem 1.25rem 1.25rem 0.25rem`).

### 5.4. Custom Scrollbar
Để ẩn scrollbar mặc định xấu xí của trình duyệt:
- `html` và body ẩn thanh cuộn hoàn toàn (`scrollbar-width: none`).
- Sử dụng class `.custom-scrollbar` ở các vùng cần cuộn (ví dụ: khu vực chat) với độ rộng `6px`, màu thanh cuộn là màu `var(--border)` và hover là `var(--muted-foreground)`.

### 5.5. Animations (Hiệu ứng chuyển động)
Được định nghĩa trong `globals.css`:
- **`animate-message-in`**: Tin nhắn trượt từ dưới lên và mờ dần rõ lên (Fade in up).
- **`animate-blob`**: Khối nền chuyển động vòng tròn (12s infinite loop).
- **`animate-listening-wave` / `pulse` / `ring`**: Các hiệu ứng sóng âm/nhịp đập dùng cho tính năng thu âm/STT (Speech-to-Text).

## 6. Lời khuyên cho Kỹ sư FE (FE Best Practices)
1. **Tuyệt đối không sửa `.dark` bừa bãi:** Hệ thống hỗ trợ Dark Mode hoàn chỉnh. Khi thêm màu mới, hãy định nghĩa qua biến `--color-xyz` trong `:root` và `.dark` thay vì hardcode `#hex` vào class Tailwind.
2. **Không làm vỡ Layout App-like:** Vì `body` bị khóa `overflow-hidden`, mọi nội dung dài cần được bọc trong một `div` có `overflow-y-auto` (hoặc `ScrollArea` của Shadcn).
3. **Sử dụng Shadcn UI:** Tận dụng tối đa các file trong `components/ui/` trước khi tự viết component mới.
4. **Mobile First:** Mọi UI phải hiển thị tốt trên màn hình hẹp trước. Dùng các breakpoint `sm:`, `md:`, `lg:` của Tailwind để tinh chỉnh.
5. **Chế độ Ngoại tuyến (Offline/Fallback):** Nếu cần sửa API hoặc logic lấy data UI, hãy nhớ UI luôn phải đồng bộ với `runtime-mode.json`. Luôn kiểm tra giao diện ở trạng thái lỗi hoặc mất kết nối mạng.
