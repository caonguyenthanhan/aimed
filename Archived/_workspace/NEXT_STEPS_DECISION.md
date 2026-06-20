# Next Steps Recommendation - 2026-06-19

##  Completed (Session này)
- UI Upgrade Plan: 98% (GĐ0-GĐ6 core + polish)
- EPIC 2 (UI không nhảy): Major progress
- Critical fixes: scroll, layout, dark mode

##  Recommended Next Priority

### Option A: Hoàn thiện 100% UI Upgrade Plan (~2-3 hours)
**Remaining items:**
1. Responsive QA manual (360/768/1024/1440) - 2h
2. Dark mode audit 10+ components còn lại - 1h
3. Module registry update - 15min

**Value:** Design consistency 98%  100%
**Block:** Không block production

---

### Option B: Chuyển sang EPICs quan trọng hơn  (Recommended)

#### **EPIC 1 - DB ổn định** (3-4 hours) - Priority 
**Why:** Critical cho demo - không mất data
**Tasks:**
- [ ] Postgres pooling/timeout/retry
- [ ] Auto-title conversation (LLM + fallback)
- [ ] Sidebar sync stable
- [ ] localStorage fallback khi thiếu DB

**Impact:** Conversation không mất, demo tin cậy

---

#### **EPIC 3 - Agent quality** (4-5 hours) - Priority 
**Why:** Demo ấn tượng hội đồng
**Tasks:**
- [ ] Agent intro/preamble rõ ràng
- [ ] Follow-up tối thiểu
- [ ] Safety warnings/red flags
- [ ] Status indicator (profile/mode/provider)
- [ ] Fallback clear khi tool/graph lỗi

**Impact:** Agent professional, demo wow

---

#### **EPIC 4 - Agent Hub scenarios** (2-3 hours) - Priority 
**Why:** Script trình bày mượt
**Tasks:**
- [ ] Agent Hub page (giới thiệu profiles)
- [ ] 5 demo scenarios: triage, thuốc, kế hoạch, trị liệu, gọi bác sĩ
- [ ] 1-click run scenarios
- [ ] Checklist demo hội đồng

**Impact:** Trình bày professional, dễ demo

---

#### **EPIC 6 - Graph stability** (3-4 hours) - Priority 
**Why:** Runtime reliability
**Tasks:**
- [ ] Healthcheck + UI indicator
- [ ] Retry/backoff gateway
- [ ] Evidence quality control
- [ ] Degrade gracefully

**Impact:** Không lỗi runtime khi demo

---

#### **EPIC 2 - UI không nhảy** (1-2 hours) - Priority 
**Why:** Polish experience
**Tasks:**
- [x] Scroll anchoring - DONE
- [ ] Virtual list optimization
- [ ] Test real mobile device

**Impact:** UX mượt mà

---

#### **EPIC 5 - Bác sĩ & Phân quyền** (3-4 hours) - Priority 
**Why:** Feature completeness
**Tasks:**
- [ ] Role SSOT enforcement
- [ ] Doctor directory
- [ ] Booking flow end-to-end
- [ ] Data access control

**Impact:** Feature set đầy đủ

---

#### **EPIC 0 - Deploy & Environment** (2-3 hours) - Priority 
**Why:** Production readiness
**Tasks:**
- [ ] Environment setup guide
- [ ] Runtime SSOT correct
- [ ] Log runtime events/metrics

**Impact:** Deploy smooth

---

##  My Strong Recommendation

**Chọn Option B - Focus EPICs theo thứ tự:**

1. **EPIC 4 (Agent scenarios)** - 2-3h 
   - Quickest win
   - Direct impact on presentation
   - 1-click demo scenarios

2. **EPIC 3 (Agent quality)** - 4-5h 
   - Biggest wow factor
   - Professional agent behavior

3. **EPIC 1 (DB stability)** - 3-4h 
   - Safety net
   - No data loss

4. **EPIC 6 (Graph)** - 3-4h 
   - Runtime reliability

5. **EPIC 2 polish** - 1-2h 
   - Final UX polish

**Total: ~15 hours to production-ready demo**

---

## Why Not Continue UI Polish?

UI đã 98% complete. Remaining 2%:
- Responsive QA manual - needs human browser testing
- Dark mode audit - 10+ components, ~4000 lines
- Low ROI compared to EPICs

**Better strategy:**
1. Knock out high-impact EPICs first
2. Polish UI when time permits or post-demo

---

## Decision Point

**Bạn muốn:**
- A) Hoàn thiện 100% UI (2-3 hours)
- B) Start EPIC 4 (Agent scenarios) - recommended
- C) Start EPIC 3 (Agent quality)
- D) Start EPIC 1 (DB stability)
- E) Khác?

