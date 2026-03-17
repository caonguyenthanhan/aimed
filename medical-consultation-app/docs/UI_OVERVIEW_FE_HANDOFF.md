# AIMed — Tài liệu Tổng quan Giao diện (Handoff FE)

Mục tiêu của tài liệu này là cung cấp một “bản phát thảo chuẩn” để FE có thể code/điều chỉnh UI nhất quán theo **mobile-first** và tối ưu trải nghiệm.

## 1) Quy ước & nguyên tắc

### 1.1 Mobile-first IA (Information Architecture)

**Trên mobile chỉ ưu tiên 3 luồng chính**
- **Tư vấn**: `/tu-van`
- **Tâm sự**: `/tam-su`
- **Stream (Voice)**: `/speech-chat`

**Các trang còn lại gom vào Menu**
- Trang chủ: `/`
- Tra cứu: `/tra-cuu`
- Sàng lọc: `/sang-loc`
- Tin tức: `/tin-tuc-y-khoa`
- Trị liệu: `/tri-lieu`
- Nhắc nhở: `/nhac-nho`
- Tài khoản: `/account`
- Quản lý: `/quan-ly` (admin/ops)

### 1.2 Layout rules (bắt buộc)

- **Header** luôn fixed, hiệu ứng glass.
- **Bottom nav** chỉ hiển thị trên mobile (≤639px), **luôn chừa khoảng trống** (`pb-20`) cho nội dung để không bị đè.
- **Không dùng body overflow:hidden** (đã chuyển sang overflow-y:auto ở globals) để trang chủ/trang dài cuộn được.
- **Suggestion chips**: 1 hàng ngang, có thể trượt, chữ nhỏ, không wrap thành nhiều dòng.
- **Lịch sử hội thoại trên mobile**: mở bằng drawer phủ full màn hình (cảm giác như “cửa sổ khác”), desktop dùng sidebar.

### 1.3 Branding
- Tên sản phẩm: **AIMed**
- Tagline trang chủ: **KLTN 2026**

## 2) Layout tổng thể

### 2.1 Root Layout
- File: [layout.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/layout.tsx)
- Thành phần:
  - `SiteHeader` (fixed top)
  - Background blobs (fixed, -z-10)
  - `children`
  - `MobileBottomNav` (mobile only)
  - `FloatingQuickMenu` (desktop only)
  - `Toaster`

### 2.2 Global CSS
- File: [globals.css](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/globals.css)
- Key rule:
  - `body { overflow-x: hidden; overflow-y: auto; }`
  - `.no-scroll` chỉ dùng khi cần khoá scroll trong modal/fullscreen.

## 3) Navigation

### 3.1 Header (SiteHeader)
- File: [site-header.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/site-header.tsx)
- Mục tiêu:
  - Mobile: header gọn, không che UI (API/Gemini toggle). Chỉ hiển thị logo/brand + controls.
  - Desktop: có nav items.
- States:
  - authed/unauthed: hiển thị nút Login hoặc Account.
  - ComputeToggle: chọn mode/provider.

### 3.2 Bottom Nav (MobileBottomNav)
- File: [mobile-bottom-nav.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/mobile-bottom-nav.tsx)
- Tab primary:
  - Tư vấn `/tu-van`
  - Tâm sự `/tam-su`
  - Stream `/speech-chat`
- Menu (Drawer bottom): các route còn lại.

## 4) Screens / Pages (bản phát thảo từng trang)

### 4.1 Trang chủ (Home) — `/` và `/trang-chu`
- Page: [page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/page.tsx)
- Component: [landing-page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/landing-page.tsx)

**Bố cục đề xuất (mobile)**
1) Hero:
   - Brand: AIMed / KLTN 2026
   - CTA: Tư vấn / Tâm sự / Stream
2) Khối “Tính năng” (cards)
3) Khối “Chức năng” (grid shortcuts):
   - Tư vấn, Tâm sự, Stream, Tin tức, Trị liệu, Nhắc nhở, Tài khoản, Quản lý

### 4.2 Tư vấn (Medical chat) — `/tu-van`
- Page: [tu-van/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/tu-van/page.tsx)
- UI: [chat-interface.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/chat-interface.tsx)

**Bố cục (mobile)**
- Top: nội dung hội thoại (scroll)
- Bottom: composer (input + actions) + suggestion chips (hàng ngang)
- Lịch sử: nút “Mở lịch sử” → drawer left full-screen

**Bố cục (desktop/tablet)**
- Left: sidebar lịch sử (search/new/refresh)
- Right: chat panel

