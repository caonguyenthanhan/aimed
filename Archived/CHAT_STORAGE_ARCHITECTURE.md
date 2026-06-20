## Cơ Chế Lưu Trữ Dữ Liệu Chat (Lịch Sử Chat)

### 1. **Lưu Trữ (Storage)**

#### 1.1 Vị Trí Lưu Trữ
- **localStorage**: Lưu toàn bộ dữ liệu chat
  - Key: `conv_messages_{conversationId}` - chứa mảng messages dưới dạng JSON
  - Key: `conv_title_{conversationId}` - chứa tiêu đề cuộc hội thoại (6 từ đầu tiên của user message)

#### 1.2 Cấu Trúc Dữ Liệu Lưu Trữ

```javascript
// Dữ liệu lưu trong localStorage
localStorage['conv_messages_conv-abc123def456'] = [
  {
    id: "1",
    content: "Xin chào! Tôi là trợ lý AI y tế...",
    isUser: false,
    timestamp: "2026-04-05T10:30:00.000Z"
  },
  {
    id: "1712284800000",
    content: "Tôi bị đau đầu",
    isUser: true,
    timestamp: "2026-04-05T10:31:30.000Z"
  }
]

localStorage['conv_title_conv-abc123def456'] = "Tôi bị đau đầu"
```

#### 1.3 Khi Nào Lưu Trữ?

**Flow 1: Khi User Gửi Message**
1. User gửi message → `handleSendMessage()` gọi API `/api/llm-chat`
2. Nhận response từ AI → setState messages
3. `useEffect` (line 1634-1653) **tự động kích hoạt** khi `messages` thay đổi
4. Serialize messages: `messages.map(m => ({ id, content, isUser, timestamp: ISO }))` 
5. Lưu vào: `localStorage.setItem('conv_messages_${conversationId}', JSON.stringify(serial))`
6. Tạo title nếu chưa có: lấy 6 từ đầu tiên từ last user message
7. Gọi `loadLocalConversations()` để refresh sidebar

**Flow 2: Khi Page Unload (beforeunload event)**
- Sử dụng `sessionStorage` làm backup tạm thời (line 1655-1672)
- Nếu user close tab/browser, dữ liệu vẫn có thể recover từ localStorage

---

### 2. **Lấy Dữ Liệu (Retrieval)**

#### 2.1 Khi Component Mount
```
Component mounts 
  ↓
useEffect (line 1272-1300): fetchConversations()
  ↓
  ├─ Nếu KHÔNG đăng nhập (no authToken):
  │   └─ Gọi loadLocalConversations() 
  │       └─ Quét localStorage tìm tất cả keys bắt đầu với "conv_messages_"
  │           └─ Parse JSON + lấy title từ "conv_title_"
  │               └─ Sắp xếp theo last_active (DESC)
  │                   └─ setState conversations (sidebar list)
  │
  └─ Nếu ĐÃ đăng nhập (authToken):
      └─ Gọi API /api/backend/v1/conversations
          └─ Lấy danh sách từ server
              └─ setState conversations (sidebar list)
```

#### 2.2 Khi User Click Vào Conversation Cũ

```
User click conversation in sidebar
  ↓
openConversation(id) được gọi (line 1372)
  ↓
setConversationId(id)
  ↓
  ├─ Nếu id bắt đầu với "conv-" (localStorage conversation):
  │   └─ Lấy từ localStorage: 
  │       raw = localStorage.getItem('conv_messages_${id}')
  │       ↓
  │       Parse JSON: arr = JSON.parse(raw)
  │       ↓
  │       Map lại dữ liệu, convert timestamp string → Date object
  │       ↓
  │       setState messages (display old chat)
  │
  └─ Nếu id từ server:
      └─ Gọi API /api/backend/v1/conversations/${id}
          └─ Lấy messages từ server
              └─ setState messages
```

---

### 3. **Flow Toàn Bộ: Khi User Tạo Chat Mới**

```
1. Page load → useEffect mount: fetchConversations()
   ├─ Nếu không có convId: auto-create conversation
   │   └─ Generate ID: convId = 'conv-${random}${timestamp}'
   │   └─ Lưu default message vào localStorage
   │   └─ setState conversationId

2. User gửi message
   └─ API call → response → setState messages
       └─ useEffect detect messages change
           └─ localStorage.setItem('conv_messages_${convId}', JSON.stringify(messages))
           └─ loadLocalConversations()
               └─ setState conversations (update sidebar)

3. User open old conversation
   └─ openConversation(oldConvId)
       └─ localStorage.getItem('conv_messages_${oldConvId}')
       └─ Parse + map → setState messages
       └─ UI display old chat
```

---

### 4. **Vấn đề Hiện Tại & Cải Tiến**

**Hiện Tại (Limitations):**
- ✅ Lưu được hội thoại cũ
- ✅ Có thể lấy lại lịch sử chat
- ❌ Chỉ lưu trữ local (mất dữ liệu nếu clear cache)
- ❌ Dùng localStorage (giới hạn ~5-10MB)
- ❌ Không có persistence trên server

**Đề Nghị Cải Tiến:**
1. **Thêm Database Backend** (Supabase/Neon):
   - Tạo table `conversations` (id, user_id, title, created_at, updated_at)
   - Tạo table `messages` (id, conversation_id, content, is_user, timestamp)
   - User đăng nhập → lưu vào DB thay vì localStorage

2. **Hybrid Storage** (Best Practice):
   - localStorage: cache để load nhanh
   - Server DB: source of truth, backup lâu dài

3. **Auto-sync**: 
   - Khi user gửi message → save to DB in background
   - Recover from DB nếu localStorage lost
