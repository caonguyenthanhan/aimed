# Scroll & Fit Screen Analysis
Generated: 2026-06-19 17:00

## Current Issues (From User Feedback)

"Chức năng cuộn và fit screen chưa được ổn định"

## Analysis

### Root Layout (app/layout.tsx)
```tsx
<body className="... h-screen flex flex-col overflow-hidden">
```

**Status:**  Correct app-like pattern
- Body locks overflow (prevents double scrollbar)
- Each page needs own scroll container

### Potential Issues

1. **Missing scroll containers in child pages**
   - Pages must have `overflow-y-auto` or `overflow-y-scroll`
   - Without it, content gets clipped

2. **Scroll anchoring**
   - Chat interfaces need `scrollTo()` on new messages
   - Auto-scroll should respect user position

3. **Mobile bottom nav interference**
   - Bottom nav (64px) can cover content
   - Need padding-bottom compensation

4. **Viewport height issues**
   - h-screen on mobile includes address bar
   - Better: h-dvh (dynamic viewport height)

## Recommended Fixes

### Fix 1: Root Layout - Use dvh instead of h-screen

**File:** app/layout.tsx
**Change:**
```tsx
// Before
<body className="... h-screen flex flex-col overflow-hidden">

// After  
<body className="... h-dvh flex flex-col overflow-hidden">
```

**Why:** dvh adapts to mobile address bar show/hide

### Fix 2: Ensure All Pages Have Scroll Container

**Pattern for all page.tsx:**
```tsx
export default function Page() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* page content */}
    </div>
  )
}
```

**Critical pages to check:**
- /tu-van (chat)
- /thong-ke (dashboard)
- /tam-su (MindCare)
- /tri-lieu (therapy)
- /sang-loc (screening)

### Fix 3: Chat Scroll-to-Bottom Behavior

**File:** components/chat-interface.tsx
**Check for:**
```tsx
const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ 
    behavior: 'smooth',
    block: 'end' 
  })
}
```

**Should only trigger when:**
- User sends message (always scroll)
- AI responds + user is near bottom (conditional scroll)

### Fix 4: Mobile Safe Area

**Add to affected components:**
```tsx
className="... pb-safe-bottom" // or pb-20 for 80px bottom nav
```

## Implementation Plan

1. [ ] Update root layout: h-screen  h-dvh
2. [ ] Audit all pages for scroll container
3. [ ] Fix chat scroll anchoring
4. [ ] Add mobile safe padding
5. [ ] Test on actual devices
6. [ ] Document in systemPatterns.md

## Testing Checklist

- [ ] Desktop: Scroll smooth, no overflow
- [ ] Mobile: No content behind bottom nav
- [ ] Mobile: Address bar hide/show doesn't break layout
- [ ] Chat: Auto-scroll works
- [ ] Chat: Manual scroll preserves position
- [ ] Long pages: Scroll indicator visible