### 4.3 Tâm sự (Companion chat) — `/tam-su`
- Page: [tam-su/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/tam-su/page.tsx)
- UI: [tam-su-minimal.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/tam-su-minimal.tsx)

**Bố cục (mobile)**
- Chat panel toàn màn hình (scroll)
- Nút mở lịch sử (icon) → drawer left full-screen
- Suggestion chips 1 hàng ngang, trượt

**Bố cục (desktop)**
- Sidebar lịch sử bên trái, chat panel bên phải

### 4.4 Stream (Voice) — `/speech-chat`
- Page/UI: [speech-chat/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/speech-chat/page.tsx)

**Bố cục (mobile)**
- Ẩn header nội bộ (tránh double header)
- Top: title + toggles dạng pill (auto play, optimized API)
- Middle: messages list
- Bottom: cụm nút ghi âm/camera/upload **được nâng lên trên bottom nav**

### 4.5 Trị liệu (dTx) — `/tri-lieu`
- Page: [tri-lieu/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/tri-lieu/page.tsx)
- UI: [dtx-tri-lieu.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/dtx-tri-lieu.tsx)

**Bố cục**
- Tabs: Mood tracker / Journaling
- List gần đây + add/delete
- Local-first + đồng bộ Neon qua `user-state` (xem mục Data)

### 4.6 Nhắc nhở hành vi (BA) — `/nhac-nho`
- Page: [nhac-nho/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/nhac-nho/page.tsx)
- UI: [dtx-reminders.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/dtx-reminders.tsx)

**Bố cục**
- Permission status + test notification
- Form settings (giờ, nội dung)

### 4.7 Tra cứu — `/tra-cuu`
- Page: [tra-cuu/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/tra-cuu/page.tsx)
- UI: [health-lookup.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/health-lookup.tsx)

**Bố cục đề xuất**
- Search input sticky (trên mobile)
- Results theo card list

### 4.8 Sàng lọc — `/sang-loc`
- Page: [sang-loc/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/sang-loc/page.tsx)
- UI: [psychological-screening.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/psychological-screening.tsx)

**Bố cục đề xuất**
- Stepper/sections rõ ràng
- CTA lớn, ít text rối

### 4.9 Tin tức y khoa — `/tin-tuc-y-khoa`
- Page: [tin-tuc-y-khoa/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/tin-tuc-y-khoa/page.tsx)

**Bố cục**
- Mobile: 1 cột (rightRatio chỉ áp dụng trên màn hình lớn)
- Desktop: split view trái (search/results) + phải (preview)

### 4.10 Quản lý — `/quan-ly`
- Entry: [quan-ly/page.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/quan-ly/page.tsx)
- Subpages:
  - Config: `/quan-ly/config`
  - Data: `/quan-ly/data`
  - User: `/quan-ly/user`

## 5) Component patterns (chuẩn UI)

### 5.1 Suggestion chips
- Tư vấn: [unified-composer.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/unified-composer.tsx)
- Tâm sự: [tam-su-minimal.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/tam-su-minimal.tsx)
- Quy ước:
  - `overflow-x-auto`, `whitespace-nowrap`, ẩn scrollbar
  - `text-[11px]`, `shrink-0`

### 5.2 Fullscreen history drawer (mobile)
- Tư vấn: [chat-interface.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/chat-interface.tsx)
- Tâm sự: [tam-su-minimal.tsx](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/components/tam-su-minimal.tsx)
- Quy ước:
  - `Drawer direction="left"`
  - `DrawerContent` full width + `h-[100dvh]`

## 6) Data & trạng thái (liên quan UI)

### 6.1 Chat logging (tư vấn/tâm sự)
- Lưu log chat tại Next API vào Neon:
  - [chat-persistence.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/chat-persistence.ts)

### 6.2 Local-first → Neon sync (device-based)
- API: [user-state/route.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/app/api/user-state/route.ts)
- Client helper: [user-state-client.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/user-state-client.ts)
- Device id: [device-id.ts](file:///d:/desktop/tlcn/medical%20consulting%20system/medical-consultation-app/lib/device-id.ts)
- Applied:
  - Tâm sự: title + messages
  - Trị liệu: mood/journal
  - Nhắc nhở: reminder settings

## 7) Checklist FE (Definition of Done UI)

- Mobile (360x740) không có phần tử bị che bởi header/bottom nav.
- Tư vấn/Tâm sự: lịch sử mở full-screen, đóng/mở mượt.
- Suggestion chips: 1 hàng ngang, trượt, không wrap.
- Trang chủ: cuộn được và có đủ shortcuts chức năng.
- Stream: nút ghi âm/camera/upload không đè bottom nav; thao tác một tay.

