# Quick Start - AI Phân Tích Động

## 🚀 Cách Hoạt Động

### 1️⃣ Người Dùng Điều Hướng Đến Trang Chức Năng
Người dùng vào một trong 4 trang:
- **Tâm sự** (`/tam-su`) - Chia sẻ cảm xúc
- **Tra cứu** (`/tra-cuu`) - Tìm kiếm thông tin
- **Sàng lọc** (`/sang-loc`) - Đánh giá tâm lý
- **Điều trị** (`/tri-lieu`) - Lập kế hoạch điều trị

### 2️⃣ Component Tự Động Kích Hoạt
- `PageAiInsight` component mount
- Component fetch API `/api/page-ai-insight`
- Gửi context + user input (nếu có)

### 3️⃣ Backend Xử Lý
1. Kiểm tra **SOS keywords** → Return hotlines nếu cần
2. Kiểm tra **content blocking** → Return safety message nếu cần
3. Gọi **Gemini LLM** → Generate structured insight
4. **Cache** kết quả (30 phút)

### 4️⃣ Frontend Hiển Thị (Nếu Cần)
- Animated card slide-in từ top
- Hiển thị main response (answer)
- Hiển thị suggested page (nếu LLM khuyên)
- User có thể:
  - ✅ Click button chuyển sang trang gợi ý
  - ❌ Click X button để dismiss (session-persisted)

## 💡 Ví Dụ Use Cases

### Tâm Sự → Tra Cứu
**User**: "Tôi cảm thấy lo âu, có cơn tim đập nhanh, đầu hoa mắt."
**AI**:
- **Answer**: "Những triệu chứng đó có thể liên quan đến lo âu hoặc các vấn đề về tim. Hãy tìm hiểu kỹ hơn và nếu cần, đi khám bác sĩ."
- **Suggest**: "Bạn nên chuyển sang trang **Tra cứu** để tìm thông tin chi tiết về các triệu chứng này và nguyên nhân có thể."

### Tra Cứu → Sàng Lọc
**User**: Tìm kiếm "Trầm cảm"
**AI**:
- **Answer**: "Trầm cảm là rối loạn tâm lý phổ biến đặc trưng bởi tâm trạng buồn bã kéo dài..."
- **Suggest**: "Bạn nên chuyển sang **Sàng lọc** để thực hiện PHQ-9 assessment và đánh giá mức độ trầm cảm của mình."

### Sàng Lọc → Điều Trị
**User**: Hoàn thành PHQ-9 screening (kết quả cao)
**AI**:
- **Answer**: "Kết quả sàng lọc của bạn cho thấy mức độ trầm cảm cần chú ý. Hành động tiếp theo là lập kế hoạch điều trị."
- **Suggest**: "Chuyển sang **Điều trị** để lập kế hoạch phục hồi cá nhân và theo dõi tâm trạng hàng ngày."

## 🔧 Configuration

### Thay Đổi Cache TTL
File: `/lib/page-insight-store.ts` (dòng ~19)
```typescript
private readonly TTL_MS = 30 * 60 * 1000 // Thay 30 phút thành giá trị khác
```

### Thay Đổi Prompt
File: `/app/api/page-ai-insight/route.ts` (dòng ~60+)
- Sửa `systemPrompt` để thay đổi cách LLM hoạt động

### Thêm Page Context Mới
1. Thêm vào `PAGE_NAMES`, `PAGE_ROUTES`, `PAGE_DESCRIPTIONS` (dòng 16-38)
2. Import `PageAiInsight` vào component tương ứng
3. Thêm `<PageAiInsight pageContext="your_context" />`

## 🐛 Debugging

### Insights không xuất hiện?
1. Mở DevTools > Console
2. Tìm message `[v0]`
3. Kiểm tra Network tab cho `/api/page-ai-insight`
4. Verify `GEMINI_API_KEY` env var được set

### LLM trả về lỗi?
- Check `/app/api/page-ai-insight/route.ts` line 119 fallback
- System tự động trả về safe defaults
- Xem server logs cho chi tiết

### Insight không dismiss được?
- Component cache nằm trong memory
- Refresh page để reset

## 📊 Monitoring

### Metrics để theo dõi:
- **API success rate**: `/api/page-ai-insight` success %
- **Cache hit rate**: Bao nhiêu % requests được cache
- **LLM cost**: Token usage từ Gemini API
- **User engagement**: Bao nhiêu users dùng navigation suggestions

### Logs để kiểm tra:
```
[v0] Failed to parse LLM JSON response
[v0] Error generating page insight
[v0] Page insight API error
```

## 🎯 Best Practices

✅ **DO:**
- Let LLM decide when to show insights (don't force)
- Cache aggressively to reduce API costs
- Test with various user inputs
- Monitor error rates closely

❌ **DON'T:**
- Show insights for every action (annoying)
- Suggest page switches that don't make sense
- Cache for too long (stale advice)
- Hard-code navigation suggestions

## 🚀 Deployment Checklist

- [ ] `GEMINI_API_KEY` env var is set
- [ ] `/api/page-ai-insight` endpoint is deployed
- [ ] `page-ai-insight.tsx` component is present
- [ ] `page-insight-store.ts` is present
- [ ] All 4 pages have `<PageAiInsight>` imported & used
- [ ] Test endpoint with curl: `curl -X POST http://localhost:3000/api/page-ai-insight -H "Content-Type: application/json" -d '{"page_context":"emotional_support"}'`
- [ ] Verify markdown rendering works
- [ ] Test on mobile & desktop
- [ ] Monitor API logs after deployment

## 📞 Support

For issues:
1. Check **IMPLEMENTATION_SUMMARY.md** for details
2. Check **PAGE_AI_INSIGHT_FEATURE.md** for full docs
3. Search server logs for `[v0]` messages
4. Review `/app/api/page-ai-insight/route.ts` error handling
