# QA Testing Guide - Agent & Content Loss Fixes

## Objective
Xác minh rằng:
1. Agent hoạt động ĐÚNG LÚC (sau khi tin nhắn giải thích được hiển thị)
2. KHÔNG CÓ content bị mất khi response được cắt thành chunks

## Prerequisites
- Hệ thống đang hoạt động bình thường
- Agent mode có thể bật/tắt
- Browser DevTools Console có sẵn

## Test Cases

### Test 1: Short Response (No Chunking)
**Scenario:** Hỏi câu hỏi nhưng response ngắn

**Steps:**
1. Mở chat interface
2. Gửi: "Tôi bị sốt 38°C, phải làm gì?"
3. Quan sát response

**Expected Results:**
- ✓ Response hiển thị ngay lập tức (không cắt)
- ✓ Không có console error
- ✓ Nếu agent mode bật, agent chạy sau ~1s

**Verify in Console:**
```javascript
// Watch for:
[LLM] Response content prepared: XX chars, mode: gpu/cpu, delivery: chunked/live
[v0] Response received: aiResponse=XX chars, planned=0 chunks, deliverList=1 items, totalContent=XX chars
```

---

### Test 2: Long Response (With Chunking)
**Scenario:** Hỏi câu hỏi phức tạp → response dài → được cắt thành 3+ chunks

**Steps:**
1. Mở chat interface
2. Gửi: "Hãy giải thích chi tiết các triệu chứng của cảm cúm"
3. Đếm số lượng "bubble" tin nhắn hiện ra
4. Đợi tất cả chunks hiển thị xong

**Expected Results:**
- ✓ Response hiển thị từng chunk một (450ms delay giữa chunks)
- ✓ Tất cả chunks đều có nội dung (không có chunk trống)
- ✓ Thứ tự chunks đúng (1, 2, 3,... không bị đảo)
- ✓ **KHÔNG CÓ** nội dung bị mất giữa chunks

**Verify in Console:**
```javascript
// Watch for:
[LLM] Response content prepared: XXXX chars, planned=3 chunks, delivery: chunked
[v0] Response received: aiResponse=XXXX chars, planned=3 chunks, deliverList=3 items, totalContent=XXXX chars

// Should NOT see:
[v0] Item X has empty content after trim
[LLM] Content integrity check failed
```

**Content Verification:**
- Ghi lại response text hoàn chỉnh
- Check: Có chuỗi toàn vẹn không bị cắt giữa chừng
- Ví dụ: Câu cuối cùng phải kết thúc với dấu chấm, không phải tên biến hay text cắt ngang

---

### Test 3: Agent Mode Timing
**Scenario:** Agent mode bật → Response dài → Verify agent chạy ĐÚNG LÚC

**Steps:**
1. Mở chat interface
2. Bật "Agent mode" (toggle ở góc)
3. Gửi: "Tôi bị đau đầu kéo dài, cần kiểm tra bệnh gì?"
4. Quan sát timing: chunks hiển thị vs agent actions

**Expected Results:**
- ✓ Chunks hiển thị lần lượt (với delay 450ms)
- ✓ Agent chạy **SAU** tất cả chunks đã display (sau ~3-4s nếu có 3 chunks)
- ✓ Không có agent actions xen vào giữa chunks
- ✓ Response text hiển thị đầy đủ trước agent actions

**Timing Calculation:**
```
Chunk 1: display at 0ms
Chunk 2: display at 450ms
Chunk 3: display at 900ms
Agent:   execute at 1400ms+ (totalDelay + 500ms buffer)
```

**Verify in Console:**
```javascript
// Agent execution delay calculation:
[v0] Response received: ..., deliverList=3 items, totalContent=XXXX chars
// Expect: totalDelay = 0 + 450 + 450 = 900ms
// Expect: executionDelay = max(900 + 500, 1500) = 1400ms

// Watch for agent execution timing
```

---

### Test 4: Empty/Edge Cases
**Scenario:** Extreme cases để verify fallback logic

**Steps 4a - Single word response:**
1. Gửi query → nếu được response 1 từ duy nhất
2. Verify nó hiển thị (không bị filter)

**Steps 4b - Response with special characters:**
1. Gửi: "Giải thích về @#$%^&*()" (nếu AI response có special chars)
2. Verify tất cả characters được preserve

**Steps 4c - Response với line breaks:**
1. Gửi query → response có `\n` hoặc `\n\n`
2. Verify formatting được giữ lại

**Expected Results:**
- ✓ Không có content bị mất dù mấy
- ✓ Special characters được preserve
- ✓ Formatting (line breaks, indentation) được giữ

---

## Console Monitoring

**Good Signs (Xanh lục):**
```
✓ [LLM] Response content prepared: 1234 chars, mode: gpu, delivery: chunked
✓ [v0] Response received: aiResponse=1234 chars, planned=3 chunks, deliverList=3 items, totalContent=1234 chars
✓ Chunks display at: 0ms, 450ms, 900ms
```

**Warning Signs (Vàng):**
```
⚠ [v0] Item 2 has empty content after trim, preserving with placeholder
  → Có chunk trống, được preserve (OK, không mất content)

⚠ [LLM] Content integrity check failed, reverting to single message
  → Server detect integrity issue, revert to 1 chunk (safe fallback)
```

**Error Signs (Đỏ) - PHẢI FIX:**
```
✗ [LLM] Error planning chunked messages
✗ [v0] Response received: ..., deliverList=0 items
  → Không có items để display (content lost!)

✗ TypeError: Cannot read property 'map' of undefined
  → Code error, phải debug
```

---

## Performance Expectations

| Test | Timing | Status |
|------|--------|--------|
| Short response | <500ms | Fast |
| Long response (3 chunks) | ~1.4s (display) + 1.4s (agent) = 2.8s | Normal |
| Agent execution delay | 1500ms-2000ms từ response nhận | Expected |

---

## Data to Collect

Nếu phát hiện issue, collect:

```
1. Browser: Chrome/Firefox/Safari version
2. Console logs (copy từ DevTools)
3. Response text (what user received vs expected)
4. Steps to reproduce
5. Screenshot của tin nhắn

Example report:
---
Issue: Some content missing in long response
Steps:
1. Sent: "Explain flu symptoms"
2. Got 3 chunks, but middle chunk was empty
3. Missing: "...triệu chứng..." 
Console logs:
[LLM] Response content prepared: 2000 chars, planned=3 chunks
[v0] Item 1 has empty content after trim
Expected: All chunks should have content
---
```

---

## Regression Tests

Chạy những test này để verify không có regression:

- [ ] Chat hoạt động (basic)
- [ ] Long responses display correctly
- [ ] Agent mode works
- [ ] Doctor mode works
- [ ] Live mode works (text streaming)
- [ ] No console errors
- [ ] Performance acceptable (<5s response time)

---

## Rollback Procedure (Nếu cần)

Nếu phát hiện critical issue:
1. Stop server
2. `git revert [commit-hash]`
3. Rebuild & restart
4. Test lại

---

## Sign-Off

- [ ] All test cases passed
- [ ] No console errors
- [ ] Content never lost
- [ ] Agent timing correct
- [ ] Performance acceptable
- [ ] Ready for production

**Tester:** ________________  
**Date:** ________________  
**Notes:** ________________
