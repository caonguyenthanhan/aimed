# Kế Hoạch Nâng Cấp Giao Diện (UI Upgrade Plan & Checklist)

> Nguồn tham chiếu: bộ FE mới tại `_workspace/FE/stitch_ai_powered_medical_consulting_system` + design spec `clinical_clarity/DESIGN.md`.
> App đích: `medical-consultation-app` (Next.js App Router + Tailwind v4 + shadcn/ui).
> Nguyên tắc: KHÔNG bê nguyên HTML mockup. Tách thành component/section, giữ nguyên logic API/state/routing. Mỗi đợt diff với UI cũ để tránh mất logic.

---

## 1. Mục Tiêu
- Đồng bộ toàn bộ app theo một design system thống nhất ("Clinical Clarity": Clinical yet Empathetic, glassmorphic, app-like).
- Sửa các lỗi giao diện hiện tại: overflow, responsive vỡ, dark mode lệch, thiếu empty/loading/error states.
- Nâng cấp các màn còn mỏng/placeholder: `thong-ke`, `quan-ly/*`, doctor portal polish.
- Giữ nguyên 100% logic backend, API gateway, routing, state.

## 2. Phạm Vi
**Trong phạm vi (In-scope):**
- Design tokens (màu, radius, shadow, spacing, typography) trong `app/globals.css`.
- Shared shell: `site-header`, `mobile-bottom-nav`, `floating-quick-menu`, root `layout.tsx`.
- Patient pages: `landing`, `tu-van`, `tam-su`, `tri-lieu`, `sang-loc`, `nhac-nho`, `speech-chat`, `thong-ke`, `bac-si/*`.
- Doctor portal: `doctor`, `patients`, `appointments`, `forum`, `reports`, `profile`.
- Admin/system: `quan-ly/*`, `agent-hub`, `admin/server`, `account`.

**Ngoài phạm vi (Out-of-scope):**
- Thay đổi logic AI routing / fallback / safety layer.
- Đổi schema DB, đổi API contract.
- Thêm tính năng nghiệp vụ mới chưa có route.

## 3. Design Tokens Chuẩn (từ DESIGN.md)
| Token | Light | Dark |
|---|---|---|
| primary | `#1447E6` | `#3d7ee6` |
| primary (deep) | `#0032b6` | - |
| accent | `#0088FF` | `#0088FF` |
| teal-accent | `#14B8A6` | `#14B8A6` |
| background | `#F8FAFB` | `#0F1419` |
| card | `#FFFFFF` | `#1A1F2E` |
| secondary | `#F0F4FB` | `#1F2937` |
| muted-blue | `#E8F0FF` | - |
| destructive | `#E63946` | `#FF6B6B` |
| outline | `#747687` | - |

- **Gradient chủ đạo:** `#1447E6 → #14B8A6` (Blue → Teal), chỉ dùng cho typography nhấn mạnh hoặc feature card chính.
- **Radius:** base `0.5rem`, card `0.75rem`, panel `1rem`, hero `1.5rem`, button pill `9999px`.
- **Typography:** Inter (chính) + Geist Mono (số liệu/ID/label kỹ thuật).
- **Shadow card:** `0 4px 6px -1px rgb(0 0 0 / 0.1)`. Glass panel: backdrop blur `10px`, nền `rgba(255,255,255,0.8)` / `rgba(30,41,59,0.8)`.
- **Hover lift:** `translate-y-[-4px]` + shadow đậm hơn.
- **Header height:** `4.5rem` (72px). Mobile bottom nav: `64px`. Phải tính safe-zone khi đặt floating element/modal.

## 4. Nguyên Tắc Kỹ Thuật (Bám rules dự án)
- Zero hard-code màu hex trong className: định nghĩa qua CSS var trong `:root` + `.dark`.
- App-like layout: `body` khóa `overflow-hidden`; mọi vùng dài phải bọc `overflow-y-auto` hoặc `ScrollArea`.
- Mobile-first: build màn hẹp trước, dùng breakpoint `sm/md/lg`.
- Component tái dùng đặt vào `components/`, index vào `_workspace/01_module_registry.md`.
- File > 300 dòng phải tách submodule.
- Mỗi màn phải có đủ 3 trạng thái: loading, empty, error.

---

## 5. Lộ Trình Theo Giai Đoạn (Phases)

### Giai đoạn 0 — Chuẩn bị & An toàn
- Tạo branch riêng cho UI upgrade.
- Chụp lại screenshot UI hiện tại các màn chính làm mốc so sánh.
- Chạy `npm run build` + `npm run lint` baseline để biết trạng thái sạch trước khi sửa.

### Giai đoạn 1 — Design System & Shell (nền tảng)
- Cập nhật tokens trong `app/globals.css` theo bảng mục 3.
- Chuẩn hóa `site-header` (glass pill), `mobile-bottom-nav`, `floating-quick-menu`.
- Dựng các primitive tái dùng: `PageShell`, `SectionCard`, `StatCard`, `PortalShell` (cho doctor/admin).
- Tiêu chí done: đổi token là toàn app đổi theo, không vỡ layout, dark mode ok.

### Giai đoạn 2 — Patient Core
- `landing` (ưu tiên cao nhất, bộ mặt sản phẩm).
- `tu-van` (chat — polish visual, giữ ChatInterface logic).
- `tam-su` + `tri-lieu`.
- `sang-loc`.
- `nhac-nho`.
- `speech-chat` (đưa về shell chung, bỏ header nội bộ hardcode).

