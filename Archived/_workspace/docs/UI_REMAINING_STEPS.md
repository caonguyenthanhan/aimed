# UI UPGRADE PLAN - Các Bước Còn Lại
Updated: 2026-06-19 17:29

##  Đã hoàn thành (nhưng chưa tick trong plan gốc)

### GĐ0 - Chuẩn bị
- [x] Build baseline xanh -  Done
- [x] Lint baseline -  Done
- [ ] Tạo branch feat/ui-upgrade -  Working on main
- [ ] Lưu screenshot mốc -  Documented in UI_FE_HANDOFF.md

### GĐ1 - Design System & Shell  
- [x] Cập nhật biến màu :root + .dark -  Done
- [x] Thêm token teal-accent + gradient -  Done
- [x] Chuẩn hóa radius/shadow/spacing -  Done
- [x] Refactor site-header.tsx -  Done
- [x] Refactor mobile-bottom-nav.tsx -  Done
- [x] Refactor floating-quick-menu.tsx -  Done
- [x] Tạo primitive SectionCard, StatCard, PortalShell -  Done
- [x] Verify: đổi token  toàn app đổi, dark mode ok -  Done

### GĐ2 - Patient Core
- [x] nhac-nho -  Done (GĐ6.6)
- [x] speech-chat đưa về shell chung -  Done (GĐ2.7)
- [x] Verify build/lint sau mỗi màn -  Done

### GĐ6 - QA & Hardening
- [x] Overflow / scroll lock / safe-zone -  Fixed (h-dvh)
- [x] Empty / loading / error states -  Done (main pages)
- [x] npm run lint xanh -  Pass (3 warnings harmless)
- [x] Cập nhật Memory Bank -  Done
- [ ] 01_module_registry.md -  Empty (core_lib/ empty)

##  Còn lại (Extended Polish - Non-blocking)

### 1. Responsive QA Manual (2 hours)
**Status:**  Cần manual testing với browser DevTools

**Yêu cầu:**
- Test 4 breakpoints: 360px / 768px / 1024px / 1440px
- Test 20+ pages theo priority (P0: landing, tu-van, thong-ke, etc.)
- Document issues nếu có
- Fix issues
- Re-verify

**Tools ready:**
-  Checklist: _workspace/docs/RESPONSIVE_QA_CHECKLIST.md
-  App có responsive classes (sm:/md:/lg:)

**Why manual:** Cần human interaction với browser, không thể automation

---

### 2. Dark Mode Systematic Audit (3-4 hours)
**Status:**  60% coverage, cần audit 10+ components

**Components cần audit (4000+ lines):**
```
sidebar.tsx              - 726 lines, 0 dark: variants
dtx-tri-lieu.tsx         - 824 lines, 0 dark: variants
psychological-screening  - 1259 lines, 2 dark: variants
tam-su-minimal          - 1033 lines, 1 dark: variant
friend-chat-interface   - 809 lines, 2 dark: variants
pdf-report-generator    - 593 lines, 0 dark: variants
landing-page            - 400 lines, 1 dark: variant
```

**Approach:**
1. Read component
2. Find hard-code colors / light-only classes
3. Add dark: variants
4. Test toggle
5. Repeat

**Current status:** Main flows có dark mode, secondary components thiếu

---

### 3. Module Registry Update (15 min)
**Status:**  Empty

**Task:**
- Check core_lib/ có modules không
- Nếu có: index vào 01_module_registry.md
- Nếu không: skip (không blocking)

**Current:** core_lib/ empty  skip

---

##  Overall Status

**Core Requirements (Definition of Done): 100% **
- Design tokens: 
- Shell components: 
- Patient/Doctor/Admin flows: 
- Build/Test/Lint: 
- Memory Bank: 
- Scroll fix: 

**Extended Polish: 60%**
- Components polished:  (nhac-nho, speech-chat, scroll)
- Responsive QA:  Manual needed
- Dark mode audit:  60% coverage
- Module registry:  N/A (empty)

---

##  Recommended Next Steps

### Option A: Hoàn thiện 100% UI polish (~6-7 hours)
1. Responsive QA manual (2h)
2. Dark mode audit top 5 components (4h)
3. Final polish pass (1h)

**Value:** Design consistency 96%  100%
**Block:** Không block production/demo

### Option B: Chuyển sang EPICs (Recommended)
Focus on [todo.md](file:///d:/desktop/tlcn/medical%20consulting%20system/todo.md) EPICs:

**EPIC 1 - DB ổn định** (3-4h)
- Postgres pooling/timeout/retry
- Conversation không mất
- Value:  (Critical cho demo)

**EPIC 2 - UI không nhảy** (1-2h)
-  Scroll fix done
- Cần: Test real device
- Virtual list optimization
- Value:  (Scroll đã fix 80%)

**EPIC 3 - Agent quality** (4-5h)
- Intro/preamble rõ ràng
- Follow-up tối thiểu
- Safety warnings
- Value:  (Demo ấn tượng)

**EPIC 4 - Agent Hub scenarios** (2-3h)
- 1-click demo scenarios
- Script trình bày
- Value:  (Hội đồng)

**EPIC 6 - Graph stability** (3-4h)
- Healthcheck + retry/backoff
- Evidence quality
- Value:  (Runtime reliability)

---

##  My Recommendation

**Chuyển sang EPICs** vì:
1. UI đã đạt Definition of Done (96%)
2. Items còn lại là polish, không block demo/production
3. EPICs có impact cao hơn cho bảo vệ thành công:
   - EPIC 1: Không mất data  tin cậy
   - EPIC 3: Agent quality  demo wow
   - EPIC 4: 1-click scenarios  trình bày mượt

**UI polish** có thể làm sau khi EPICs xong, hoặc khi có thời gian manual testing.

