# Responsive QA Checklist
Generated: 2026-06-19 16:50

## Test Matrix

### Breakpoints (Tailwind defaults)
- 360px (mobile small)
- 768px (tablet / sm:)
- 1024px (laptop / md:)
- 1440px (desktop / lg:)

### Pages to Test (Priority Order)

#### P0 - Critical User Flows
- [ ] `/` (landing page)
- [ ] `/tu-van` (chat interface)
- [ ] `/thong-ke` (patient dashboard)
- [ ] `/bac-si` (doctor directory)
- [ ] `/login` (auth)

#### P1 - Main Features
- [ ] `/tam-su` (MindCare)
- [ ] `/tri-lieu` (therapy)
- [ ] `/sang-loc` (screening)
- [ ] `/nhac-nho` (reminders)
- [ ] `/speech-chat` (voice)
- [ ] `/bac-si/[id]` (doctor profile)
- [ ] `/bac-si/[id]/hen` (booking)

#### P2 - Doctor Portal
- [ ] `/doctor` (dashboard)
- [ ] `/doctor/patients` (patient list)
- [ ] `/doctor/appointments` (inbox)
- [ ] `/doctor/profile` (editor)

#### P3 - Admin/Content
- [ ] `/quan-ly` (admin hub)
- [ ] `/account` (settings)
- [ ] `/tin-tuc-y-khoa` (news)
- [ ] `/agent-hub` (agent showcase)

### Test Criteria per Page

For each breakpoint, verify:
1. **Layout:** No overflow, elements visible, no horizontal scroll
2. **Navigation:** Header/bottom nav appropriate for viewport
3. **Text:** Readable size, no truncation
4. **Interactions:** Buttons/inputs accessible, proper touch targets (min 44px)
5. **Images:** Proper scaling, no distortion

### Issue Template

When issue found:
```
Page: /page-url
Breakpoint: 360px
Issue: [description]
Screenshot: [optional]
Fix needed: [css change]
```

## Execution Plan

1. Start dev server: npm run dev
2. Open Chrome DevTools
3. Toggle device toolbar (Ctrl+Shift+M)
4. Test each page at each breakpoint
5. Document issues
6. Prioritize fixes
7. Implement fixes
8. Re-verify