### Giai đoạn 3 — Doctor Portal (đồng bộ 1 shell)
- `doctor` dashboard.
- `doctor/patients` + `patients/[id]`.
- `doctor/appointments`.
- `doctor/forum` + `forum/[id]`.
- `doctor/reports` + `reports/new`.
- `doctor/profile`.

### Giai đoạn 4 — Patient phụ + Booking
- `thong-ke` (nâng cấp từ placeholder thành dashboard thật).
- `bac-si` (directory: filter/khoa/rating).
- `bac-si/[doctorId]` (profile chi tiết).
- `bac-si/[doctorId]/hen` (booking flow).

### Giai đoạn 5 — Admin/System (retrofit theo design language)
- `quan-ly` + `quan-ly/user` + `quan-ly/data` + `quan-ly/config`.
- `agent-hub`.
- `admin/server`.
- `account`.
- `tra-cuu`, `tin-tuc-y-khoa`.

### Giai đoạn 6 — QA & Hardening
- Rà responsive ở các breakpoint chính (360/768/1024/1440).
- Rà dark mode toàn bộ màn.
- Rà overflow / scroll lock / safe-zone header + bottom nav.
- Rà empty/loading/error states.
- `npm run build` + `npm run lint` + `npm run test` xanh.
- Cập nhật Memory Bank (`activeContext.md`, `systemPatterns.md`, `progress.md`).

---

## 6. CHECKLIST CHI TIẾT

### [ ] GĐ0 — Chuẩn bị
- [ ] Tạo branch `feat/ui-upgrade`
- [ ] Build baseline xanh (`npm run build`)
- [ ] Lint baseline (`npm run lint`)
- [ ] Lưu screenshot mốc các màn chính

### [ ] GĐ1 — Design System & Shell
- [ ] Cập nhật biến màu `:root` + `.dark` trong `app/globals.css`
- [ ] Thêm token teal-accent + gradient Blue→Teal
- [ ] Chuẩn hóa radius/shadow/spacing theo spec
- [ ] Refactor `site-header.tsx` (glass pill, nav theo role)
- [ ] Refactor `mobile-bottom-nav.tsx` (safe-zone 64px)
- [ ] Refactor `floating-quick-menu.tsx`
- [ ] Tạo primitive `SectionCard`, `StatCard`, `PortalShell`
- [ ] Verify: đổi token → toàn app đổi, dark mode ok

### [ ] GĐ2 — Patient Core
- [x] `landing-page.tsx` theo mockup trang chủ
- [x] `tu-van` polish (giữ ChatInterface logic)
- [x] `tam-su` + `tri-lieu`
- [x] `sang-loc`
- [x] `speech-chat` đưa về shell chung
- [ ] `nhac-nho`
- [ ] `speech-chat` đưa về shell chung
- [ ] Verify build/lint sau mỗi màn

### [ ] GĐ3 — Doctor Portal
- [x] `doctor` dashboard (StatCard + quick actions)
- [x] `doctor/patients` + `patients/[id]`
- [x] `doctor/appointments`
- [x] `doctor/forum` + `forum/[id]`
- [x] `doctor/reports` + `reports/new`
- [x] `doctor/profile`
- [x] Verify portal dùng chung 1 shell

### [ ] GĐ4 — Patient phụ + Booking
- [x] `thong-ke` nâng cấp dashboard (recharts)
- [x] `bac-si` directory + filter
- [x] `bac-si/[doctorId]` profile chi tiết
- [x] `bac-si/[doctorId]/hen` booking flow

### [ ] GĐ5 — Admin/System
- [x] `quan-ly` + `user` + `data` + `config`
- [x] `agent-hub`
- [x] `admin/server`
- [x] `account`
- [x] `tra-cuu`, `tin-tuc-y-khoa`

### [ ] GĐ6 — QA & Hardening
- [ ] Responsive 360 / 768 / 1024 / 1440
- [ ] Dark mode toàn bộ màn
- [x] Overflow / scroll lock / safe-zone (Đã sửa chat-interface scroll)
- [ ] Empty / loading / error states
- [x] `npm run build` xanh
- [ ] `npm run lint` xanh
- [x] `npm run test` xanh
- [ ] Cập nhật Memory Bank + `01_module_registry.md`

---

## 7. Rủi Ro & Cách Giảm Thiểu
| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Đổi token làm vỡ màn cũ chưa refactor | Trung bình | Token mới phải tương thích ngược; refactor cuốn chiếu từng màn |
| Mất logic khi thay shell (đặc biệt `speech-chat`, `ChatInterface`) | Cao | Chỉ thay phần trình bày, giữ nguyên handler/state; diff trước-sau |
| Vỡ scroll lock app-like | Trung bình | Luôn bọc vùng dài bằng `overflow-y-auto`/`ScrollArea` |
| Regression dark mode | Thấp | QA dark mode riêng ở GĐ6 |
| File phình > 300 dòng | Thấp | Tách section thành component con |

## 8. Tiêu Chí Hoàn Thành (Definition of Done)
- Toàn bộ màn dùng chung design tokens, không còn hex hard-code rải rác.
- Không lỗi overflow/responsive ở 4 breakpoint chuẩn.
- Dark mode đồng nhất.
- Logic API/routing/state không đổi (test xanh).
- Memory Bank + module registry được cập nhật.
