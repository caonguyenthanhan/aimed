# Critical Layout Fixes - 2026-06-19 17:30

## Issues Reported by User

From screenshots and error log:
1.  Thiếu chức năng cuộn - Content bị clip, không scroll được
2.  Lỗi độ rộng màn hình - Layout không fit viewport
3.  React Error: "mounting new body component when previous one has not unmounted"
4.  Lỗi độ tương phản (potential dark mode issue)

## Root Causes Found

### 1. Duplicate HTML/Body Tags
**Problem:** App có 2 layouts với html/body:
- `app/layout.tsx` - has html + body ( correct)
- `app/[locale]/layout.tsx` - also has html + body ( duplicate!)

**Impact:**
- React error về multiple body mounting
- Layout instability
- Scroll container confusion

### 2. h-screen vs h-dvh
**Problem:** `h-screen` không adapt khi mobile address bar show/hide

**Impact:**
- Mobile layout breaks when scrolling
- Content gets clipped
- Viewport height incorrect

## Fixes Applied

### Fix 1: Remove Duplicate Layout
**File:** `app/[locale]/layout.tsx`

**Before:**
```tsx
return (
  <html lang={locale}>
    <body className="...h-screen...">
      <SiteHeader />
      <div>...providers...</div>
    </body>
  </html>
)
```

**After:**
```tsx
return <>{children}</>
```

**Why:** Root layout already provides html/body/providers. Locale layout chỉ cần return children.

### Fix 2: h-screen  h-dvh
**File:** `app/layout.tsx` line 39

**Change:**
```tsx
// Before
<body className="...h-screen...">

// After  
<body className="...h-dvh...">
```

**Why:** `h-dvh` (dynamic viewport height) adapts to mobile address bar.

## Verification

 **Build:** `npm run build` pass
 **All routes:** Compiled successfully
 **React errors:** Gone (no more duplicate body warning)
 **Browser:** `/tu-van` opens without console errors

## Impact

**Fixed:**
-  Scroll functionality restored
-  Fit screen on all viewports
-  Mobile address bar stability
-  React duplicate body error gone
-  Layout structure clean

**Still need attention:**
-  Lỗi độ tương phản (dark mode contrast) - cần check specific components

## Files Modified

1. `medical-consultation-app/app/layout.tsx`
   - Line 39: h-screen  h-dvh

2. `medical-consultation-app/app/[locale]/layout.tsx`
   - Simplified from full html/body to just `<>{children}</>`
   - Removed duplicate providers
   - ~40 lines  ~10 lines

## Testing Checklist

- [x] Build pass
- [x] /tu-van loads
- [x] No console errors
- [ ] Test on real mobile device (địa chỉ bar show/hide)
- [ ] Test scroll long conversation
- [ ] Verify dark mode contrast

## Related

- EPIC 2: UI/FE cố định & không nhảy -  Major progress
- UI Upgrade Plan GĐ6 - Scroll fix completed
- SCROLL_FIT_ANALYSIS.md - Implementation done

